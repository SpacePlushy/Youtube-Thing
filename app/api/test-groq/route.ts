import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function GET(request: NextRequest) {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (!groqApiKey) {
    return NextResponse.json({ 
      error: 'GROQ_API_KEY not configured',
      hint: 'Please set GROQ_API_KEY in your .env.local file or Vercel environment variables'
    }, { status: 500 });
  }
  
  // Log key presence for debugging
  console.log('[Groq Test] API Key present, first 10 chars:', groqApiKey.substring(0, 10) + '...');
  
  try {
    // Initialize Groq client
    const groq = new Groq({
      apiKey: groqApiKey,
    });
    
    // Test with a simple prompt
    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Groq is working!" in 5 words or less.' }
      ],
      temperature: 0.1,
      max_tokens: 50,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Groq API is working!',
      response: chatCompletion.choices[0].message.content,
      model: chatCompletion.model,
      usage: chatCompletion.usage
    });
    
  } catch (error) {
    console.error('[Groq Test] Error:', error);
    
    // Check for authentication errors
    if (error instanceof Error && error.message.includes('401')) {
      return NextResponse.json({ 
        error: 'Invalid API Key',
        message: 'The GROQ_API_KEY is invalid. Please check your Vercel environment variables.',
        hint: 'Go to Vercel Dashboard → Settings → Environment Variables and verify GROQ_API_KEY is correct',
        details: error.message
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to connect to Groq',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}