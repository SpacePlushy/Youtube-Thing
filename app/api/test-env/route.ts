import { NextResponse } from 'next/server';
import { envConfig, validateEnvConfig } from '@/lib/env-config';

export async function GET() {
  const tests = [];

  try {
    // Test 1: Check current state
    tests.push({
      name: 'Current Environment State',
      status: 'info',
      envVars: {
        OXYLABS_USERNAME: !!process.env.OXYLABS_USERNAME,
        OXYLABS_PASSWORD: !!process.env.OXYLABS_PASSWORD,
      },
      values: {
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

  } catch (error) {
    tests.push({
      name: 'Unexpected Error',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
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
