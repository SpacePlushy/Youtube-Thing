// Environment configuration
// This file centralizes environment variable access and provides defaults

import { AI_PROCESSING, API_ROUTE_CONFIG } from './constants';

// Helper function to safely parse numbers with validation
function safeParseInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function safeParseFloat(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

export const envConfig = {
  // API Keys
  cerebrasApiKey: process.env.CEREBRAS_API_KEY,
  oxyLabsUsername: process.env.OXYLABS_USERNAME,
  oxyLabsPassword: process.env.OXYLABS_PASSWORD,
  
  // AI Model Configuration
  aiModel: process.env.AI_MODEL || 'llama-4-scout-17b-16e-instruct',
  aiTemperature: safeParseFloat(process.env.AI_TEMPERATURE, AI_PROCESSING.DEFAULT_TEMPERATURE),
  aiMaxTokens: safeParseInt(process.env.AI_MAX_TOKENS, AI_PROCESSING.MAX_TOKENS_SINGLE_REQUEST),
  aiMaxTokensChunk: safeParseInt(process.env.AI_MAX_TOKENS_CHUNK, AI_PROCESSING.MAX_TOKENS_PER_CHUNK),
  
  // Processing Configuration
  chunkSize: safeParseInt(process.env.CHUNK_SIZE, AI_PROCESSING.CHUNK_SIZES.SMALL),
  tokenEstimatePerSegment: safeParseInt(process.env.TOKEN_ESTIMATE, AI_PROCESSING.TOKENS_PER_SEGMENT_ESTIMATE),
  parallelThreshold: safeParseInt(process.env.PARALLEL_THRESHOLD, AI_PROCESSING.SEQUENTIAL_PROCESSING_THRESHOLD),
  
  // Response Configuration
  maxDuration: safeParseInt(process.env.MAX_DURATION, API_ROUTE_CONFIG.FORMAT_TRANSCRIPT_MAX_DURATION),
  
  // Feature Flags
  enableCache: process.env.ENABLE_CACHE !== 'false',
  enableParallelProcessing: process.env.ENABLE_PARALLEL !== 'false',
}

// Validation function
export function validateEnvConfig() {
  const required = [
    { key: 'CEREBRAS_API_KEY', value: envConfig.cerebrasApiKey },
    { key: 'OXYLABS_USERNAME', value: envConfig.oxyLabsUsername },
    { key: 'OXYLABS_PASSWORD', value: envConfig.oxyLabsPassword }
  ];
  
  const missing = required.filter(({ value }) => !value || value.trim() === '');
  
  if (missing.length > 0) {
    const missingKeys = missing.map(({ key }) => key).join(', ');
    throw new Error(`Missing or empty required environment variables: ${missingKeys}`);
  }
  
  // Validate numeric values
  const numericConfigs = [
    { name: 'aiTemperature', value: envConfig.aiTemperature, min: 0, max: 2 },
    { name: 'aiMaxTokens', value: envConfig.aiMaxTokens, min: 1, max: 100000 },
    { name: 'chunkSize', value: envConfig.chunkSize, min: 100, max: 50000 }
  ];
  
  for (const config of numericConfigs) {
    if (config.value < config.min || config.value > config.max) {
      console.warn(`Warning: ${config.name} value ${config.value} is outside recommended range [${config.min}, ${config.max}]`);
    }
  }
}