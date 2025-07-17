#!/usr/bin/env node

const DOMAIN = process.env.DOMAIN || 'https://youtubething.com';
const CHECK_INTERVAL = 60000; // 1 minute
const ALERT_THRESHOLD = 80; // Alert when 80% used

async function checkUsage() {
  try {
    const response = await fetch(`${DOMAIN}/api/admin/usage`);
    const data = await response.json();
    
    const { oxylabsDailyUsage, status } = data;
    const timestamp = new Date().toLocaleString();
    
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
    console.error('Error checking usage:', error.message);
  }
}

// Initial check
checkUsage();

// Set up interval
setInterval(checkUsage, CHECK_INTERVAL);

console.log(`Monitoring ${DOMAIN}/api/admin/usage every ${CHECK_INTERVAL/1000} seconds...`);
console.log('Press Ctrl+C to stop');