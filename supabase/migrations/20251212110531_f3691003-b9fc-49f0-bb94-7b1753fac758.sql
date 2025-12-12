-- Create labels table for storing user's label designs
CREATE TABLE public.labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  json_data JSONB NOT NULL,
  label_width NUMERIC NOT NULL,
  label_height NUMERIC NOT NULL,
  dpi INTEGER NOT NULL DEFAULT 203,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

-- Users can view their own labels
CREATE POLICY "Users can view their own labels" 
ON public.labels 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own labels
CREATE POLICY "Users can create their own labels" 
ON public.labels 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own labels
CREATE POLICY "Users can update their own labels" 
ON public.labels 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own labels
CREATE POLICY "Users can delete their own labels" 
ON public.labels 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_labels_updated_at
BEFORE UPDATE ON public.labels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();