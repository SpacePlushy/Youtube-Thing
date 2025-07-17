#!/usr/bin/env node

const DOMAIN = process.env.DOMAIN || 'https://youtubething.com';
const CHECK_INTERVAL = 60000; // 1 minute
const ALERT_THRESHOLD = 80; // Alert when 80% used

async function checkUsage() {
  try {
    const response = await fetch(`${DOMAIN}/api/admin/usage`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      }
    });
    
    const contentType = response.headers.get('content-type');
    const timestamp = new Date().toLocaleString();
    
    // Check if we got HTML (likely Vercel Security Checkpoint)
    if (contentType && contentType.includes('text/html')) {
      console.log(`\n[${timestamp}]`);
      console.log('⚠️  Vercel Security Checkpoint detected');
      console.log('The endpoint is temporarily blocked by Vercel\'s bot protection.');
      console.log('Please visit the URL directly in your browser:');
      console.log(`${DOMAIN}/api/admin/usage`);
      return;
    }
    
    // Check for non-200 status
    if (!response.ok) {
      console.log(`\n[${timestamp}]`);
      console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    
    const { oxylabsDailyUsage, status } = data;
    
    console.log(`\n[${timestamp}]`);
    console.log(`Status: ${status}`);
    console.log(`Used: ${oxylabsDailyUsage.used}/${oxylabsDailyUsage.limit} (${oxylabsDailyUsage.percentageUsed}%)`);
    console.log(`Remaining: ${oxylabsDailyUsage.remaining}`);
    console.log(`Resets in: ${oxylabsDailyUsage.timeUntilReset}`);
    
    // Alert if usage is high
    if (oxylabsDailyUsage.percentageUsed >= ALERT_THRESHOLD) {
      console.log(`⚠️  WARNING: Usage is at ${oxylabsDailyUsage.percentageUsed}%!`);
    }
    
    // Alert if limit is reached
    if (status !== 'healthy') {
      console.log('🚨 ALERT: Daily limit reached!');
    }
    
  } catch (error) {
    const timestamp = new Date().toLocaleString();
    console.log(`\n[${timestamp}]`);
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('Unexpected token')) {
      console.log('The response is not valid JSON. This usually means:');
      console.log('1. Vercel Security Checkpoint is active');
      console.log('2. The endpoint hasn\'t deployed yet');
      console.log(`\nTry visiting directly: ${DOMAIN}/api/admin/usage`);
    }
  }
}

// Initial check
checkUsage();

// Set up interval
setInterval(checkUsage, CHECK_INTERVAL);

console.log(`Monitoring ${DOMAIN}/api/admin/usage every ${CHECK_INTERVAL/1000} seconds...`);
console.log('Press Ctrl+C to stop');