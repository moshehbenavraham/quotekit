
-- Drop the broken policy that exposes password-protected proposals to anyone
DROP POLICY IF EXISTS "Password-protected shared proposals via token" ON public.proposals;

-- Tighten the public share policy to only allow non-password-protected proposals
-- (already correct but explicitly re-state for clarity)
-- The "Anyone can view shared proposals" policy already gates on share_password_hash IS NULL
-- so no change needed there.

-- Also block direct line_items access for password-protected proposals
-- (line_items had its own policy that allowed access if parent proposal's share_id exists)
DROP POLICY IF EXISTS "Anyone can view line items of shared proposals" ON public.line_items;

CREATE POLICY "Anyone can view line items of shared proposals"
ON public.line_items FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM proposals
    WHERE proposals.id = line_items.proposal_id
      AND proposals.share_id IS NOT NULL
      AND proposals.status <> 'draft'
      AND proposals.share_password_hash IS NULL
      AND (proposals.share_expires_at IS NULL OR proposals.share_expires_at > now())
  )
);
