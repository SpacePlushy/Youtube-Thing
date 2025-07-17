// Environment configuration
// This file centralizes environment variable access and provides defaults

import { AI_PROCESSING, API_ROUTE_CONFIG } from './constants';

export const envConfig = {
  // API Keys
  groqApiKey: process.env.GROQ_API_KEY,
  oxyLabsUsername: process.env.OXYLABS_USERNAME,
  oxyLabsPassword: process.env.OXYLABS_PASSWORD,
  geminiApiKey: process.env.GEMINI_API_KEY,
  
  // AI Model Configuration
  aiModel: process.env.AI_MODEL || 'llama-3.1-70b-versatile',
  aiTemperature: parseFloat(process.env.AI_TEMPERATURE || String(AI_PROCESSING.DEFAULT_TEMPERATURE)),
  aiMaxTokens: parseInt(process.env.AI_MAX_TOKENS || String(AI_PROCESSING.MAX_TOKENS_SINGLE_REQUEST)),
  aiMaxTokensChunk: parseInt(process.env.AI_MAX_TOKENS_CHUNK || String(AI_PROCESSING.MAX_TOKENS_PER_CHUNK)),
  
  // Processing Configuration
  chunkSize: parseInt(process.env.CHUNK_SIZE || String(AI_PROCESSING.CHUNK_SIZES.SMALL)),
  tokenEstimatePerSegment: parseInt(process.env.TOKEN_ESTIMATE || String(AI_PROCESSING.TOKENS_PER_SEGMENT_ESTIMATE)),
  parallelThreshold: parseInt(process.env.PARALLEL_THRESHOLD || String(AI_PROCESSING.SEQUENTIAL_PROCESSING_THRESHOLD)),
  
  // Response Configuration
  maxDuration: parseInt(process.env.MAX_DURATION || String(API_ROUTE_CONFIG.FORMAT_TRANSCRIPT_MAX_DURATION)),
  
  // Feature Flags
  enableCache: process.env.ENABLE_CACHE !== 'false',
  enableParallelProcessing: process.env.ENABLE_PARALLEL !== 'false',
}

// Validation function
export function validateEnvConfig() {
  const required = ['GROQ_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}