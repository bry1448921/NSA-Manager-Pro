// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateTempPassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, first_name, last_name, job_role, supervisor, privileges } = await req.json();

    if (!email || !first_name || !last_name) {
      return new Response(JSON.stringify({ error: "Missing email, first_name, or last_name." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing Authorization header." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: inviterUser }, error: inviterError } = await supabaseAdmin.auth.getUser(token);

    if (inviterError || !inviterUser) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token or user not found." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Ensure inviter is an owner
    const { data: inviterProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, owner_id")
      .eq("id", inviterUser.id)
      .single();

    if (profileError || !inviterProfile || !(inviterProfile.role === "owner" && inviterProfile.owner_id === null)) {
      return new Response(JSON.stringify({ error: "Forbidden: Only account owners can create authorized users." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const tempPassword = generateTempPassword();

    // Create the auth user immediately (no invite email)
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        job_role,
        supervisor,
      },
    });

    if (createError || !created?.user?.id) {
      return new Response(JSON.stringify({ error: createError?.message || "Failed to create user." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const newUserId = created.user.id;

    // Insert profile as sub_user linked to inviter/owner, include privileges
    const { error: insertProfileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: newUserId,
        first_name,
        last_name,
        owner_id: inviterUser.id,
        role: "sub_user",
        is_active: true,
        job_role: job_role ?? null,
        supervisor: supervisor ?? null,
        privileges: Array.isArray(privileges) ? privileges : [],
      });

    if (insertProfileError) {
      // Roll back auth user if profile insert fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: `Failed to create profile: ${insertProfileError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({
      message: "Authorized user created successfully.",
      user_email: email,
      temp_password: tempPassword,
      user_id: newUserId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = (err as any)?.message ?? "Unexpected error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});