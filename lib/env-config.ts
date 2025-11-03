// Environment configuration
// This file centralizes environment variable access and provides defaults

export const envConfig = {
  // API Keys
  oxyLabsUsername: process.env.OXYLABS_USERNAME,
  oxyLabsPassword: process.env.OXYLABS_PASSWORD,

  // Feature Flags
  enableCache: process.env.ENABLE_CACHE !== 'false',
}

// Validation function
export function validateEnvConfig() {
  const required = [
    { key: 'OXYLABS_USERNAME', value: envConfig.oxyLabsUsername },
    { key: 'OXYLABS_PASSWORD', value: envConfig.oxyLabsPassword }
  ];

  const missing = required.filter(({ value }) => !value || value.trim() === '');

  if (missing.length > 0) {
    const missingKeys = missing.map(({ key }) => key).join(', ');
    throw new Error(`Missing or empty required environment variables: ${missingKeys}`);
  }
}
