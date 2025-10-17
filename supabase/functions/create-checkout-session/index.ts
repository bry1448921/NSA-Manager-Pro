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
    const { price_id } = await req.json();
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    let customerId: string | undefined;

    // Check if customer already exists in our DB
    const { data: customerData, error: customerError } = await supabaseClient
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (customerError && customerError.code !== 'PGRST116') { // PGRST116 means no rows found
      throw customerError;
    }

    if (customerData?.stripe_customer_id) {
      customerId = customerData.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const stripeCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = stripeCustomer.id;

      // Save new customer ID to our DB
      const { error: insertCustomerError } = await supabaseClient
        .from('customers')
        .insert({ id: user.id, stripe_customer_id: customerId });

      if (insertCustomerError) throw insertCustomerError;
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${req.headers.get('Origin')}/manage-subscription?success=true`,
      cancel_url: `${req.headers.get('Origin')}/pricing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
      },
    });

    return new Response(JSON.stringify({ url: checkoutSession.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Stripe Checkout Session Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});