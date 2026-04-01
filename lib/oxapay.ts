/**
 * OxaPay v1 API via official oxapay package
 * Docs: https://docs.oxapay.com
 */

import Oxapay from 'oxapay';

const MERCHANT_KEY = process.env.OXAPAY_MERCHANT_API_KEY;
const PAYOUT_KEY   = process.env.OXAPAY_PAYOUT_API_KEY;
const APP_URL      = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

function getPayment() {
  if (!MERCHANT_KEY) throw new Error('OXAPAY_MERCHANT_API_KEY not configured');
  return new Oxapay.v1.payment(MERCHANT_KEY);
}

function getPayout() {
  if (!PAYOUT_KEY) throw new Error('OXAPAY_PAYOUT_API_KEY not configured');
  return new Oxapay.v1.payout(PAYOUT_KEY);
}

export interface StaticAddressResult {
  address:  string;
  network:  string;
  currency: string;
  track_id: string;
}

export async function createStaticAddress(userId: string): Promise<{ data: StaticAddressResult }> {
  const payment = getPayment();

  const result = await payment.generateStaticAddress({
    network:         'BSC',
    to_currency:     'USDT',
    auto_withdrawal:  0,
    callback_url:    `${APP_URL}/api/webhook/oxapay`,
    order_id:         `deposit-${userId}`,
    description:      `Bets Pro deposit – user ${userId}`,
  });

  if (result.status !== 200) {
    const err = result.error as { message?: string } | {};
    throw new Error((err && 'message' in err ? err.message : undefined) || `OxaPay error: ${result.status}`);
  }

  return {
    data: {
      address:  result.data.address,
      network:  result.data.network,
      currency: 'USDT',
      track_id: result.data.track_id,
    },
  };
}

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
  const payout = getPayout();

  const networkMap: Record<string, string> = {
    BEP20: 'BSC',
    BSC:   'BSC',
    TRC20: 'TRX',
    TRX:   'TRX',
    ERC20: 'ETH',
    ETH:   'ETH',
  };

  const result = await payout.createPayout({
    address,
    amount,
    currency:    'USDT',
    network:     networkMap[network.toUpperCase()] ?? network,
    callback_url: `${APP_URL}/api/webhook/oxapay`,
    description:  description || `Bets Pro withdrawal`,
  });

  if (result.status !== 200) {
    const err = result.error as { message?: string } | {};
    throw new Error((err && 'message' in err ? err.message : undefined) || `OxaPay payout error (${result.status})`);
  }

  return {
    data: {
      track_id: result.data.track_id,
      status:   result.data.status,
    },
  };
}
