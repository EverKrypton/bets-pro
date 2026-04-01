/**
 * OxaPay API Client (Direct HTTP calls)
 * Docs: https://docs.oxapay.com/api-payment/
 * 
 * NOTE: Only used for DEPOSITS. Withdrawals use custom BEP20 module (lib/bep20.ts)
 */

import axios from 'axios';

const MERCHANT_KEY = process.env.OXAPAY_MERCHANT_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

const API_BASE = 'https://api.oxapay.com/v1/payment/';

interface OxaPayResponse<T> {
  data: T;
  message: string;
  error?: {
    type: string;
    key: string;
    message: string;
  };
  status: number;
  version: string;
}

interface StaticAddressData {
  track_id: string;
  network: string;
  address: string;
  qr_code: string;
  date: number;
}

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

  const response = await axios.post<OxaPayResponse<StaticAddressData>>(
    `https://api.oxapay.com/v1/payment/static-address`,
    {
      network: 'BSC',
      to_currency: 'USDT',
      auto_withdrawal: false,
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

  const result = response.data;

  if (result.status !== 200 || !result.data) {
    const errMsg = result.error?.message || result.message || `OxaPay error: ${result.status}`;
    throw new Error(errMsg);
  }

  return {
    data: {
      address: result.data.address,
      network: result.data.network,
      currency: 'USDT',
      track_id: result.data.track_id,
    },
  };
}

export async function getPaymentInfo(trackId: string): Promise<OxaPayResponse<any>> {
  if (!MERCHANT_KEY) {
    throw new Error('OXAPAY_MERCHANT_API_KEY not configured');
  }

  const response = await axios.get<OxaPayResponse<any>>(
    `${API_BASE}${trackId}`,
    {
      headers: {
        'merchant_api_key': MERCHANT_KEY,
      },
    }
  );

  return response.data;
}