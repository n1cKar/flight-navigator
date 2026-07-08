
-- countries
CREATE TABLE public.countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  agent_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.countries TO anon, authenticated;
GRANT ALL ON public.countries TO service_role;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- anyone can read country names (needed for admin dropdown); token is not sensitive per user's chosen model
CREATE POLICY "public read countries" ON public.countries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert countries" ON public.countries FOR INSERT TO anon, authenticated WITH CHECK (true);

-- clients
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  name TEXT NOT NULL,
  passport_number TEXT NOT NULL,
  arrival_date DATE,
  arrival_time TIME,
  departure_date DATE,
  departure_time TIME,
  airline TEXT,
  flight_number TEXT,
  pnr TEXT,
  departure_airport TEXT,
  arrival_airport TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO anon, authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- No anon SELECT policy on clients — reads happen server-side via token-gated server function.
CREATE POLICY "public insert clients" ON public.clients FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public update clients" ON public.clients FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public delete clients" ON public.clients FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX idx_clients_country ON public.clients(country_id);
CREATE INDEX idx_clients_batch ON public.clients(country_id, batch_number);

-- Seed countries
INSERT INTO public.countries (name) VALUES ('Romania'), ('Israel') ON CONFLICT DO NOTHING;
