/**
 * Enhanced bot detection utilities to complement BotID
 * Helps identify known bot patterns and mobile browsers
 */

// Known bot user agent patterns
const BOT_PATTERNS = [
  // Web crawlers and spiders
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /applebot/i,
  
  // SEO and monitoring tools
  /ahrefsbot/i,
  /semrushbot/i,
  /dotbot/i,
  /mj12bot/i,
  /rogerbot/i,
  /screaming frog/i,
  
  // Generic bot indicators
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /crawling/i,
  
  // Development tools
  /postman/i,
  /insomnia/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /go-http-client/i,
  /java/i,
  /perl/i,
  /ruby/i,
  /php/i,
];

// Known mobile browser patterns
const MOBILE_PATTERNS = [
  /Mobile/i,
  /Android/i,
  /iPhone/i,
  /iPad/i,
  /iPod/i,
  /webOS/i,
  /BlackBerry/i,
  /IEMobile/i,
  /Opera Mini/i,
  /Windows Phone/i,
  /Kindle/i,
  /Silk/i,
  /Mobile Safari/i,
  /Chrome Mobile/i,
  /Firefox Mobile/i,
  /Samsung Browser/i,
];

// Known good bot patterns (search engines, etc.)
const GOOD_BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /applebot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /discordbot/i,
  /slackbot/i,
  /telegrambot/i,
];

export interface BotDetectionResult {
  isBot: boolean;
  isMobile: boolean;
  isGoodBot: boolean;
  isKnownBot: boolean;
  userAgentInfo: {
    raw: string;
    type: 'mobile' | 'desktop' | 'bot' | 'unknown';
    details?: string;
  };
}

/**
 * Enhanced bot detection that supplements BotID
 * Provides additional context for making blocking decisions
 */
export function detectBot(userAgent: string): BotDetectionResult {
  const lowerUA = userAgent.toLowerCase();
  
  // Check if it's a mobile browser
  const isMobile = MOBILE_PATTERNS.some(pattern => pattern.test(userAgent));
  
  // Check if it matches known bot patterns
  const matchedBotPattern = BOT_PATTERNS.find(pattern => pattern.test(userAgent));
  const isKnownBot = !!matchedBotPattern;
  
  // Check if it's a good bot
  const isGoodBot = GOOD_BOT_PATTERNS.some(pattern => pattern.test(userAgent));
  
  // Determine if it's a bot (known pattern OR suspicious characteristics)
  const isBot = isKnownBot || 
    userAgent.length < 10 || // Suspiciously short
    userAgent.includes('localhost') || // Local testing
    userAgent.includes('127.0.0.1') || // Local testing
    !userAgent.includes(' '); // No spaces often indicates programmatic access
  
  // Determine type
  let type: 'mobile' | 'desktop' | 'bot' | 'unknown' = 'unknown';
  if (isBot) type = 'bot';
  else if (isMobile) type = 'mobile';
  else if (userAgent.length > 20) type = 'desktop';
  
  return {
    isBot,
    isMobile,
    isGoodBot,
    isKnownBot,
    userAgentInfo: {
      raw: userAgent,
      type,
      details: matchedBotPattern?.source
    }
  };
}

/**
 * Combines BotID results with our detection for a final decision
 */
export function shouldBlockRequest(
  botIdResult: { isBot: boolean; isHuman: boolean; isGoodBot: boolean; bypassed: boolean },
  userAgent: string
): { block: boolean; reason?: string } {
  const ourDetection = detectBot(userAgent);
  
  // Never block mobile browsers (too many false positives)
  if (ourDetection.isMobile) {
    return { block: false, reason: 'Mobile browser detected' };
  }
  
  // Always allow good bots (search engines, social media crawlers)
  if (botIdResult.isGoodBot || ourDetection.isGoodBot) {
    return { block: false, reason: 'Good bot allowed' };
  }
  
  // If BotID says human, trust it
  if (botIdResult.isHuman) {
    return { block: false, reason: 'BotID verified human' };
  }
  
  // If BotID was bypassed, allow
  if (botIdResult.bypassed) {
    return { block: false, reason: 'BotID bypassed' };
  }
  
  // Block if both BotID and our detection agree it's a bot
  if (botIdResult.isBot && ourDetection.isBot) {
    return { block: true, reason: 'Confirmed bot by multiple signals' };
  }
  
  // Block if BotID says bot and it's not mobile
  if (botIdResult.isBot && !ourDetection.isMobile) {
    return { block: true, reason: 'BotID detected bot' };
  }
  
  // Default: allow (prefer false negatives over false positives)
  return { block: false, reason: 'Default allow' };
}