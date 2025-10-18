// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@16.2.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Missing Stripe-Signature or Webhook Secret', { status: 400, headers: corsHeaders });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = checkoutSession.subscription as string;
        const customerId = checkoutSession.customer as string;

        // Registration metadata collected pre-checkout
        const email = (checkoutSession.metadata?.supabase_user_email || checkoutSession.customer_details?.email) as string | undefined;
        const first_name = checkoutSession.metadata?.first_name as string | undefined;
        const last_name = checkoutSession.metadata?.last_name as string | undefined;
        const company = checkoutSession.metadata?.company as string | undefined;
        const phone_number = checkoutSession.metadata?.phone_number as string | undefined;
        const billing_address = checkoutSession.metadata?.billing_address as string | undefined;
        const password = checkoutSession.metadata?.password as string | undefined;

        if (!email || !subscriptionId || !customerId || !first_name || !last_name || !password) {
          throw new Error('Missing required registration metadata or IDs in checkout session.');
        }

        // 1) Create Supabase auth user (no email confirmation). Trigger will insert profile.
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            first_name,
            last_name,
            company,
            phone_number,
            billing_address,
          },
        });

        if (createError || !created?.user?.id) {
          throw new Error(createError?.message || 'Failed to create Supabase user after checkout.');
        }

        const userId = created.user.id;

        // 2) Update customer table with Stripe customer ID
        await supabaseAdmin
          .from('customers')
          .upsert({ id: userId, stripe_customer_id: customerId }, { onConflict: 'id' });

        // 3) Fetch subscription details from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ['default_payment_method', 'plan.product'],
        });

        // 4) Insert or update subscription in our DB
        await supabaseAdmin.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_subscription_id: stripeSubscription.id,
            status: stripeSubscription.status,
            price_id: stripeSubscription.items.data[0].price.id,
            current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: stripeSubscription.cancel_at_period_end,
          },
          { onConflict: 'stripe_subscription_id' }
        );
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const { data: existingSubscription } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (existingSubscription) {
          await supabaseAdmin.from('subscriptions').upsert(
            {
              user_id: existingSubscription.user_id,
              stripe_subscription_id: subscription.id,
              status: subscription.status,
              price_id: subscription.items.data[0].price.id,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            },
            { onConflict: 'stripe_subscription_id' }
          );
        }
        break;
      }

      default:
        console.warn(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook handler error:', (error as any)?.message);
    return new Response(JSON.stringify({ error: (error as any)?.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});