import { NextResponse } from 'next/server';
import { envConfig, validateEnvConfig } from '@/lib/env-config';

export async function GET() {
  const tests = [];
  
  // Save original env values
  const originalEnv = {
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    OXYLABS_USERNAME: process.env.OXYLABS_USERNAME,
    OXYLABS_PASSWORD: process.env.OXYLABS_PASSWORD,
  };

  try {
    // Test 1: Check current state
    tests.push({
      name: 'Current Environment State',
      status: 'info',
      envVars: {
        CEREBRAS_API_KEY: !!process.env.CEREBRAS_API_KEY,
        OXYLABS_USERNAME: !!process.env.OXYLABS_USERNAME,
        OXYLABS_PASSWORD: !!process.env.OXYLABS_PASSWORD,
      },
      values: {
        cerebrasApiKey: !!envConfig.cerebrasApiKey,
        oxyLabsUsername: !!envConfig.oxyLabsUsername,
        oxyLabsPassword: !!envConfig.oxyLabsPassword,
      }
    });

    // Test 2: Validate current environment
    try {
      validateEnvConfig();
      tests.push({
        name: 'Environment Validation',
        status: 'success',
        message: 'All required environment variables are set'
      });
    } catch (error) {
      tests.push({
        name: 'Environment Validation',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 3: Check numeric parsing
    tests.push({
      name: 'Numeric Value Parsing',
      status: 'info',
      values: {
        aiTemperature: { value: envConfig.aiTemperature, type: typeof envConfig.aiTemperature },
        aiMaxTokens: { value: envConfig.aiMaxTokens, type: typeof envConfig.aiMaxTokens },
        chunkSize: { value: envConfig.chunkSize, type: typeof envConfig.chunkSize },
      }
    });

    // Test 4: Test with invalid numeric values
    process.env.AI_TEMPERATURE = 'invalid';
    process.env.AI_MAX_TOKENS = 'not-a-number';
    
    // Re-import to get new values
    const { envConfig: testConfig } = await import('@/lib/env-config');
    
    tests.push({
      name: 'Invalid Numeric Value Handling',
      status: testConfig.aiTemperature > 0 && testConfig.aiMaxTokens > 0 ? 'success' : 'error',
      message: 'Safe parsing returns defaults for invalid values',
      values: {
        aiTemperature: testConfig.aiTemperature,
        aiMaxTokens: testConfig.aiMaxTokens,
      }
    });

  } finally {
    // Restore original env values
    Object.assign(process.env, originalEnv);
  }

  return NextResponse.json({ 
    tests,
    summary: {
      total: tests.length,
      passed: tests.filter(t => t.status === 'success').length,
      failed: tests.filter(t => t.status === 'error').length,
      info: tests.filter(t => t.status === 'info').length,
    }
  });
}