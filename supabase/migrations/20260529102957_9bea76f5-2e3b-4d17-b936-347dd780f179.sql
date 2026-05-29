
-- Restrict service-role-only policies to service_role role (not public)
DROP POLICY IF EXISTS "Service role can manage fingerprints" ON public.device_fingerprints;
CREATE POLICY "Service role can manage fingerprints"
ON public.device_fingerprints
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own fingerprints" ON public.device_fingerprints;
CREATE POLICY "Users can view their own fingerprints"
ON public.device_fingerprints
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.user_subscriptions;
CREATE POLICY "Service role can manage subscriptions"
ON public.user_subscriptions
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Also scope labels policies to authenticated only
DROP POLICY IF EXISTS "Users can view their own labels" ON public.labels;
CREATE POLICY "Users can view their own labels" ON public.labels
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own labels" ON public.labels;
CREATE POLICY "Users can create their own labels" ON public.labels
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own labels" ON public.labels;
CREATE POLICY "Users can update their own labels" ON public.labels
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own labels" ON public.labels;
CREATE POLICY "Users can delete their own labels" ON public.labels
FOR DELETE TO authenticated USING (auth.uid() = user_id);
