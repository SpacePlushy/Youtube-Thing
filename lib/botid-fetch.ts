/**
 * Enhanced fetch wrapper that ensures BotID tokens are present
 * Especially important for mobile browsers where token generation is slower
 */

import { initializeBotId } from './botid-init';

/**
 * Check if BotID tokens are present in the document
 */
function hasBotIdTokens(): boolean {
  // Check cookies for BotID tokens
  const cookies = document.cookie.split(';');
  const hasCookieToken = cookies.some(cookie => 
    cookie.trim().startsWith('__Host-botid') || 
    cookie.trim().startsWith('botid')
  );
  
  // Check if tokens might be in headers (some implementations)
  const hasWindowTokens = !!(window as any).__BOTID_TOKEN__ || 
                         !!(window as any).BOTID_SESSION;
  
  console.log('[BotID] Token check:', {
    hasCookieToken,
    hasWindowTokens,
    cookies: cookies.filter(c => c.includes('botid')).map(c => c.split('=')[0].trim())
  });
  
  return hasCookieToken || hasWindowTokens;
}

/**
 * Wait for BotID tokens with retries
 */
async function waitForTokens(maxRetries = 10): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    if (hasBotIdTokens()) {
      console.log(`[BotID] Tokens found after ${i} attempts`);
      return true;
    }
    
    console.log(`[BotID] Waiting for tokens... attempt ${i + 1}/${maxRetries}`);
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.warn('[BotID] Tokens not found after maximum retries');
  return false;
}

/**
 * Fetch wrapper that ensures BotID is ready
 */
export async function botIdFetch(url: string, options?: RequestInit): Promise<Response> {
  console.log('[BotID Fetch] Starting protected request to:', url);
  
  // First ensure BotID is initialized
  await initializeBotId();
  
  // Then wait for tokens to be set
  const hasTokens = await waitForTokens();
  
  if (!hasTokens) {
    console.warn('[BotID] Proceeding without tokens - may be blocked');
    // On mobile, this is likely the issue
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      console.error('[BotID] Mobile browser failed to generate tokens');
    }
  }
  
  // Log the final request state
  console.log('[BotID] Making request to:', url, {
    hasTokens,
    cookieLength: document.cookie.length,
    isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  });
  
  // Make the actual fetch request
  return fetch(url, {
    ...options,
    credentials: 'include', // Ensure cookies are sent
    headers: {
      ...options?.headers,
      // Some implementations might need explicit headers
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
}