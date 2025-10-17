CREATE POLICY "Users can only see their own notary credentials" ON public.notary_credentials
FOR SELECT TO authenticated USING (auth.uid() = user_id);