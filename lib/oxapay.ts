/**
 * OxaPay API Client (Direct HTTP calls)
 * Docs: https://docs.oxapay.com/api-payment
 * 
 * NOTE: Only used for DEPOSITS. Withdrawals use custom BEP20 module (lib/bep20.ts)
 */

import axios from 'axios';

const MERCHANT_KEY = process.env.OXAPAY_MERCHANT_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

const API_BASE = 'https://api.oxapay.com/v1/payment';

export interface StaticAddressResult {
  address: string;
  network: string;
  currency: string;
  track_id: string;
}

export async function createStaticAddress(userId: string): Promise<{ data: StaticAddressResult }> {
  if (!MERCHANT_KEY) {
    throw new Error('OXAPAY_MERCHANT_API_KEY not configured');
  }
  if (!APP_URL) {
    throw new Error('NEXT_PUBLIC_APP_URL not configured');
  }

  const callbackUrl = `${APP_URL}/api/webhook/oxapay`;
  const orderId = `deposit-${userId}`;

  const response = await axios.post(
    `${API_BASE}/staticaddress`,
    {
      network: 'BSC',
      to_currency: 'USDT',
      auto_withdrawal: 0,
      callback_url: callbackUrl,
      order_id: orderId,
      description: `Bets Pro deposit – user ${userId}`,
    },
    {
      headers: {
        'merchant_api_key': MERCHANT_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = response.data;

  if (data.status !== 200 || !data.result) {
    const errMsg = data.message || data.error || `OxaPay error: ${data.status}`;
    throw new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
  }

  return {
    data: {
      address: data.result.address,
      network: data.result.network || 'BSC',
      currency: 'USDT',
      track_id: data.result.track_id || data.result.trackId,
    },
  };
}

export async function getPaymentInfo(trackId: string): Promise<any> {
  if (!MERCHANT_KEY) {
    throw new Error('OXAPAY_MERCHANT_API_KEY not configured');
  }

  const response = await axios.get(
    `${API_BASE}/paymentinfo/${trackId}`,
    {
      headers: {
        'merchant_api_key': MERCHANT_KEY,
      },
    }
  );

  return response.data;
}