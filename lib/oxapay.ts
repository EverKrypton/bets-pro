/**
 * OxaPay v1 API
 * Docs:
 *   Static address : https://docs.oxapay.com/api-reference/payment/generate-static-address
 *   Payout         : https://docs.oxapay.com/api-reference/payout/generate-payout
 *   Webhook        : https://docs.oxapay.com/webhook
 *
 * Auth headers:
 *   merchant_api_key  → payment endpoints
 *   payout_api_key    → payout endpoint
 *
 * HMAC-SHA512(rawBody, key) sent in "hmac" header on webhooks.
 *   - Payment types  → validate with MERCHANT_API_KEY
 *   - Payout type    → validate with PAYOUT_API_KEY
 */

const MERCHANT_KEY = process.env.OXAPAY_MERCHANT_API_KEY;
const PAYOUT_KEY   = process.env.OXAPAY_PAYOUT_API_KEY;
const APP_URL      = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

// ─── Static address (deposit) ─────────────────────────────────────────────────
export interface StaticAddressResult {
  address:  string;
  network:  string;
  currency: string;
  track_id: string;
}

export async function createStaticAddress(userId: string): Promise<{ data: StaticAddressResult }> {
  if (!MERCHANT_KEY) throw new Error('OXAPAY_MERCHANT_API_KEY not configured');

  const res = await fetch('https://api.oxapay.com/v1/payment/static-address', {
    method:  'POST',
    headers: {
      'Content-Type':     'application/json',
      'merchant_api_key': MERCHANT_KEY,
    },
    body: JSON.stringify({
      network:         'BSC',           // BNB Smart Chain for USDT BEP20
      to_currency:     'USDT',
      auto_withdrawal: 0,               // credit to OxaPay balance (number per docs)
      callback_url:    `${APP_URL}/api/webhook/oxapay`,
      order_id:        `deposit-${userId}`,
      description:     `Bets Pro deposit – user ${userId}`,
    }),
  });

  const json = await res.json();

  if (json.status !== 200) {
    throw new Error(json.message || `OxaPay static-address error: ${JSON.stringify(json)}`);
  }

  // Response echoes back the request body; actual address is in data
  const d = json.data ?? {};
  return {
    data: {
      address:  d.address  ?? '',
      network:  d.network  ?? 'BSC',
      currency: d.to_currency ?? 'USDT',
      track_id: d.track_id ?? '',
    },
  };
}

// ─── Payout (withdrawal) ──────────────────────────────────────────────────────
// Network name map: what the user chooses → what OxaPay expects
// OxaPay uses the same short codes as the network field: BSC, TRX, ETH
const NETWORK_MAP: Record<string, { network: string }> = {
  BEP20: { network: 'BSC' },
  BSC:   { network: 'BSC' },
  TRC20: { network: 'TRX' },
  TRX:   { network: 'TRX' },
  ERC20: { network: 'ETH' },
  ETH:   { network: 'ETH' },
};

export interface PayoutResult {
  track_id: string;
  status:   string;
}

export async function createPayout(
  address: string,
  amount: number,
  network = 'TRC20',
  description = '',
): Promise<{ data: PayoutResult }> {
  if (!PAYOUT_KEY) throw new Error('OXAPAY_PAYOUT_API_KEY not configured');

  const mapped = NETWORK_MAP[network.toUpperCase()] ?? { network };

  const payload = {
    address,
    amount,               // ← NUMBER (not string) — docs say: number · decimal
    currency:    'USDT',
    network:     mapped.network,
    callback_url: `${APP_URL}/api/webhook/oxapay`,
    description:  description || `Bets Pro withdrawal`,
  };

  const res = await fetch('https://api.oxapay.com/v1/payout', {
    method:  'POST',
    headers: {
      'Content-Type':   'application/json',
      'payout_api_key': PAYOUT_KEY,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (json.status !== 200) {
    // Surface the exact OxaPay error message
    throw new Error(json.message || `OxaPay payout error (${json.status}): ${JSON.stringify(json.error ?? json)}`);
  }

  return {
    data: {
      track_id: json.data?.track_id ?? '',
      status:   json.data?.status   ?? 'processing',
    },
  };
}
