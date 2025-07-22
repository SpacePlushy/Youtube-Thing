// This is a proxy route that forwards requests to the actual Brightdata Proxy route
// This allows us to hide the service name from client-side code
// export { POST } from '../transcript-brightdata-proxy/route';

// Temporary placeholder until Brightdata Proxy route is implemented
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  return NextResponse.json({ 
    error: 'Alternative transcript API 3 not yet implemented' 
  }, { status: 501 });
}