
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'agent');

-- 2. Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Organization',
  logo_url text,
  brand_primary_color text DEFAULT '#1a1a2e',
  brand_secondary_color text DEFAULT '#16213e',
  brand_font text DEFAULT 'Inter',
  website text,
  phone text,
  address text,
  industry text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create departments table
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- 5. Seed default organization
INSERT INTO public.organizations (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'My Organization');

-- 6. Alter profiles
ALTER TABLE public.profiles
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  ADD COLUMN department_id uuid REFERENCES public.departments(id),
  ADD COLUMN full_name text,
  ADD COLUMN avatar_url text;

UPDATE public.profiles SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS company_name,
  DROP COLUMN IF EXISTS brand_primary_color,
  DROP COLUMN IF EXISTS brand_secondary_color,
  DROP COLUMN IF EXISTS brand_font,
  DROP COLUMN IF EXISTS industry,
  DROP COLUMN IF EXISTS website,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS logo_url,
  DROP COLUMN IF EXISTS phone;

-- 7. Drop old clients RLS FIRST, then alter table
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

ALTER TABLE public.clients
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  ADD COLUMN created_by uuid;

UPDATE public.clients SET org_id = '00000000-0000-0000-0000-000000000001', created_by = user_id WHERE org_id IS NULL;
ALTER TABLE public.clients DROP COLUMN user_id;

-- 8. Alter proposals
ALTER TABLE public.proposals
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  ADD COLUMN department_id uuid REFERENCES public.departments(id);

UPDATE public.proposals SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

-- 9. Alter templates
ALTER TABLE public.templates
  ADD COLUMN org_id uuid REFERENCES public.organizations(id);

-- 10. Security definer functions
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 11. Update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, org_id)
  VALUES (NEW.id, '00000000-0000-0000-0000-000000000001');
  
  IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'agent');
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 13. Organizations RLS
CREATE POLICY "Org members can view their organization"
ON public.organizations FOR SELECT TO authenticated
USING (id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can update their organization"
ON public.organizations FOR UPDATE TO authenticated
USING (id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- 14. Departments RLS
CREATE POLICY "Org members can view departments"
ON public.departments FOR SELECT TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can insert departments"
ON public.departments FOR INSERT TO authenticated
WITH CHECK (org_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update departments"
ON public.departments FOR UPDATE TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete departments"
ON public.departments FOR DELETE TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- 15. User roles RLS
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all org roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
    AND p.org_id = public.get_user_org_id(auth.uid())
  )
);

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 16. Clients RLS (already dropped old ones above)
CREATE POLICY "Org members can view clients"
ON public.clients FOR SELECT TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update clients"
ON public.clients FOR UPDATE TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete clients"
ON public.clients FOR DELETE TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()));

-- 17. Proposals RLS
DROP POLICY IF EXISTS "Users can view their own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can insert their own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can update their own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can delete their own proposals" ON public.proposals;

CREATE POLICY "Users can view own proposals"
ON public.proposals FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all org proposals"
ON public.proposals FOR SELECT TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view org proposals"
ON public.proposals FOR SELECT TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can insert proposals"
ON public.proposals FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Users can update own proposals"
ON public.proposals FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own proposals"
ON public.proposals FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 18. Profiles RLS
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view org profiles"
ON public.profiles FOR SELECT TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- 19. Templates RLS
DROP POLICY IF EXISTS "Users can view default templates or their own" ON public.templates;
DROP POLICY IF EXISTS "Users can insert their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.templates;

CREATE POLICY "View default or org templates"
ON public.templates FOR SELECT TO authenticated
USING (is_default = true OR org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert templates"
ON public.templates FOR INSERT TO authenticated
WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update org templates"
ON public.templates FOR UPDATE TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can delete org templates"
ON public.templates FOR DELETE TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- 20. Updated_at trigger for organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 21. Give existing users admin role
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id)
ON CONFLICT (user_id, role) DO NOTHING;
