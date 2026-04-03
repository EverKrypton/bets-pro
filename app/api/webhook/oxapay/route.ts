import crypto from 'crypto';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import Notification from '@/models/Notification';
import Settings from '@/models/Settings';
import Bonus from '@/models/Bonus';

const MERCHANT_KEY = process.env.OXAPAY_MERCHANT_API_KEY;
const PAYOUT_KEY = process.env.OXAPAY_PAYOUT_API_KEY;

const PAYMENT_TYPES = new Set([
  'invoice',
  'white_label',
  'static_address',
  'payment_link',
  'donation',
  'payment',
]);

const PAID_STATUSES = new Set([
  'Paid',
  'paid',
  'Completed',
  'completed',
  'Confirmed',
  'confirmed',
]);

function ok() {
  return new Response('ok', { status: 200 });
}

function bad() {
  return new Response('error', { status: 400 });
}

function serverError(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: Request): Promise<Response> {
  console.log('[OxaPay] Webhook received at', new Date().toISOString());

  try {
    const rawBody = await req.text();
    const hmacHeader = req.headers.get('hmac');

    console.log('[OxaPay] HMAC header:', hmacHeader);
    console.log('[OxaPay] MERCHANT_KEY set:', !!MERCHANT_KEY);
    console.log('[OxaPay] PAYOUT_KEY set:', !!PAYOUT_KEY);

    if (!hmacHeader) {
      console.error('[OxaPay] Missing HMAC header');
      return bad();
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error('[OxaPay] Invalid JSON:', e);
      return bad();
    }

    const type = body.type as string | undefined;
    const status = body.status as string | undefined;
    console.log('[OxaPay] Parsed:', {
      type,
      status,
      track_id: body.track_id,
      order_id: body.order_id,
      amount: body.amount,
    });

    const secret =
      type && PAYMENT_TYPES.has(type)
        ? MERCHANT_KEY
        : type === 'payout'
          ? PAYOUT_KEY
          : undefined;

    if (!secret) {
      console.error('[OxaPay] Unknown type or missing API key for type:', type);
      return bad();
    }

    const calculated = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    console.log('[OxaPay] HMAC match:', calculated.toLowerCase() === hmacHeader.trim().toLowerCase());

    if (calculated.toLowerCase() !== hmacHeader.trim().toLowerCase()) {
      console.error('[OxaPay] HMAC mismatch');
      console.error('[OxaPay] Expected:', calculated);
      console.error('[OxaPay] Received:', hmacHeader);
      return bad();
    }

    const track_id = body.track_id as string | undefined;
    const order_id = body.order_id as string | undefined;
    const address = body.address as string | undefined;
    const amount =
      typeof body.amount === 'number'
        ? body.amount
        : parseFloat(String(body.amount ?? 0));

    console.log('[OxaPay] Processing:', {
      type,
      status,
      track_id,
      order_id,
      address,
      amount,
    });

    await dbConnect();

    const settings = await Settings.findOne({ key: 'global' });
    const minDeposit = settings?.minDepositAmount ?? 10;

    if (type && PAYMENT_TYPES.has(type) && PAID_STATUSES.has(status || '')) {
      if (!track_id) {
        console.error('[OxaPay] Missing track_id');
        return ok();
      }
      if (amount < minDeposit) {
        console.warn(`[OxaPay] Deposit ${amount} below min ${minDeposit}`);
        return ok();
      }

      const existing = await Transaction.findOne({ txId: track_id, type: 'deposit' });
      if (existing) {
        console.log('[OxaPay] Transaction already processed:', track_id);
        return ok();
      }

      let user = null;

      if (order_id && order_id.startsWith('deposit-')) {
        const userId = order_id.slice(8);
        console.log('[OxaPay] Looking up user by order_id:', userId);
        user = await User.findById(userId);
        if (!user) console.error('[OxaPay] User not found from order_id:', userId);
      }

      if (!user && address) {
        console.log('[OxaPay] Looking up user by address:', address);
        user = await User.findOne({ depositAddress: address });
        if (!user) console.error('[OxaPay] User not found from address:', address);
      }

      if (!user && track_id) {
        console.log('[OxaPay] Looking up user by track_id:', track_id);
        user = await User.findOne({ depositTrackId: track_id });
        if (!user) console.error('[OxaPay] User not found from track_id:', track_id);
      }

      if (!user) {
        console.error('[OxaPay] Unable to resolve user:', { order_id, address, track_id });
        return serverError('User not found for deposit - please retry');
      }

      console.log('[OxaPay] Found user:', user._id);

      console.log('[OxaPay] Creating transaction record...');
      try {
        await Transaction.create({
          userId: user._id,
          type: 'deposit',
          amount,
          currency: 'USDT',
          status: 'completed',
          txId: track_id,
          details: {
            order_id,
            address: address || user.depositAddress,
            network: body.network ?? 'BSC',
          },
        });
      } catch (err: any) {
        if (err.code === 11000) {
          console.log('[OxaPay] Transaction already processed (duplicate key):', track_id);
          return ok();
        }
        console.error('[OxaPay] Failed to create transaction:', err);
        throw err;
      }
      console.log('[OxaPay] Transaction created:', track_id);

      console.log('[OxaPay] Updating user balance...');
      const userUpdateResult = await User.updateOne(
        { _id: user._id },
        { $inc: { balance: amount } },
      );
      console.log('[OxaPay] Balance update result:', userUpdateResult);

      console.log('[OxaPay] Creating deposit notification...');
      try {
        await Notification.create({
          userId: user._id,
          title: 'Deposit Successful',
          body: `Your deposit of ${amount} USDT has been credited to your account.`,
          type: 'personal',
          icon: '💰',
        });
        console.log('[OxaPay] Notification created');
      } catch (notifErr) {
        console.error('[OxaPay] Failed to create notification (non-critical):', notifErr);
      }

      const existingBonus = await Bonus.findOne({ userId: user._id, type: 'welcome' });
      const depositCount = await Transaction.countDocuments({
        userId: user._id,
        type: 'deposit',
        status: 'completed',
      });

      console.log('[OxaPay] Deposit count:', depositCount, 'Existing bonus:', !!existingBonus);

      if (!existingBonus && depositCount === 1 && amount >= 100) {
        console.log('[OxaPay] Creating welcome bonus...');
        let bonusPercent = 20;
        if (amount >= 1000) bonusPercent = 50;
        else if (amount >= 500) bonusPercent = 40;
        else if (amount >= 200) bonusPercent = 30;

        const bonusAmount = parseFloat((amount * bonusPercent / 100).toFixed(2));

        try {
          await Bonus.create({
            userId: user._id,
            type: 'welcome',
            status: 'pending',
            firstDepositAmount: amount,
            bonusAmount,
            bonusPercent,
            requiredBetVolume: 30,
            requiredReferrals: 3,
            currentBetVolume: 0,
            currentReferrals: 0,
            referredUsersInvested: 0,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
          console.log('[OxaPay] Welcome bonus created:', bonusAmount);

          await Notification.create({
            userId: user._id,
            title: '🎁 Welcome Bonus Unlocked!',
            body: `Deposit $${amount.toFixed(2)} unlocked a ${bonusPercent}% bonus!`,
            type: 'personal',
            icon: '🎁',
          });
        } catch (bonusErr) {
          console.error('[OxaPay] Failed to create bonus (non-critical):', bonusErr);
        }
      }

      if (user.referrerCode) {
        console.log('[OxaPay] Processing referral bonus...');
        const referrer = await User.findOne({ myReferralCode: user.referrerCode });
        if (referrer) {
          const referralTxId = `ref-${track_id}`;
          const existingReferral = await Transaction.findOne({
            txId: referralTxId,
            type: 'referral',
          });

          if (!existingReferral) {
            const bonus = amount >= 100 ? amount * 0.3 : amount * 0.05;
            console.log('[OxaPay] Crediting referral bonus:', bonus, 'to referrer:', referrer._id);

            await User.updateOne(
              { _id: referrer._id },
              { $inc: { balance: bonus } },
            );

            try {
              await Transaction.create({
                userId: referrer._id,
                type: 'referral',
                amount: bonus,
                currency: 'USDT',
                status: 'completed',
                txId: referralTxId,
                details: { referredUserId: user._id, depositAmount: amount, depositTxId: track_id },
              });
              console.log('[OxaPay] Referral transaction created');
            } catch (refErr) {
              console.error('[OxaPay] Failed to create referral transaction:', refErr);
            }
          } else {
            console.log('[OxaPay] Referral bonus already exists:', referralTxId);
          }
        }
      }

      console.log('[OxaPay] Deposit processed successfully. User:', user._id, 'Amount:', amount);
      return ok();
    } else if (type === 'payout') {
      if (!track_id) return ok();

      if (status === 'Confirmed') {
        console.log('[OxaPay] Processing payout confirmation:', track_id);
        const tx = await Transaction.findOneAndUpdate(
          { txId: track_id, type: 'withdraw' },
          { status: 'completed' },
          { returnDocument: 'after' },
        );
        if (tx) {
          console.log('[OxaPay] Withdrawal marked completed:', track_id);
          try {
            await Notification.create({
              userId: tx.userId,
              title: 'Withdrawal Confirmed',
              body: `Your withdrawal of ${tx.amount} USDT has been confirmed.`,
              type: 'personal',
              icon: '✅',
            });
          } catch (notifErr) {
            console.error('[OxaPay] Failed to create notification:', notifErr);
          }
        } else {
          console.log('[OxaPay] Withdrawal not found:', track_id);
        }
      } else if (status === 'Failed') {
        console.log('[OxaPay] Processing payout failure:', track_id);
        const tx = await Transaction.findOne({ txId: track_id, type: 'withdraw', status: { $ne: 'rejected' } });
        if (tx) {
          tx.status = 'rejected';
          await tx.save();
          console.log('[OxaPay] Withdrawal marked rejected:', track_id);

          const user = await User.findById(tx.userId);
          if (user) {
            const gross = parseFloat(((tx.details as any)?.grossAmount ?? tx.amount).toString());
            await User.updateOne({ _id: user._id }, { $inc: { balance: gross } });
            console.log('[OxaPay] Balance refunded:', gross);

            try {
              await Notification.create({
                userId: user._id,
                title: 'Withdrawal Failed',
                body: `Your withdrawal of ${gross} USDT failed and has been refunded.`,
                type: 'personal',
                icon: '❌',
              });
            } catch (notifErr) {
              console.error('[OxaPay] Failed to create notification:', notifErr);
            }
          }
        }
      }

      return ok();
    }

    console.log('[OxaPay] Unhandled webhook type/status:', { type, status });
    return ok();
  } catch (error: any) {
    console.error('[OxaPay] Webhook error:', error);
    console.error('[OxaPay] Error stack:', error?.stack);
    return serverError(error?.message || 'Internal server error');
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      message: 'OxaPay webhook endpoint is active',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}