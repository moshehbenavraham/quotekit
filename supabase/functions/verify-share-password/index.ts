import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { share_id, password } = await req.json();

    if (!share_id || !password) {
      return new Response(
        JSON.stringify({ error: "share_id and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role — this is the ONLY way to access password-protected proposals
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch proposal metadata first (minimal fields, service role bypasses RLS)
    const { data: proposal, error } = await supabase
      .from("proposals")
      .select("id, share_id, share_password_hash, share_expires_at, status")
      .eq("share_id", share_id)
      .neq("status", "draft")
      .single();

    if (error || !proposal) {
      return new Response(
        JSON.stringify({ error: "Proposal not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (proposal.share_expires_at && new Date(proposal.share_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This share link has expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!proposal.share_password_hash) {
      return new Response(
        JSON.stringify({ error: "This proposal is not password-protected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit check: block if too many recent failed attempts
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recentFailures } = await supabase
      .from("proposal_events")
      .select("*", { count: "exact", head: true })
      .eq("proposal_id", proposal.id)
      .eq("event_type", "password_failed")
      .gte("created_at", fifteenMinAgo);

    if (recentFailures && recentFailures >= 10) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "900" } }
      );
    }

    // Verify password using pgcrypto via security definer function
    const { data: match } = await supabase.rpc("verify_share_password", {
      _share_id: share_id,
      _password: password,
    });

    if (!match) {
      // Rate limit: delay failed responses by 1.5s to throttle brute-force attempts
      await new Promise((r) => setTimeout(r, 1500));

      // Track failed attempts per share_id
      await supabase.from("proposal_events").insert({
        proposal_id: proposal.id,
        event_type: "password_failed",
        user_agent: req.headers.get("user-agent") ?? null,
      });

      // Check recent failed attempts — lock out after 10 failures in 15 minutes
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("proposal_events")
        .select("*", { count: "exact", head: true })
        .eq("proposal_id", proposal.id)
        .eq("event_type", "password_failed")
        .gte("created_at", fifteenMinAgo);

      if (count && count >= 10) {
        return new Response(
          JSON.stringify({ error: "Too many attempts. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "900" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Incorrect password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Password correct — fetch full proposal data + related records using service role
    // IMPORTANT: Explicitly exclude share_password_hash from the response
    const [proposalFull, lineItemsResult, orgResult] = await Promise.all([
      supabase
        .from("proposals")
        .select(
          "id, title, status, content, pricing, subtotal, total, tax_rate, discount_total, " +
          "valid_until, notes, share_id, share_expires_at, created_at, updated_at, " +
          "org_id, department_id, user_id, version_number, client_id, template_id, clients(name)"
        )
        .eq("id", proposal.id)
        .single(),
      supabase
        .from("line_items")
        .select("*")
        .eq("proposal_id", proposal.id)
        .order("sort_order"),
      supabase
        .from("proposals")
        .select("org_id")
        .eq("id", proposal.id)
        .single(),
    ]);

    // Fetch org branding separately
    let org = null;
    if (orgResult.data?.org_id) {
      const { data: o } = await supabase
        .from("organizations")
        .select("name, logo_url, brand_primary_color")
        .eq("id", orgResult.data.org_id)
        .single();
      org = o;
    }

    // Log view event (server-side, no client IP stored)
    await supabase.from("proposal_events").insert({
      proposal_id: proposal.id,
      event_type: "viewed",
      user_agent: req.headers.get("user-agent") ?? null,
    });

    return new Response(
      JSON.stringify({
        proposal: proposalFull.data,
        lineItems: lineItemsResult.data ?? [],
        org,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
