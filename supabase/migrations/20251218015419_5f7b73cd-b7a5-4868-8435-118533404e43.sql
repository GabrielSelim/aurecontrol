-- Add duration fields for flexible PJ contracts
ALTER TABLE public.contracts
ADD COLUMN duration_type text DEFAULT 'indefinite',
ADD COLUMN duration_value integer,
ADD COLUMN duration_unit text DEFAULT 'months',
ADD COLUMN deliverable_description text;

-- Add comment for documentation
COMMENT ON COLUMN public.contracts.duration_type IS 'Type of contract duration: time_based, delivery_based, indefinite';
COMMENT ON COLUMN public.contracts.duration_value IS 'Numeric value for time-based duration';
COMMENT ON COLUMN public.contracts.duration_unit IS 'Unit for time-based duration: days, weeks, months, years';
COMMENT ON COLUMN public.contracts.deliverable_description IS 'Description of deliverable for delivery-based contracts';