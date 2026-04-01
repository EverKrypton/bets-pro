/**
 * OxaPay Legacy Merchant API Client
 * Uses the merchant API where auth is sent in the request body
 * 
 * NOTE: Only used for DEPOSITS. Withdrawals use custom BEP20 module (lib/bep20.ts)
 */

import axios from 'axios';

const MERCHANT_KEY = process.env.OXAPAY_MERCHANT_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

const API_BASE = 'https://api.oxapay.com/';

interface OxaPayLegacyResponse {
  result: number;
  message: string;
  data?: {
    track_id?: string;
    network?: string;
    address?: string;
    qr_code?: string;
    date?: number;
  };
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

  const response = await axios.post<OxaPayLegacyResponse>(
    `${API_BASE}merchants/request/staticaddress`,
    {
      merchant: MERCHANT_KEY,
      network: 'BSC',
      currency: 'USDT',
      callback_url: callbackUrl,
      order_id: orderId,
      description: `Bets Pro deposit – user ${userId}`,
    }
  );

  const result = response.data;

  // result 100 = success
  if (result.result !== 100 || !result.data) {
    const errMsg = result.message || `OxaPay error: ${result.result}`;
    throw new Error(errMsg);
  }

  return {
    data: {
      address: result.data.address ?? '',
      network: result.data.network ?? 'BSC',
      currency: 'USDT',
      track_id: result.data.track_id ?? '',
    },
  };
}

export async function getPaymentInfo(trackId: string): Promise<OxaPayLegacyResponse> {
  if (!MERCHANT_KEY) {
    throw new Error('OXAPAY_MERCHANT_API_KEY not configured');
  }

  const response = await axios.post<OxaPayLegacyResponse>(
    `${API_BASE}merchants/inquiry`,
    {
      merchant: MERCHANT_KEY,
      track_id: trackId,
    }
  );

  return response.data;
}