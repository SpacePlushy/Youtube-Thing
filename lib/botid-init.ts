/**
 * BotID initialization helper
 * Ensures BotID client is ready before allowing API calls
 */

let botIdReady = false;
let initPromise: Promise<void> | null = null;

/**
 * Wait for BotID to initialize
 * Mobile browsers may need extra time for the client script to load
 */
export async function waitForBotId(): Promise<void> {
  // If already initialized, return immediately
  if (botIdReady) {
    return;
  }

  // If initialization is in progress, wait for it
  if (initPromise) {
    return initPromise;
  }

  // Start initialization
  initPromise = new Promise((resolve) => {
    const checkBotId = () => {
      // Check if BotID has injected its scripts/tokens
      // This is a heuristic - we're looking for signs that BotID is active
      const hasScripts = document.querySelector('script[src*="botid"]') || 
                        document.querySelector('script[src*="149e9513-01fa-4fb0-aad4-566afd725d1b"]');
      
      if (hasScripts || botIdReady) {
        botIdReady = true;
        console.log('[BotID] Client initialized and ready');
        resolve();
      } else {
        // Check again in 100ms
        setTimeout(checkBotId, 100);
      }
    };

    // Start checking after a small delay to allow initial page load
    setTimeout(checkBotId, 100);

    // Timeout after 3 seconds - don't block forever
    setTimeout(() => {
      if (!botIdReady) {
        console.warn('[BotID] Initialization timeout - proceeding anyway');
        botIdReady = true;
        resolve();
      }
    }, 3000);
  });

  return initPromise;
}

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Initialize BotID with mobile-specific handling
 */
export async function initializeBotId(): Promise<void> {
  if (isMobileDevice()) {
    console.log('[BotID] Mobile device detected - waiting for initialization');
    // Mobile devices may need extra time
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  await waitForBotId();
}