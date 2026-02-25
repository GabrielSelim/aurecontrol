
-- Add new contract status values to the enum
ALTER TYPE public.contract_status ADD VALUE IF NOT EXISTS 'enviado';
ALTER TYPE public.contract_status ADD VALUE IF NOT EXISTS 'assinado';
