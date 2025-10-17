import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, first_name, last_name } = await req.json();

    if (!email || !first_name || !last_name) {
      return new Response('Missing email, first_name, or last_name', { status: 400, headers: corsHeaders });
    }

    // Create a Supabase client with the service role key for admin actions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the current user (the inviter/owner) from the request's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized: Missing Authorization header', { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: inviterUser }, error: inviterError } = await supabaseAdmin.auth.getUser(token);

    if (inviterError || !inviterUser) {
      console.error('Error getting inviter user:', inviterError?.message);
      return new Response('Unauthorized: Invalid token or user not found', { status: 401, headers: corsHeaders });
    }

    // Check if the inviter is an owner (owner_id is NULL in their profile)
    const { data: inviterProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('owner_id')
      .eq('id', inviterUser.id)
      .single();

    if (profileError || inviterProfile?.owner_id !== null) {
      console.error('Inviter is not an account owner or profile not found:', profileError?.message);
      return new Response('Forbidden: Only account owners can invite new users', { status: 403, headers: corsHeaders });
    }

    // Invite the new user
    const { data: invitedUserData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name: first_name,
        last_name: last_name,
      },
      redirectTo: `${req.headers.get('Origin')}/login`, // Redirect new user to login after email confirmation
    });

    if (inviteError) {
      console.error('Error inviting user:', inviteError.message);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const newUserId = invitedUserData.user?.id;
    if (!newUserId) {
      throw new Error('Invited user ID not found.');
    }

    // Create a profile entry for the new user, linking them to the inviter
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUserId,
        first_name: first_name,
        last_name: last_name,
        owner_id: inviterUser.id, // Link new user to the inviter
      });

    if (profileInsertError) {
      console.error('Error inserting new user profile:', profileInsertError.message);
      // Optionally, delete the invited user from auth.users if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: `Failed to create user profile: ${profileInsertError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'User invited successfully!', userId: newUserId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Edge Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});