/**
 * Stripe client configuration
 * Handles payment processing for Pro subscriptions
 */

import Stripe from 'stripe';

// Initialize Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Plan configuration
export const PLANS = {
  free: {
    name: 'Free',
    priceId: null,
    price: 0,
    dailyLimit: 5,
    features: [
      '5 transcripts per day',
      'Basic export (TXT)',
      'Standard processing',
    ],
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    price: 10,
    dailyLimit: Infinity,
    features: [
      'Unlimited transcripts',
      'Transcript history',
      'All export formats (TXT, SRT, VTT)',
      'Priority processing',
      'API access',
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;

/**
 * Get plan details by price ID
 */
export function getPlanByPriceId(priceId: string): PlanType | null {
  if (priceId === PLANS.pro.priceId) {
    return 'pro';
  }
  return null;
}

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    subscription_data: {
      metadata: {
        userId: params.userId,
      },
    },
    metadata: {
      userId: params.userId,
    },
  });
}

/**
 * Create a Stripe billing portal session
 */
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}) {
  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
}

/**
 * Create or get Stripe customer
 */
export async function getOrCreateCustomer(params: {
  email: string;
  name?: string;
  userId: string;
}) {
  // Check if customer already exists
  const existingCustomers = await stripe.customers.list({
    email: params.email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  return stripe.customers.create({
    email: params.email,
    name: params.name || undefined,
    metadata: {
      userId: params.userId,
    },
  });
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}
