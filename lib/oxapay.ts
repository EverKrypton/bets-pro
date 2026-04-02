/**
 * OxaPay API Client - Direct implementation
 * Uses axios directly to avoid SDK file system issues in Next.js serverless
 */

import axios from 'axios';

const API_BASE_URL = 'https://api.oxapay.com/v1/payment/';

export interface StaticAddressResult {
  track_id: string;
  address: string;
  network: string;
  currency: string;
}

export interface OxaPayResponse<T> {
  status: number;
  message: string;
  data?: T;
  error?: {
    type: string;
    key: string;
    message: string;
  };
}

export async function createStaticAddress(userId: string): Promise<{ data: StaticAddressResult }> {
  const merchantKey = process.env.OXAPAY_MERCHANT_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

  if (!merchantKey) {
    throw new Error('OXAPAY_MERCHANT_API_KEY not configured');
  }
  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL not configured');
  }

  const callbackUrl = `${appUrl}/api/webhook/oxapay`;
  const orderId = `deposit-${userId}`;

  console.log('[OxaPay] Creating static address for user:', userId);
  console.log('[OxaPay] Callback URL:', callbackUrl);
  console.log('[OxaPay] Using merchant key (first 8 chars):', merchantKey.substring(0, 8) + '...');

  try {
    const response = await axios.post<OxaPayResponse<{track_id: string; address: string; network: string; qr_code: string; date: number}>>(
      `${API_BASE_URL}static-address`,
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
          'merchant_api_key': merchantKey,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      }
    );

    console.log('[OxaPay] Response status:', response.status);
    console.log('[OxaPay] Response data:', JSON.stringify(response.data));

    if (response.data.status !== 200 || !response.data.data) {
      const errMsg = response.data.error?.message || response.data.message || `OxaPay error: ${response.data.status}`;
      console.error('[OxaPay] API error:', errMsg);
      throw new Error(errMsg);
    }

    return {
      data: {
        address: response.data.data.address,
        network: response.data.data.network,
        currency: 'USDT',
        track_id: response.data.data.track_id,
      },
    };
  } catch (error: any) {
    console.error('[OxaPay] Error:', error?.message);
    if (error?.response?.data) {
      console.error('[OxaPay] Response data:', JSON.stringify(error.response.data));
    }
    throw error;
  }
}

export async function getPaymentInfo(trackId: string): Promise<any> {
  const merchantKey = process.env.OXAPAY_MERCHANT_API_KEY;

  if (!merchantKey) {
    throw new Error('OXAPAY_MERCHANT_API_KEY not configured');
  }

  const response = await axios.get<OxaPayResponse<any>>(
    `${API_BASE_URL}${trackId}`,
    {
      headers: {
        'merchant_api_key': merchantKey,
      },
      validateStatus: () => true,
    }
  );

  return response.data;
}