import { NextResponse } from 'next/server';

export async function GET() {
  const envCheck = {
    MONGODB_URI: !!process.env.MONGODB_URI,
    OXAPAY_MERCHANT_API_KEY: !!process.env.OXAPAY_MERCHANT_API_KEY,
    OXAPAY_PAYOUT_API_KEY: !!process.env.OXAPAY_PAYOUT_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
    BEP20_ADMIN_PRIVATE_KEY: !!process.env.BEP20_ADMIN_PRIVATE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  };

  let dbStatus = 'not_tested';
  
  try {
    const dbConnect = (await import('@/lib/db')).default;
    await dbConnect();
    dbStatus = 'connected';
  } catch (error: any) {
    dbStatus = `error: ${error.message}`;
  }

  return NextResponse.json({
    status: 'ok',
    environment: envCheck,
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
}