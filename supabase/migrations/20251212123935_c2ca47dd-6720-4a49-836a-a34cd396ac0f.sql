-- Add user-scoped RLS policy for device_fingerprints table
-- Users can only view their own fingerprints

CREATE POLICY "Users can view their own fingerprints" 
ON public.device_fingerprints 
FOR SELECT 
USING (auth.uid() = user_id);