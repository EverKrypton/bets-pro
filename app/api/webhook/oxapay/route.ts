import crypto      from 'crypto';
import dbConnect   from '@/lib/db';
import User        from '@/models/User';
import Transaction from '@/models/Transaction';

const MERCHANT_API_KEY = process.env.OXAPAY_MERCHANT_API_KEY;
const PAYOUT_API_KEY   = process.env.OXAPAY_PAYOUT_API_KEY;
const MIN_DEPOSIT      = 10; // USDT

const PAYMENT_TYPES = new Set([
  'invoice', 'white_label', 'static_address', 'payment_link', 'donation',
]);

function ok()  { return new Response('ok',    { status: 200 }); }
function bad() { return new Response('error', { status: 400 }); }

export async function POST(req: Request): Promise<Response> {
  const rawBody    = await req.text();
  const hmacHeader = req.headers.get('hmac');

  if (!hmacHeader) return bad();

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return bad();
  }

  const type = body.type as string | undefined;

  let secret: string | undefined;
  if (type && PAYMENT_TYPES.has(type)) {
    secret = MERCHANT_API_KEY;
  } else if (type === 'payout') {
    secret = PAYOUT_API_KEY;
  }

  if (!secret) {
    console.error('Webhook: unknown or missing type', type);
    return bad();
  }

  const calculated = crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');

  if (calculated !== hmacHeader) {
    console.error('Webhook: HMAC mismatch');
    return bad();
  }

  const status   = body.status   as string;
  const track_id = body.track_id as string;
  const order_id = body.order_id as string | undefined;
  const amount   = parseFloat(String(body.amount ?? 0));

  await dbConnect();

  if (type && PAYMENT_TYPES.has(type) && status === 'Paid') {
    if (amount < MIN_DEPOSIT) {
      console.warn(`Webhook: deposit ${amount} USDT below minimum ${MIN_DEPOSIT}, ignoring`);
      return ok();
    }

    if (!order_id) {
      console.error('Webhook: payment callback missing order_id');
      return ok();
    }

    const userId = order_id.startsWith('deposit-') ? order_id.slice('deposit-'.length) : null;
    if (!userId) {
      console.error('Webhook: could not parse userId from order_id', order_id);
      return ok();
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error('Webhook: user not found for userId', userId);
      return ok();
    }

    // Guard duplicate delivery
    const duplicate = await Transaction.findOne({ txId: track_id, type: 'deposit' });
    if (duplicate) return ok();

    user.balance = parseFloat((user.balance + amount).toFixed(6));
    await user.save();

    await Transaction.create({
      userId:   user._id,
      type:     'deposit',
      amount,
      currency: 'USDT',
      status:   'completed',
      txId:     track_id,
      details:  { order_id, address: user.depositAddress, network: 'BSC (BEP20)' },
    });

    // Referral bonus — only on first deposit
    if (user.referrerCode) {
      const referrer = await User.findOne({ email: user.referrerCode });
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
  } else if (type === 'payout') {
    if (status === 'Confirmed') {
      await Transaction.findOneAndUpdate(
        { txId: track_id, type: 'withdraw' },
        { status: 'completed' },
      );
    } else if (status === 'Failed') {
      const transaction = await Transaction.findOne({
        txId:   track_id,
        type:   'withdraw',
        status: { $ne: 'rejected' },
      });

      if (transaction) {
        transaction.status = 'rejected';
        await transaction.save();

        const user = await User.findById(transaction.userId);
        if (user) {
          const gross      = parseFloat(((transaction.details as any)?.grossAmount ?? transaction.amount).toString());
          user.balance     = parseFloat((user.balance + gross).toFixed(6));
          await user.save();
        }
      }
    }
  }

  return ok();
}
