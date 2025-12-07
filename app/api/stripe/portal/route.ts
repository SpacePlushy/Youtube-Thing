/**
 * Stripe Customer Portal API
 * Redirects users to manage their subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createPortalSession } from '@/lib/stripe';
import { getUserById } from '@/lib/db';

export async function POST(_request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await getUserById(session.user.id);

    if (!user?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account', message: 'No billing account found. Please subscribe first.' },
        { status: 400 }
      );
    }

    // Create portal session
    const baseUrl = process.env.NEXTAUTH_URL || 'https://youtubething.com';

    const portalSession = await createPortalSession({
      customerId: user.stripe_customer_id,
      returnUrl: `${baseUrl}/dashboard`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('[Stripe Portal] Error:', error);

    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
