CREATE POLICY "public delete countries" ON public.countries FOR DELETE TO anon, authenticated USING (true);
GRANT DELETE ON public.countries TO anon, authenticated;