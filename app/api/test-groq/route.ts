import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function GET(request: NextRequest) {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (!groqApiKey) {
    return NextResponse.json({ 
      error: 'GROQ_API_KEY not configured',
      hint: 'Please set GROQ_API_KEY in your .env.local file'
    }, { status: 500 });
  }
  
  try {
    // Initialize Groq client
    const groq = new Groq({
      apiKey: groqApiKey,
    });
    
    // Test with a simple prompt
    const chatCompletion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
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
    return NextResponse.json({ 
      error: 'Failed to connect to Groq',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}