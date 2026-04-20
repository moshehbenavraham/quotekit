
-- Create proposal status enum
CREATE TYPE public.proposal_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected');

-- Create template category enum
CREATE TYPE public.template_category AS ENUM ('web_design', 'consulting', 'development', 'marketing', 'general');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  logo_url TEXT,
  brand_primary_color TEXT DEFAULT '#1a1a2e',
  brand_secondary_color TEXT DEFAULT '#16213e',
  brand_font TEXT DEFAULT 'Inter',
  industry TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Templates table
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category public.template_category NOT NULL DEFAULT 'general',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_pricing_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view default templates or their own" ON public.templates FOR SELECT USING (is_default = true OR auth.uid() = user_id);
CREATE POLICY "Users can insert their own templates" ON public.templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own templates" ON public.templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own templates" ON public.templates FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Proposals table
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Proposal',
  status public.proposal_status NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
  version_number INTEGER NOT NULL DEFAULT 1,
  share_id TEXT UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  tax_rate NUMERIC(5,2) DEFAULT 0,
  discount_total NUMERIC(12,2) DEFAULT 0,
  subtotal NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own proposals" ON public.proposals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own proposals" ON public.proposals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own proposals" ON public.proposals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own proposals" ON public.proposals FOR DELETE USING (auth.uid() = user_id);
-- Public access for shared proposals
CREATE POLICY "Anyone can view shared proposals" ON public.proposals FOR SELECT USING (share_id IS NOT NULL AND status != 'draft');

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Line items table
CREATE TABLE public.line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(5,2) DEFAULT 0,
  amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * rate * (1 - COALESCE(discount, 0) / 100)) STORED,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage line items of their proposals" ON public.line_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.proposals WHERE proposals.id = line_items.proposal_id AND proposals.user_id = auth.uid())
);
-- Public access for shared proposals
CREATE POLICY "Anyone can view line items of shared proposals" ON public.line_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.proposals WHERE proposals.id = line_items.proposal_id AND proposals.share_id IS NOT NULL AND proposals.status != 'draft')
);

-- Proposal versions table
CREATE TABLE public.proposal_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage versions of their proposals" ON public.proposal_versions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.proposals WHERE proposals.id = proposal_versions.proposal_id AND proposals.user_id = auth.uid())
);

-- Proposal events table (tracking)
CREATE TABLE public.proposal_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their proposals" ON public.proposal_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.proposals WHERE proposals.id = proposal_events.proposal_id AND proposals.user_id = auth.uid())
);
CREATE POLICY "Anyone can insert events for shared proposals" ON public.proposal_events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.proposals WHERE proposals.id = proposal_events.proposal_id AND proposals.share_id IS NOT NULL AND proposals.status != 'draft')
);

-- Create indexes
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_proposals_user_id ON public.proposals(user_id);
CREATE INDEX idx_proposals_client_id ON public.proposals(client_id);
CREATE INDEX idx_proposals_share_id ON public.proposals(share_id);
CREATE INDEX idx_proposals_status ON public.proposals(status);
CREATE INDEX idx_line_items_proposal_id ON public.line_items(proposal_id);
CREATE INDEX idx_proposal_events_proposal_id ON public.proposal_events(proposal_id);
CREATE INDEX idx_proposal_versions_proposal_id ON public.proposal_versions(proposal_id);

-- Logo storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

CREATE POLICY "Logo images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Users can upload their own logo" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own logo" ON storage.objects FOR UPDATE USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own logo" ON storage.objects FOR DELETE USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
