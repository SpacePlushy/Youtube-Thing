import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Rate limit test successful!',
    timestamp: new Date().toISOString(),
  });
}