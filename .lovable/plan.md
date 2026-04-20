

## Security Hardening Plan

The security scan found 8 findings (2 errors, 4 warnings, 2 info). The existing RLS foundation is solid — all tables have RLS enabled, roles are in a separate table, and `has_role()`/`get_user_org_id()` security definer functions exist. Here's what needs hardening:

### 1. Enable Leaked Password Protection
Configure auth to reject passwords found in known breach databases.

### 2. Add Password Protection for Shared Proposals (Error)
Shared proposals currently expose pricing and content to anyone with the link. Add optional password protection:
- **Migration**: Add `share_password_hash` column to `proposals` table
- **Edge function**: `verify-share-password` — accepts share_id + password, returns a signed short-lived token
- **Update RLS**: Keep existing public SELECT for non-password-protected proposals; password-protected ones require verification through the edge function
- **Frontend**: Update `PublicProposal.tsx` to show a password gate when `share_password_hash` is set; update `ProposalDetail.tsx` to let users set a share password

### 3. Add Share Link Expiration (Error)
- **Migration**: Add `share_expires_at` column to `proposals`
- **Update RLS**: Modify "Anyone can view shared proposals" policy to check `share_expires_at IS NULL OR share_expires_at > now()`
- **Frontend**: Add expiration date picker in proposal sharing UI

### 4. Restrict Client Contact Info by Role (Warning)
- Create a view `clients_public` that excludes `email` and `phone` for non-admin/manager users
- Or add role-based filtering in the application layer since all org members currently see all client fields

### 5. Anonymize IP in Proposal Events (Warning)
- Truncate IP addresses before storing (remove last octet) in `PublicProposal.tsx`
- Add a privacy notice to the public proposal page

### 6. Align Proposal Version Access with Proposal Access (Info)
- **Migration**: Update `proposal_versions` RLS to allow managers/admins to view versions of proposals they can access:
```sql
CREATE POLICY "Managers/admins can view org proposal versions"
ON proposal_versions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM proposals
  WHERE proposals.id = proposal_versions.proposal_id
  AND proposals.org_id = get_user_org_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
));
```

### 7. Add Role Change Audit Logging (Info)
- **Migration**: Create `audit_logs` table with RLS (admin SELECT only, insert via trigger)
- **Migration**: Add trigger on `user_roles` for INSERT/UPDATE/DELETE that logs changes to `audit_logs`

### 8. Input Validation & Frontend Security
- Sanitize all user inputs before database writes (proposal content, client notes)
- Add rate limiting awareness on auth pages (already handled by backend, but add UI feedback)
- Ensure no sensitive data in localStorage beyond the session token

### Files to Change
- **Migrations**: 3-4 migrations for schema changes (share_password_hash, share_expires_at, audit_logs table + trigger, updated RLS policies)
- **New edge function**: `verify-share-password`
- **`src/pages/PublicProposal.tsx`**: Password gate, IP anonymization, privacy notice
- **`src/pages/ProposalDetail.tsx`**: Share password + expiration UI
- **`src/pages/ProposalBuilder.tsx`**: Share expiration option
- **Auth config**: Enable leaked password protection

