/**
 * OxaPay API Client using official oxapay package
 * With workaround for Next.js bundling issue
 */

import Oxapay from 'oxapay';

const MERCHANT_KEY = process.env.OXAPAY_MERCHANT_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

// Inline the method info to avoid file read error in Next.js
const METHOD_INFOS = {
  Payment: {
    generateInvoice: { reqType: 'POST', path: 'invoice' },
    generateWhiteLabel: { reqType: 'POST', path: 'white-label' },
    generateStaticAddress: { reqType: 'POST', path: 'static-address' },
    revokeStaticAddress: { reqType: 'POST', path: 'static-address/revoke' },
    listStaticAddress: { reqType: 'GET', path: 'static-address' },
    paymentInfo: { reqType: 'GET', path: '' },
    paymentHistory: { reqType: 'GET', path: '' },
    acceptedCurrencies: { reqType: 'GET', path: 'accepted-currencies' },
  },
};

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
    throw new Error('OXAPAY_MERCHANT_API_KEY not configured');
  }
  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL not configured');
  }

  const callbackUrl = `${appUrl}/api/webhook/oxapay`;
  const orderId = `deposit-${userId}`;

  console.log('[OxaPay] Creating static address for user:', userId);
  console.log('[OxaPay] Callback URL:', callbackUrl);

  try {
    const payment = new Oxapay.v1.payment(merchantKey);
    
    // Inject methodInfos to avoid file read
    (payment as any).methods = METHOD_INFOS.Payment;
    (payment as any).initialization = Promise.resolve();

    const result = await payment.generateStaticAddress({
      network: 'BSC',
      to_currency: 'USDT',
      auto_withdrawal: false,
      callback_url: callbackUrl,
      order_id: orderId,
      description: `Bets Pro deposit – user ${userId}`,
    });

    console.log('[OxaPay] Response:', JSON.stringify(result));

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
  } catch (error: any) {
    console.error('[OxaPay] Error:', error?.message);
    console.error('[OxaPay] Response:', error?.response?.data);
    throw error;
  }
}

export async function getPaymentInfo(trackId: string): Promise<any> {
  const merchantKey = process.env.OXAPAY_MERCHANT_API_KEY;

  if (!merchantKey) {
    throw new Error('OXAPAY_MERCHANT_API_KEY not configured');
  }

  const payment = new Oxapay.v1.payment(merchantKey);
  (payment as any).methods = METHOD_INFOS.Payment;
  (payment as any).initialization = Promise.resolve();

  return await payment.paymentInfo({ track_id: trackId });
}