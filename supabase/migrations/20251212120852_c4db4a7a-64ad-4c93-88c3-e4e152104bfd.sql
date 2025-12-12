-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('trial', 'active', 'cancelled', 'expired');

-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status subscription_status NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create device_fingerprints table for anti-abuse
CREATE TABLE public.device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fingerprint)
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
ON public.user_subscriptions FOR ALL
USING (true)
WITH CHECK (true);

-- RLS policies for device_fingerprints (only service role can access)
CREATE POLICY "Service role can manage fingerprints"
ON public.device_fingerprints FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create subscription on user signup (called via trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, status, trial_ends_at)
  VALUES (NEW.id, 'trial', NOW() + INTERVAL '14 days');
  RETURN NEW;
END;
$$;

-- Trigger to auto-create subscription when user signs up
CREATE TRIGGER on_auth_user_created_subscription
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_subscription();

-- Function to check if fingerprint exists with expired trial
CREATE OR REPLACE FUNCTION public.check_fingerprint_abuse(p_fingerprint TEXT)
RETURNS TABLE(is_blocked BOOLEAN, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_subscription_status subscription_status;
  v_trial_ends_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check if fingerprint exists
  SELECT df.user_id INTO v_user_id
  FROM device_fingerprints df
  WHERE df.fingerprint = p_fingerprint;
  
  IF v_user_id IS NOT NULL THEN
    -- Check subscription status
    SELECT us.status, us.trial_ends_at INTO v_subscription_status, v_trial_ends_at
    FROM user_subscriptions us
    WHERE us.user_id = v_user_id;
    
    -- Block if trial expired and not active subscriber
    IF v_subscription_status = 'trial' AND v_trial_ends_at < NOW() THEN
      RETURN QUERY SELECT true, 'Ta naprava je že bila uporabljena za brezplačen preizkus.'::TEXT;
      RETURN;
    END IF;
    
    IF v_subscription_status = 'expired' THEN
      RETURN QUERY SELECT true, 'Ta naprava je že bila uporabljena za brezplačen preizkus.'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  RETURN QUERY SELECT false, NULL::TEXT;
END;
$$;