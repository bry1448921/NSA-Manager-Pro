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

  try {
    const { user_id, price_id } = await req.json();

    if (!user_id || !price_id) {
      return new Response('Missing user_id or price_id', { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin role of the caller (important for security)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized: Missing Authorization header', { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: callerError } = await supabaseAdmin.auth.getUser(token);

    if (callerError || !callerUser) {
      console.error('Error getting caller user:', callerError?.message);
      return new Response('Unauthorized: Invalid token or user not found', { status: 401, headers: corsHeaders });
    }

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single();

    if (profileError || callerProfile?.role !== 'admin') {
      console.error('Caller is not an admin:', profileError?.message);
      return new Response('Forbidden: Only administrators can create complimentary subscriptions', { status: 403, headers: corsHeaders });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get or create Stripe customer
    let customerId: string;
    const { data: customerData, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', user_id)
      .single();

    if (customerError && customerError.code !== 'PGRST116') { // PGRST116 means no rows found
      throw customerError;
    }

    if (customerData?.stripe_customer_id) {
      customerId = customerData.stripe_customer_id;
    } else {
      // Fetch user email to create new Stripe customer
      const { data: userAuthData, error: userAuthError } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (userAuthError || !userAuthData.user?.email) throw new Error('User email not found for Stripe customer creation.');

      const stripeCustomer = await stripe.customers.create({
        email: userAuthData.user.email,
        metadata: { supabase_user_id: user_id },
      });
      customerId = stripeCustomer.id;

      // Save new customer ID to our DB
      const { error: insertCustomerError } = await supabaseAdmin
        .from('customers')
        .insert({ id: user_id, stripe_customer_id: customerId });

      if (insertCustomerError) throw insertCustomerError;
    }

    // Create a new subscription for the customer
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price_id }],
      collection_method: 'charge_automatically', // Or 'send_invoice' if you want to manually manage
      billing_cycle_anchor: 'now', // Start billing cycle immediately
      proration_behavior: 'none', // No proration for comp subscriptions
      trial_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // Example: 30-day trial for comp
      // You might want to set a specific trial_end or metadata to mark it as a comp subscription
      metadata: {
        supabase_user_id: user_id,
        comp_subscription: 'true',
      },
    });

    // The stripe-webhook function will handle inserting/updating this subscription in your DB.

    // Fetch user email for response message
    const { data: userAuthData, error: userAuthError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (userAuthError) throw userAuthError;

    return new Response(JSON.stringify({
      message: 'Complimentary subscription created successfully',
      subscription_id: subscription.id,
      user_email: userAuthData.user?.email,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Stripe Comp Subscription Creation Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});