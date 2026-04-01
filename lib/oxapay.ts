/**
 * OxaPay Legacy Merchant API Client
 * Uses the merchant API where auth is sent in the request body
 * 
 * NOTE: Only used for DEPOSITS. Withdrawals use custom BEP20 module (lib/bep20.ts)
 */

import axios from 'axios';

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
  const merchantKey = process.env.OXAPAY_MERCHANT_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

  if (!merchantKey) {
    console.error('OXAPAY_MERCHANT_API_KEY is not set in environment');
    throw new Error('OXAPAY_MERCHANT_API_KEY not configured');
  }
  if (!appUrl) {
    console.error('NEXT_PUBLIC_APP_URL is not set in environment');
    throw new Error('NEXT_PUBLIC_APP_URL not configured');
  }

  const callbackUrl = `${appUrl}/api/webhook/oxapay`;
  const orderId = `deposit-${userId}`;

  console.log('[OxaPay] Creating static address for user:', userId);
  console.log('[OxaPay] Callback URL:', callbackUrl);
  console.log('[OxaPay] Merchant key length:', merchantKey?.length);

  try {
    const response = await axios.post<OxaPayLegacyResponse>(
      `${API_BASE}merchants/request/staticaddress`,
      {
        merchant: merchantKey,
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
      console.error('[OxaPay] Error response:', JSON.stringify(result));
      const errMsg = result.message || `OxaPay error: ${result.result}`;
      throw new Error(errMsg);
    }

    console.log('[OxaPay] Success! Address:', result.data.address);

    return {
      data: {
        address: result.data.address ?? '',
        network: result.data.network ?? 'BSC',
        currency: 'USDT',
        track_id: result.data.track_id ?? '',
      },
    };
  } catch (error: any) {
    console.error('[OxaPay] Request failed:', error?.message);
    console.error('[OxaPay] Response:', error?.response?.data);
    throw error;
  }
}

export async function getPaymentInfo(trackId: string): Promise<OxaPayLegacyResponse> {
  const merchantKey = process.env.OXAPAY_MERCHANT_API_KEY;

  if (!merchantKey) {
    throw new Error('OXAPAY_MERCHANT_API_KEY not configured');
  }

  const response = await axios.post<OxaPayLegacyResponse>(
    `${API_BASE}merchants/inquiry`,
    {
      merchant: merchantKey,
      track_id: trackId,
    }
  );

  return response.data;
}