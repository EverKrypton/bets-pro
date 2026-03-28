import crypto      from 'crypto';
import dbConnect   from '@/lib/db';
import User        from '@/models/User';
import Transaction from '@/models/Transaction';

const MERCHANT_KEY = process.env.OXAPAY_MERCHANT_API_KEY;
const PAYOUT_KEY   = process.env.OXAPAY_PAYOUT_API_KEY;
const MIN_DEPOSIT  = 10;

// OxaPay v1 payment callback types
const PAYMENT_TYPES = new Set(['invoice','white_label','static_address','payment_link','donation']);

function ok()  { return new Response('ok',    { status: 200 }); }
function bad() { return new Response('error', { status: 400 }); }

export async function POST(req: Request): Promise<Response> {
  const rawBody    = await req.text();
  const hmacHeader = req.headers.get('hmac');
  if (!hmacHeader) return bad();

  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch { return bad(); }

  const type = (body.type ?? body.paymentType) as string | undefined;

  const secret = type && PAYMENT_TYPES.has(type) ? MERCHANT_KEY
               : type === 'payout'               ? PAYOUT_KEY
               : undefined;

  if (!secret) { console.error('Webhook: unknown type', type); return bad(); }

  const calculated = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  if (calculated !== hmacHeader) { console.error('Webhook: HMAC mismatch'); return bad(); }

  // ── Fields OxaPay sends ──────────────────────────────────────────────────
  const status   = (body.status   ?? body.payStatus)  as string;
  const track_id = (body.track_id ?? body.trackId)    as string;
  const order_id = (body.order_id ?? body.orderId)    as string | undefined;
  const amount   = parseFloat(String(body.amount ?? body.payAmount ?? 0));

  await dbConnect();

  if (type && PAYMENT_TYPES.has(type) && status === 'Paid') {
    if (amount < MIN_DEPOSIT) { console.warn(`Deposit ${amount} below min`); return ok(); }
    if (!order_id) { console.error('Missing order_id'); return ok(); }

    const userId = order_id.startsWith('deposit-') ? order_id.slice(8) : null;
    if (!userId) { console.error('Cannot parse userId from', order_id); return ok(); }

    const user = await User.findById(userId);
    if (!user) { console.error('User not found', userId); return ok(); }

    // Dedup
    if (await Transaction.findOne({ txId: track_id, type: 'deposit' })) return ok();

    user.balance = parseFloat((user.balance + amount).toFixed(6));
    await user.save();

    await Transaction.create({
      userId: user._id, type: 'deposit', amount, currency: 'USDT',
      status: 'completed', txId: track_id,
      details: { order_id, address: user.depositAddress, network: 'BSC' },
    });

    // Referral bonus
    if (user.referrerCode) {
      const referrer = await User.findOne({ email: user.referrerCode });
      if (referrer) {
        const bonus = amount >= 100 ? amount * 0.30 : amount * 0.05;
        referrer.balance = parseFloat((referrer.balance + bonus).toFixed(6));
        await referrer.save();
        await Transaction.create({
          userId: referrer._id, type: 'referral', amount: bonus, currency: 'USDT',
          status: 'completed', details: { referredUserId: user._id, depositAmount: amount },
        });
      }
    }

  } else if (type === 'payout') {
    if (status === 'Confirmed' || status === 'Completed') {
      await Transaction.findOneAndUpdate({ txId: track_id, type: 'withdraw' }, { status: 'completed' });
    } else if (status === 'Failed' || status === 'Rejected') {
      const tx = await Transaction.findOne({ txId: track_id, type: 'withdraw', status: { $ne: 'rejected' } });
      if (tx) {
        tx.status = 'rejected';
        await tx.save();
        const user = await User.findById(tx.userId);
        if (user) {
          const gross = parseFloat(((tx.details as any)?.grossAmount ?? tx.amount).toString());
          user.balance = parseFloat((user.balance + gross).toFixed(6));
          await user.save();
        }
      }
    }
  }

  return ok();
}
