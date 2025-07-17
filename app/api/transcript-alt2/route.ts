// This is a proxy route that forwards requests to the actual Brightdata route
// This allows us to hide the service name from client-side code
// export { POST } from '../transcript-brightdata/route';

// Temporary placeholder until Brightdata route is implemented
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    error: 'Alternative transcript API 2 not yet implemented' 
  }, { status: 501 });
}