/**
 * OxaPay v1 API helpers — USDT BEP20 (BSC Network)
 *
 * Deposit  → POST https://api.oxapay.com/v1/payment/static-address
 *              Header: merchant_api_key
 *
 * Payout   → POST https://api.oxapay.com/v1/payout
 *              Header: payout_api_key
 *
 * Webhook HMAC: sha512 of raw POST body
 *   - payment types (invoice / static_address / …) → signed with MERCHANT_API_KEY
 *   - payout type                                   → signed with PAYOUT_API_KEY
 */

const MERCHANT_API_KEY = process.env.OXAPAY_MERCHANT_API_KEY;
const PAYOUT_API_KEY   = process.env.OXAPAY_PAYOUT_API_KEY;
const APP_URL          = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

export interface OxaPayStaticAddressResponse {
  data: {
    track_id: string;
    address:  string;
    network:  string;
    currency: string;
  };
  message: string;
  error:   Record<string, unknown> | null;
  status:  number;
  version: string;
}

export interface OxaPayPayoutResponse {
  data: {
    track_id: string;
    status:   string;
  };
  message: string;
  error:   Record<string, unknown> | null;
  status:  number;
  version: string;
}

/**
 * Creates (or retrieves) a static USDT BEP20 address for a user.
 * Same order_id always returns the same address.
 */
export async function createStaticAddress(
  userId: string,
): Promise<OxaPayStaticAddressResponse> {
  if (!MERCHANT_API_KEY) throw new Error('OXAPAY_MERCHANT_API_KEY is not configured');

  const response = await fetch('https://api.oxapay.com/v1/payment/static-address', {
    method:  'POST',
    headers: {
      'Content-Type':    'application/json',
      'merchant_api_key': MERCHANT_API_KEY,
    },
    body: JSON.stringify({
      network:         'BSC',
      to_currency:     'USDT',
      auto_withdrawal: false,
      callback_url:    `${APP_URL}/api/webhook/oxapay`,
      order_id:        `deposit-${userId}`,
      description:     `Foxy Cash Casino deposit for user ${userId}`,
    }),
  });

  const data: OxaPayStaticAddressResponse = await response.json();
  if (data.status !== 200) throw new Error(data.message || 'OxaPay static address creation failed');
  return data;
}

/**
 * Sends a USDT BEP20 payout to an address.
 * amount is in USDT. Fee of 1 USDT is deducted before calling this.
 */
export async function createPayout(
  address:     string,
  amount:      number,
  network:     string = 'BEP20',
  description: string = '',
): Promise<OxaPayPayoutResponse> {
  if (!PAYOUT_API_KEY) throw new Error('OXAPAY_PAYOUT_API_KEY is not configured');

  const response = await fetch('https://api.oxapay.com/v1/payout', {
    method:  'POST',
    headers: {
      'Content-Type':   'application/json',
      'payout_api_key': PAYOUT_API_KEY,
    },
    body: JSON.stringify({
      address,
      amount,
      currency:     'USDT',
      network,
      callback_url: `${APP_URL}/api/webhook/oxapay`,
      description:  description || `FCC withdrawal to ${address}`,
    }),
  });

  const data: OxaPayPayoutResponse = await response.json();
  if (data.status !== 200) throw new Error(data.message || 'OxaPay payout creation failed');
  return data;
}
