/**
 * Stripe Checkout Session API
 * Creates a checkout session for Pro subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createCheckoutSession, getOrCreateCustomer, PLANS } from '@/lib/stripe';
import { getUserById, updateUserStripeCustomerId } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to upgrade' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json().catch(() => ({}));
    const priceId = body.priceId || PLANS.pro.priceId;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Price ID is required' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await getUserById(session.user.id);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await getOrCreateCustomer({
        email: session.user.email,
        name: session.user.name || undefined,
        userId: session.user.id,
      });

      customerId = customer.id;

      // Store customer ID
      await updateUserStripeCustomerId(session.user.id, customerId);
    }

    // Create checkout session
    const baseUrl = process.env.NEXTAUTH_URL || 'https://youtubething.com';

    const checkoutSession = await createCheckoutSession({
      customerId,
      priceId,
      userId: session.user.id,
      successUrl: `${baseUrl}/dashboard?checkout=success`,
      cancelUrl: `${baseUrl}/pricing?checkout=canceled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error);

    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
