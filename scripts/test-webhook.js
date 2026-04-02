/**
 * Test OxaPay Webhook Locally
 * Run: node scripts/test-webhook.js
 */

const crypto = require('crypto');

const MERCHANT_KEY = 'DSICYC-TMFQJQ-WQSLOJ-BNRRCI';

const testPayload = {
  type: 'static_address',
  status: 'Paid',
  track_id: 'test-track-123',
  order_id: 'deposit-test-user-id',
  amount: 100,
  currency: 'USDT',
  network: 'BSC',
  address: '0xTestAddress123'
};

function createHmac(payload, key) {
  const rawBody = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha512', key).update(rawBody).digest('hex');
  return { rawBody, hmac };
}

async function testWebhook() {
  const { rawBody, hmac } = createHmac(testPayload, MERCHANT_KEY);
  
  console.log('='.repeat(60));
  console.log('OxaPay Webhook Test');
  console.log('='.repeat(60));
  console.log('\nMerchant Key:', MERCHANT_KEY);
  console.log('\nPayload:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('\nHMAC Signature:', hmac);
  console.log('\n' + '='.repeat(60));
  
  // Test against production URL
  const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://bets-pro.vercel.app/api/webhook/oxapay';
  
  console.log('\nSending to:', WEBHOOK_URL);
  console.log('\nPress Ctrl+C to cancel...\n');
  
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
    console.log('\nResponse Status:', response.status);
    console.log('Response Body:', text);
    
    if (response.status === 200) {
      console.log('\n SUCCESS: Webhook processed correctly!');
    } else {
      console.log('\n FAILED: Check server logs');
    }
  } catch (error) {
    console.error('\n ERROR:', error.message);
    console.log('\n Make sure your dev server is running: npm run dev');
  }
  
  // Also show webhook.site URL for external testing
  console.log('\n' + '='.repeat(60));
  console.log('WEBHOOK.SITE TESTING');
  console.log('='.repeat(60));
  console.log('\n1. Go to https://webhook.site');
  console.log('2. Copy your unique URL');
  console.log('3. Update NEXT_PUBLIC_APP_URL in .env.local to that URL');
  console.log('4. Create a deposit address in your app');
  console.log('5. Send USDT to the address');
  console.log('6. Watch webhook arrive at webhook.site');
  console.log('\nYour webhook endpoint is configured at:');
  console.log('https://bets-pro.vercel.app/api/webhook/oxapay');
  console.log('\nMake sure OxaPay dashboard has this URL set!');
}

testWebhook();