// Environment configuration
// This file centralizes environment variable access and provides defaults

export const envConfig = {
  // API Keys
  groqApiKey: process.env.GROQ_API_KEY,
  oxyLabsUsername: process.env.OXYLABS_USERNAME,
  oxyLabsPassword: process.env.OXYLABS_PASSWORD,
  geminiApiKey: process.env.GEMINI_API_KEY,
  
  // AI Model Configuration
  aiModel: process.env.AI_MODEL || 'llama-3.1-8b-instant',
  aiTemperature: parseFloat(process.env.AI_TEMPERATURE || '0.3'),
  aiMaxTokens: parseInt(process.env.AI_MAX_TOKENS || '8000'),
  aiMaxTokensChunk: parseInt(process.env.AI_MAX_TOKENS_CHUNK || '3000'),
  
  // Processing Configuration
  chunkSize: parseInt(process.env.CHUNK_SIZE || '100'),
  tokenEstimatePerSegment: parseInt(process.env.TOKEN_ESTIMATE || '20'),
  parallelThreshold: parseInt(process.env.PARALLEL_THRESHOLD || '6000'),
  
  // Response Configuration
  maxDuration: parseInt(process.env.MAX_DURATION || '30'),
  
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