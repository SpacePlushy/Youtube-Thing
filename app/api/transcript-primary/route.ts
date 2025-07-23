import { NextRequest } from 'next/server';
import { POST as OxylabsPOST } from '../transcript-oxylabs/route';

// Proxy to Oxylabs route while preserving middleware responses
export async function POST(request: NextRequest) {
  console.log('[Primary Route] Proxying to Oxylabs route');
  
  // The middleware will have already checked guest usage and potentially
  // returned a 403 response. If we get here, the request was allowed.
  return OxylabsPOST(request);
}