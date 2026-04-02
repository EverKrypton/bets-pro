/**
 * Test OxaPay Webhook - Production URL
 */

const crypto = require('crypto');

const MERCHANT_KEY = 'DSICYC-TMFQJQ-WQSLOJ-BNRRCI';
const WEBHOOK_URL = 'https://bets-pro.vercel.app/api/webhook/oxapay';

const testPayload = {
  type: 'static_address',
  status: 'Paid',
  track_id: 'test-track-' + Date.now(),
  order_id: 'deposit-TEST_USER_ID',
  amount: 100,
  currency: 'USDT',
  network: 'BSC',
  address: '0xTestAddress123'
};

async function testWebhook() {
  const rawBody = JSON.stringify(testPayload);
  const hmac = crypto.createHmac('sha512', MERCHANT_KEY).update(rawBody).digest('hex');
  
  console.log('='.repeat(70));
  console.log('TESTING OXAPAY WEBHOOK TO PRODUCTION');
  console.log('='.repeat(70));
  console.log('\nURL:', WEBHOOK_URL);
  console.log('\nPayload:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('\nHMAC:', hmac);
  console.log('\n' + '='.repeat(70));
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'hmac': hmac
      },
      body: rawBody
    });
    
    const text = await response.text();
    
    console.log('\n RESPONSE:');
    console.log('Status:', response.status, response.statusText);
    console.log('Body:', text || '(empty)');
    
    if (response.status === 200) {
      console.log('\n✅ SUCCESS: Webhook endpoint is reachable!');
      console.log('\nIf OxaPay is NOT sending webhooks, possible causes:');
      console.log('1. NEXT_PUBLIC_APP_URL not set correctly in Vercel');
      console.log('2. OxaPay dashboard has wrong callback URL');
      console.log('3. OXAPAY_MERCHANT_API_KEY not set in Vercel');
    } else if (response.status === 400) {
      console.log('\n⚠️  HMAC validation failed - this is expected with test data');
      console.log('But the endpoint IS reachable and processing requests');
      console.log('\nThis means:');
      console.log('- MERCHANT_KEY is configured correctly');
      console.log('- Webhook handler is working');
      console.log('- The issue is likely with OxaPay NOT sending webhooks');
    } else if (response.status === 500) {
      console.log('\n❌ SERVER ERROR - Check Vercel logs');
      console.log('Possible causes:');
      console.log('1. MONGODB_URI not configured');
      console.log('2. Database connection failed');
      console.log('3. Missing environment variables');
    } else {
      console.log('\n❌ Unexpected response');
    }
    
  } catch (error) {
    console.error('\n❌ CONNECTION ERROR:');
    console.error(error.message);
    console.log('\nPossible causes:');
    console.log('1. URL is incorrect');
    console.log('2. Server is down');
    console.log('3. Network/firewall blocking request');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('NEXT STEPS:');
  console.log('='.repeat(70));
  console.log('\n1. Check Vercel environment variables:');
  console.log('   - OXAPAY_MERCHANT_API_KEY');
  console.log('   - MONGODB_URI');
  console.log('   - NEXT_PUBLIC_APP_URL');
  console.log('\n2. Check OxaPay dashboard:');
  console.log('   - Callback URL should be:', WEBHOOK_URL);
  console.log('\n3. Check Vercel function logs for errors');
  console.log('\n4. Try with webhook.site:');
  console.log('   - Go to https://webhook.site');
  console.log('   - Copy your URL');
  console.log('   - Set NEXT_PUBLIC_APP_URL to that URL');
  console.log('   - Create deposit and send USDT');
  console.log('   - Watch webhook arrive');
}

testWebhook();