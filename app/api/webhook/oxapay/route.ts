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

function ok()  { return new Response('ok',    { status: 200 }); }
function bad() { return new Response('error', { status: 400 }); }

const PAYMENT_TYPES = new Set([
  'invoice', 'white_label', 'static_address', 'payment_link', 'donation',
]);

export async function POST(req: Request): Promise<Response> {
  const MERCHANT_KEY = process.env.OXAPAY_MERCHANT_API_KEY;
  const PAYOUT_KEY   = process.env.OXAPAY_PAYOUT_API_KEY;
  const rawBody    = await req.text();
  const hmacHeader = req.headers.get('HMAC') || req.headers.get('hmac');

  console.log('[OxaPay] Webhook received');
  console.log('[OxaPay] HMAC header:', hmacHeader ? 'present' : 'MISSING');
  console.log('[OxaPay] Raw body:', rawBody);
  console.log('[OxaPay] Merchant key (first 8):', MERCHANT_KEY?.substring(0, 8) || 'UNDEFINED');

  if (!hmacHeader) {
    console.error('[OxaPay] No HMAC header found');
    console.error('[OxaPay] Available headers:', Array.from(req.headers.keys()));
    return bad();
  }

  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch { return bad(); }

  // Exact field name from docs: "type"
  const type   = body.type   as string | undefined;
  const status = body.status as string | undefined;

  // Pick the right key for HMAC validation
  const secret = type && PAYMENT_TYPES.has(type) ? MERCHANT_KEY
               : type === 'payout'               ? PAYOUT_KEY
               : undefined;

  if (!secret) {
    console.error('OxaPay webhook: unknown type:', type);
    return bad();
  }

  const calculated = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  console.log('[OxaPay] Calculated HMAC:', calculated);
  console.log('[OxaPay] Received HMAC:', hmacHeader);
  console.log('[OxaPay] Type:', type, '| Status:', status);

  if (calculated !== hmacHeader) {
    console.error('[OxaPay] HMAC mismatch');
    console.error('[OxaPay] Calculated:', calculated);
    console.error('[OxaPay] Received:', hmacHeader);
    return bad();
  }

  // ── Field names exactly as documented ──────────────────────────────────────
  const track_id = body.track_id as string | undefined;
  const order_id = body.order_id as string | undefined;
  // amount is a decimal number in the IPN payload
  const amount   = typeof body.amount === 'number'
    ? body.amount
    : parseFloat(String(body.amount ?? 0));

  await dbConnect();

  const settings  = await Settings.findOne({ key: 'global' });
  const minDeposit = settings?.minDepositAmount ?? 10;

  // ── Payment received ────────────────────────────────────────────────────────
  if (type && PAYMENT_TYPES.has(type) && status?.toLowerCase() === 'paid') {
    console.log('[OxaPay] Payment webhook received:', { type, status, track_id, order_id, amount });
    if (!track_id) { console.error('OxaPay webhook: missing track_id'); return ok(); }
    if (amount < minDeposit) {
      console.warn(`OxaPay webhook: deposit ${amount} below min ${minDeposit}`);
      return ok();
    }
    if (!order_id) { console.error('OxaPay webhook: missing order_id'); return ok(); }

    // order_id format: "deposit-{userId}"
    const userId = order_id.startsWith('deposit-') ? order_id.slice(8) : null;
    if (!userId) { console.error('OxaPay webhook: cannot parse userId from', order_id); return ok(); }

    const user = await User.findById(userId);
    if (!user) { console.error('OxaPay webhook: user not found', userId); return ok(); }

    // Idempotency: skip if already processed
    const existing = await Transaction.findOne({ txId: track_id, type: 'deposit' });
    if (existing) {
      console.log('[OxaPay] Transaction already processed:', track_id);
      return ok();
    }

    console.log('[OxaPay] Crediting user:', userId, 'amount:', amount);

    user.balance = parseFloat((user.balance + amount).toFixed(6));
    await user.save();

    console.log('[OxaPay] User balance updated. New balance:', user.balance);

    await Transaction.create({
      userId:   user._id,
      type:     'deposit',
      amount,
      currency: 'USDT',
      status:   'completed',
      txId:     track_id,
      details:  { order_id, address: user.depositAddress, network: body.network ?? 'BSC' },
    });

    await Notification.create({
      userId: user._id,
      title:  'Deposit Successful',
      body:   `Your deposit of ${amount} USDT has been credited to your account.`,
      type:   'personal',
      icon:   '💰',
    });

    console.log('[OxaPay] Deposit processed successfully. User:', userId, 'Amount:', amount);

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
  } else {
    console.log('[OxaPay] Webhook not processed. Type:', type, 'Status:', status);
  }

  return ok();
}
