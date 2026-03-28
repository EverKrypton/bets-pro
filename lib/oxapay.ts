/**
 * OxaPay v1 API — USDT BEP20 (BSC)
 * Deposit:  POST https://api.oxapay.com/v1/payment/static-address  Header: merchant_api_key
 * Payout:   POST https://api.oxapay.com/v1/payout                  Header: payout_api_key
 * Webhook:  HMAC-SHA512(rawBody, key) in "hmac" header
 *   payment types → MERCHANT_API_KEY
 *   payout type   → PAYOUT_API_KEY
 */

const MERCHANT_KEY = process.env.OXAPAY_MERCHANT_API_KEY;
const PAYOUT_KEY   = process.env.OXAPAY_PAYOUT_API_KEY;
const APP_URL      = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

export interface OxaStaticResponse {
  result:  number;   // 100 = success per OxaPay v1 docs
  message: string;
  address: string;
  network: string;
  currency: string;
}

export interface OxaPayoutResponse {
  result:   number;
  message:  string;
  trackId:  string;
  status:   string;
}

/**
 * Create (or retrieve) a static USDT BSC deposit address for a user.
 * OxaPay v1 /payment/static-address
 * Same order_id always returns the same address.
 */
export async function createStaticAddress(userId: string): Promise<{ data: { address: string; network: string; track_id: string; currency: string } }> {
  if (!MERCHANT_KEY) throw new Error('OXAPAY_MERCHANT_API_KEY not configured');

  const res = await fetch('https://api.oxapay.com/merchants/request/static-address', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchant:    MERCHANT_KEY,
      currency:    'USDT',
      network:     'BSC',
      callbackUrl: `${APP_URL}/api/webhook/oxapay`,
      description: `Bets Pro deposit user ${userId}`,
    }),
  });

  const data = await res.json();

  // OxaPay v1 returns result: 100 for success
  if (data.result !== 100) throw new Error(data.message || 'OxaPay static address failed');

  // Normalise to the shape the rest of the code expects
  return {
    data: {
      address:  data.address,
      network:  data.network  ?? 'BSC',
      currency: data.currency ?? 'USDT',
      track_id: data.trackId  ?? '',
    },
  };
}

/**
 * Send a USDT payout. amount is net (after 1 USDT fee already deducted).
 * OxaPay v1 /payout
 */
export async function createPayout(
  address:     string,
  amount:      number,
  network:     string = 'BSC',
  description: string = '',
): Promise<{ data: { track_id: string; status: string } }> {
  if (!PAYOUT_KEY) throw new Error('OXAPAY_PAYOUT_API_KEY not configured');

  // OxaPay expects network in their own format: BSC for BEP20, TRX for TRC20, ETH for ERC20
  const netMap: Record<string, string> = { BEP20: 'BSC', TRC20: 'TRX', ERC20: 'ETH', BSC: 'BSC', TRX: 'TRX', ETH: 'ETH' };
  const oxaNetwork = netMap[network.toUpperCase()] ?? network;

  const res = await fetch('https://api.oxapay.com/merchants/request/payout', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key:         PAYOUT_KEY,
      address,
      amount:      amount.toString(),
      currency:    'USDT',
      network:     oxaNetwork,
      callbackUrl: `${APP_URL}/api/webhook/oxapay`,
      description: description || `Bets Pro withdrawal to ${address}`,
    }),
  });

  const data = await res.json();
  if (data.result !== 100) throw new Error(data.message || 'OxaPay payout failed');

  return {
    data: {
      track_id: data.trackId ?? '',
      status:   data.status  ?? 'pending',
    },
  };
}
