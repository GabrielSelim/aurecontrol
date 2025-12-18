-- Add address field to profiles table for contract purposes
ALTER TABLE public.profiles 
ADD COLUMN address text;

COMMENT ON COLUMN public.profiles.address IS 'Employee address for contract purposes';