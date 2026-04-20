
-- Create hash_share_password function using extensions schema for pgcrypto
CREATE OR REPLACE FUNCTION public.hash_share_password(_password text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT extensions.crypt(_password, extensions.gen_salt('bf'))
$$;

-- Create verify_share_password function
CREATE OR REPLACE FUNCTION public.verify_share_password(_share_id text, _password text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proposals
    WHERE share_id = _share_id
    AND share_password_hash = extensions.crypt(_password, share_password_hash)
  )
$$;
