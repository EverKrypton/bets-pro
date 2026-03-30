/**
 * OxaPay v1 API — USDT BEP20 (BSC)
 * Static address: POST https://api.oxapay.com/v1/payment/static-address
 *   Header: merchant_api_key: YOUR_KEY
 * Payout:         POST https://api.oxapay.com/v1/payout
 *   Header: payout_api_key: YOUR_KEY
 * Webhook HMAC-SHA512(rawBody, key) in "hmac" header
 */

const MERCHANT_KEY = process.env.OXAPAY_MERCHANT_API_KEY;
const PAYOUT_KEY   = process.env.OXAPAY_PAYOUT_API_KEY;
const APP_URL      = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

export async function createStaticAddress(userId: string): Promise<{ data: { address: string; network: string; track_id: string; currency: string } }> {
  if (!MERCHANT_KEY) throw new Error('OXAPAY_MERCHANT_API_KEY not configured');

  const res = await fetch('https://api.oxapay.com/v1/payment/static-address', {
    method:  'POST',
    headers: {
      'Content-Type':     'application/json',
      'merchant_api_key': MERCHANT_KEY,
    },
    body: JSON.stringify({
      network:         'BSC',
      to_currency:     'USDT',
      auto_withdrawal: false,
      callback_url:    `${APP_URL}/api/webhook/oxapay`,
      order_id:        `deposit-${userId}`,
      description:     `Bets Pro deposit for user ${userId}`,
    }),
  });

  const data = await res.json();
  // OxaPay v1 returns status: 200 for success
  if (data.status !== 200) throw new Error(data.message || `OxaPay error: ${JSON.stringify(data)}`);

  return {
    data: {
      address:  data.data?.address  ?? data.address,
      network:  data.data?.network  ?? data.network  ?? 'BSC',
      currency: data.data?.currency ?? data.currency ?? 'USDT',
      track_id: data.data?.track_id ?? data.trackId  ?? '',
    },
  };
}

export async function createPayout(
  address: string, amount: number, network = 'TRC20', description = '',
): Promise<{ data: { track_id: string; status: string } }> {
  if (!PAYOUT_KEY) throw new Error('OXAPAY_PAYOUT_API_KEY not configured');

  const netMap: Record<string,string> = { BEP20:'BSC', TRC20:'TRX', ERC20:'ETH', BSC:'BSC', TRX:'TRX', ETH:'ETH' };
  const oxaNet = netMap[network.toUpperCase()] ?? network;

  const res = await fetch('https://api.oxapay.com/v1/payout', {
    method:  'POST',
    headers: {
      'Content-Type':   'application/json',
      'payout_api_key': PAYOUT_KEY,
    },
    body: JSON.stringify({
      address,
      amount:       amount.toString(),
      currency:     'USDT',
      network:      oxaNet,
      callback_url: `${APP_URL}/api/webhook/oxapay`,
      description:  description || `Bets Pro withdrawal to ${address}`,
    }),
  });

  const data = await res.json();
  if (data.status !== 200) throw new Error(data.message || 'OxaPay payout failed');

  return {
    data: {
      track_id: data.data?.track_id ?? data.trackId ?? '',
      status:   data.data?.status   ?? data.status  ?? 'pending',
    },
  };
}
