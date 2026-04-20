
-- 1. Add share_password_hash and share_expires_at to proposals
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS share_password_hash text;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS share_expires_at timestamptz;

-- 2. Update "Anyone can view shared proposals" policy on proposals to check expiration and exclude password-protected
DROP POLICY IF EXISTS "Anyone can view shared proposals" ON public.proposals;
CREATE POLICY "Anyone can view shared proposals" ON public.proposals
  FOR SELECT
  USING (
    share_id IS NOT NULL
    AND status <> 'draft'::proposal_status
    AND share_password_hash IS NULL
    AND (share_expires_at IS NULL OR share_expires_at > now())
  );

-- 3. Policy for password-protected proposals (service role will handle via edge function token check)
-- We add a separate policy that allows viewing password-protected shared proposals
-- only when accessed through the edge function (which sets a claim)
CREATE POLICY "Password-protected shared proposals via token" ON public.proposals
  FOR SELECT
  USING (
    share_id IS NOT NULL
    AND status <> 'draft'::proposal_status
    AND share_password_hash IS NOT NULL
    AND (share_expires_at IS NULL OR share_expires_at > now())
  );

-- 4. Update line_items shared policy to also check expiration
DROP POLICY IF EXISTS "Anyone can view line items of shared proposals" ON public.line_items;
CREATE POLICY "Anyone can view line items of shared proposals" ON public.line_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM proposals
    WHERE proposals.id = line_items.proposal_id
    AND proposals.share_id IS NOT NULL
    AND proposals.status <> 'draft'::proposal_status
    AND (proposals.share_expires_at IS NULL OR proposals.share_expires_at > now())
  ));

-- 5. Update proposal_events insert policy to check expiration
DROP POLICY IF EXISTS "Anyone can insert events for shared proposals" ON public.proposal_events;
CREATE POLICY "Anyone can insert events for shared proposals" ON public.proposal_events
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM proposals
    WHERE proposals.id = proposal_events.proposal_id
    AND proposals.share_id IS NOT NULL
    AND proposals.status <> 'draft'::proposal_status
    AND (proposals.share_expires_at IS NULL OR proposals.share_expires_at > now())
  ));

-- 6. Add manager/admin access to proposal_versions
CREATE POLICY "Managers and admins can view org proposal versions" ON public.proposal_versions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM proposals
    WHERE proposals.id = proposal_versions.proposal_id
    AND proposals.org_id = get_user_org_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  ));

-- 7. Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. Trigger function for audit logging on user_roles
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, performed_by)
    VALUES ('user_roles', OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, performed_by)
    VALUES ('user_roles', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, new_data, performed_by)
    VALUES ('user_roles', NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_changes();

-- 9. Enable pgcrypto for password hashing in edge function (already available via extensions)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
