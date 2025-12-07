/**
 * Stripe Webhook Handler
 * Processes subscription events from Stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { updateUserSubscription } from '@/lib/db';
import type Stripe from 'stripe';

// Disable body parsing for webhook signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('[Stripe Webhook] Missing signature');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('[Stripe Webhook] Signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      // Checkout completed - user subscribed
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === 'subscription' && session.customer && session.subscription) {
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          await updateUserSubscription(customerId, {
            tier: 'pro',
            status: 'active',
            subscriptionId: subscriptionId,
            periodEnd: new Date(subscription.current_period_end * 1000),
          });

          console.log(`[Stripe Webhook] User ${customerId} subscribed to Pro`);
        }
        break;
      }

      // Subscription updated (renewal, plan change, etc.)
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Map Stripe status to our status
        let status: 'active' | 'inactive' | 'canceled' | 'past_due' = 'inactive';
        if (subscription.status === 'active') status = 'active';
        else if (subscription.status === 'past_due') status = 'past_due';
        else if (subscription.status === 'canceled') status = 'canceled';

        // Check if subscription is actually canceled (cancel_at_period_end)
        if (subscription.cancel_at_period_end) {
          status = 'canceled';
        }

        await updateUserSubscription(customerId, {
          tier: status === 'active' || status === 'canceled' ? 'pro' : 'free',
          status,
          subscriptionId: subscription.id,
          periodEnd: new Date(subscription.current_period_end * 1000),
        });

        console.log(`[Stripe Webhook] Subscription updated for ${customerId}: ${status}`);
        break;
      }

      // Subscription deleted (expired or canceled)
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await updateUserSubscription(customerId, {
          tier: 'free',
          status: 'inactive',
          subscriptionId: null,
          periodEnd: null,
        });

        console.log(`[Stripe Webhook] Subscription deleted for ${customerId}`);
        break;
      }

      // Payment failed
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (customerId) {
          await updateUserSubscription(customerId, {
            tier: 'pro', // Keep pro tier but mark as past_due
            status: 'past_due',
            subscriptionId: invoice.subscription as string | null,
            periodEnd: null,
          });

          console.log(`[Stripe Webhook] Payment failed for ${customerId}`);
        }
        break;
      }

      // Invoice paid (renewal success)
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (customerId && invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );

          await updateUserSubscription(customerId, {
            tier: 'pro',
            status: 'active',
            subscriptionId: subscription.id,
            periodEnd: new Date(subscription.current_period_end * 1000),
          });

          console.log(`[Stripe Webhook] Invoice paid for ${customerId}`);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
