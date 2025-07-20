// This is a proxy route that forwards requests to the actual Deepgram route
// This allows us to hide the service name from client-side code
// export { POST } from '../transcript-deepgram/route';

// Temporary placeholder until Deepgram route is implemented
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ 
    error: 'Alternative transcript API 1 not yet implemented' 
  }, { status: 501 });
}