// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@16.2.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const body = await req.json();
    const priceId = body?.price_id as string | undefined;
    // Registration info passed from the client (no account yet)
    const email = body?.email as string | undefined;
    const first_name = body?.first_name as string | undefined;
    const last_name = body?.last_name as string | undefined;
    const company = body?.company as string | undefined;
    const phone_number = body?.phone_number as string | undefined;
    const billing_address = body?.billing_address as string | undefined;
    const password = body?.password as string | undefined;

    const successUrl = (body?.success_url as string | undefined) ?? "http://localhost:5173/checkout-success";
    const cancelUrl = (body?.cancel_url as string | undefined) ?? "http://localhost:5173/register";

    if (!priceId) {
      return new Response(JSON.stringify({ error: "Missing price_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!email || !first_name || !last_name || !password || !billing_address) {
      return new Response(JSON.stringify({ error: "Missing registration fields (email, first_name, last_name, password, billing_address)." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create a Stripe customer using the provided email
    const customer = await stripe.customers.create({
      email,
      metadata: {
        supabase_user_email: email,
        first_name,
        last_name,
        company: company ?? "",
        phone_number: phone_number ?? "",
        billing_address,
        password, // used by webhook to create the Supabase account
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      // replicate metadata on the session as well
      metadata: {
        supabase_user_email: email,
        first_name,
        last_name,
        company: company ?? "",
        phone_number: phone_number ?? "",
        billing_address,
        password,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout-session error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});