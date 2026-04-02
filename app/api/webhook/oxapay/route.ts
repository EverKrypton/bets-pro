/**
 * OxaPay Webhook
 * Docs: https://docs.oxapay.com/webhook
 *
 * Validation: HMAC-SHA512(rawBody, key) in "hmac" header
 *   - Payment types (invoice, white_label, static_address, payment_link, donation)
 *     → signed with MERCHANT_API_KEY
 *   - Payout type → signed with PAYOUT_API_KEY
 *
 * IPN fields (exact names from docs):
 *   track_id, status, type, amount, order_id, currency, network
 *   Status values: "Paying" | "Paid"  (payment) | "Confirming" | "Confirmed" | "Failed" (payout)
 */

import crypto         from 'crypto';
import dbConnect      from '@/lib/db';
import User           from '@/models/User';
import Transaction    from '@/models/Transaction';
import Notification   from '@/models/Notification';
import Settings       from '@/models/Settings';
import Bonus          from '@/models/Bonus';

const MERCHANT_KEY = process.env.OXAPAY_MERCHANT_API_KEY;
const PAYOUT_KEY   = process.env.OXAPAY_PAYOUT_API_KEY;

// All payment-originated webhook types (from docs)
const PAYMENT_TYPES = new Set([
  'invoice', 'white_label', 'static_address', 'payment_link', 'donation', 'payment',
]);

function ok()  { return new Response('ok',    { status: 200 }); }
function bad() { return new Response('error', { status: 400 }); }

