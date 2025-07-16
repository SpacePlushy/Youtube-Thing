import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const oxylabsUser = process.env.OXYLABS_USERNAME;
    const oxylabsPass = process.env.OXYLABS_PASSWORD;
    
    return NextResponse.json({
      environment: {
        groq_api_key: groqKey ? `${groqKey.substring(0, 10)}...` : 'NOT SET',
        gemini_api_key: geminiKey ? `${geminiKey.substring(0, 10)}...` : 'NOT SET',
        oxylabs_username: oxylabsUser ? `${oxylabsUser.substring(0, 5)}...` : 'NOT SET',
        oxylabs_password: oxylabsPass ? 'SET' : 'NOT SET'
      },
      status: 'Environment check complete',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check environment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}