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
    const { user_id, customer_id, new_price_id } = await req.json();

    if (!user_id || !customer_id || !new_price_id) {
      return new Response('Missing user_id, customer_id, or new_price_id', { status: 400, headers: corsHeaders });
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
      return new Response('Forbidden: Only administrators can update subscriptions', { status: 403, headers: corsHeaders });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get the user's current subscription
    const { data: currentSubscriptionData, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user_id)
      .single();

    if (subError || !currentSubscriptionData?.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: 'User does not have an active subscription to update.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const stripeSubscriptionId = currentSubscriptionData.stripe_subscription_id;

    // Retrieve the current Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    // Update the subscription with the new price
    const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false, // Ensure it doesn't cancel
      items: [{
        id: stripeSubscription.items.data[0].id, // ID of the current subscription item
        price: new_price_id,
      }],
      proration_behavior: 'always_invoice', // Or 'create_prorations' depending on desired behavior
    });

    // Fetch user email for response message
    const { data: userAuthData, error: userAuthError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (userAuthError) throw userAuthError;

    return new Response(JSON.stringify({
      message: 'Subscription updated successfully',
      subscription_id: updatedSubscription.id,
      user_email: userAuthData.user?.email,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Stripe Subscription Update Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});