export async function POST(req: Request): Promise<Response> {
  const rawBody    = await req.text();
  const hmacHeader = req.headers.get('hmac');
  if (!hmacHeader) return bad();

  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch { return bad(); }

  // Exact field name from docs: "type"
  const type   = body.type   as string | undefined;
  const status = body.status as string | undefined;
  console.log('OxaPay webhook received:', { type, status, track_id: body.track_id });

  // Pick the right key for HMAC validation
  const secret = type && PAYMENT_TYPES.has(type) ? MERCHANT_KEY
               : type === 'payout'               ? PAYOUT_KEY
               : undefined;

  if (!secret) {
    console.error('OxaPay webhook: unknown type:', type);
    return bad();
  }

  const calculated = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  if (calculated.toLowerCase() !== hmacHeader.trim().toLowerCase()) {
    console.error('OxaPay webhook: HMAC mismatch');
    return bad();
  }

  // ── Field names exactly as documented ──────────────────────────────────────
  const track_id = body.track_id as string | undefined;
  const order_id = body.order_id as string | undefined;
  const address  = body.address as string | undefined;
  // amount is a decimal number in the IPN payload
  const amount   = typeof body.amount === 'number'
    ? body.amount
    : parseFloat(String(body.amount ?? 0));

  await dbConnect();

  const settings  = await Settings.findOne({ key: 'global' });
  const minDeposit = settings?.minDepositAmount ?? 10;

  // ── Payment received ────────────────────────────────────────────────────────
  if (type && PAYMENT_TYPES.has(type) && status === 'Paid') {
    if (!track_id) { console.error('OxaPay webhook: missing track_id'); return ok(); }
    if (amount < minDeposit) {
      console.warn(`OxaPay webhook: deposit ${amount} below min ${minDeposit}`);
      return ok();
    }
    let user = null;

    if (order_id && order_id.startsWith('deposit-')) {
      const userId = order_id.slice(8);
      user = await User.findById(userId);
      if (!user) console.error('OxaPay webhook: user not found from order_id', userId);
    }


    if (!user && address) {
      user = await User.findOne({ depositAddress: address });
      if (!user) console.error('OxaPay webhook: user not found from address', address);
    }

    if (!user && track_id) {
      user = await User.findOne({ depositTrackId: track_id });
      if (!user) console.error('OxaPay webhook: user not found from track_id', track_id);
    }



    if (!user && address) {
      user = await User.findOne({ depositAddress: address });
      if (!user) console.error('OxaPay webhook: user not found from address', address);
    }


    if (!user) {
      console.error('OxaPay webhook: unable to resolve user. order_id:', order_id, 'address:', address);
      return ok();
    }

    // Idempotency: skip if already processed
    const existing = await Transaction.findOne({ txId: track_id, type: 'deposit' });
    if (existing) return ok();

    user.balance = parseFloat((user.balance + amount).toFixed(6));
    await user.save();

    await Transaction.create({
      userId:   user._id,
      type:     'deposit',
      amount,
      currency: 'USDT',
      status:   'completed',
      txId:     track_id,
      details:  { order_id, address: address || user.depositAddress, network: body.network ?? 'BSC' },
    });

    await Notification.create({
      userId: user._id,
      title:  'Deposit Successful',
      body:   `Your deposit of ${amount} USDT has been credited to your account.`,
      type:   'personal',
      icon:   '💰',
    });
    console.log('[OxaPay] Deposit processed successfully. User:', user._id, 'Amount:', amount);

    // Welcome bonus for first deposit >= 100
    const existingBonus = await Bonus.findOne({ userId: user._id, type: 'welcome' });
    const depositCount = await Transaction.countDocuments({
      userId: user._id,
      type: 'deposit',
      status: 'completed',
    });

    if (!existingBonus && depositCount === 1 && amount >= 100) {
      let bonusPercent = 20;
      if (amount >= 1000) bonusPercent = 50;
      else if (amount >= 500) bonusPercent = 40;
      else if (amount >= 200) bonusPercent = 30;

      const bonusAmount = parseFloat((amount * bonusPercent / 100).toFixed(2));

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

      await Notification.create({
        userId: user._id,
        title: '🎁 Welcome Bonus Unlocked!',
        body: `Deposit $${amount.toFixed(2)} unlocked a ${bonusPercent}% bonus! Complete requirements to claim.`,
        type: 'personal',
        icon: '🎁',
      });
    }

    // Referral bonus
    if (user.referrerCode) {
      const referrer = await User.findOne({ myReferralCode: user.referrerCode });
      if (referrer) {
        const bonus = amount >= 100 ? amount * 0.30 : amount * 0.05;
        referrer.balance = parseFloat((referrer.balance + bonus).toFixed(6));
        await referrer.save();
        await Transaction.create({
          userId:   referrer._id,
          type:     'referral',
          amount:   bonus,
          currency: 'USDT',
          status:   'completed',
          details:  { referredUserId: user._id, depositAmount: amount },
        });
      }
    }

  // ── Payout callback ─────────────────────────────────────────────────────────
  } else if (type === 'payout') {
    if (!track_id) return ok();

    if (status === 'Confirmed') {
      const tx = await Transaction.findOneAndUpdate(
        { txId: track_id, type: 'withdraw' },
        { status: 'completed' },
        { returnDocument: 'after' },
      );
      if (tx) {
        await Notification.create({
          userId: tx.userId,
          title:  'Withdrawal Confirmed',
          body:   `Your withdrawal of ${tx.amount} USDT has been confirmed and sent.`,
          type:   'personal',
          icon:   '✅',
        });
      }
    } else if (status === 'Failed') {
      const tx = await Transaction.findOne({ txId: track_id, type: 'withdraw', status: { $ne: 'rejected' } });
      if (tx) {
        tx.status = 'rejected';
        await tx.save();
        const user = await User.findById(tx.userId);
        if (user) {
          const gross = parseFloat(((tx.details as any)?.grossAmount ?? tx.amount).toString());
          user.balance = parseFloat((user.balance + gross).toFixed(6));
          await user.save();
          await Notification.create({
            userId: user._id,
            title:  'Withdrawal Failed',
            body:   `Your withdrawal of ${gross} USDT failed and has been refunded to your account.`,
            type:   'personal',
            icon:   '❌',
          });
        }
      }
    }
  }

  if (type && PAYMENT_TYPES.has(type) && status !== 'Paid') {
    console.log('OxaPay webhook: payment event ignored due to status', { status, track_id });
  }

  return ok();
}
