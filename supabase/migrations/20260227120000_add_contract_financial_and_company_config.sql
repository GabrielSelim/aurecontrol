-- Sprint 14: Add financial fields to contracts and config fields to companies

-- Contracts: escopo do serviço (rich text description)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS scope_description TEXT;

-- Contracts: periodicidade de pagamento
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'monthly';

-- Contracts: reajuste contratual
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS adjustment_index TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS adjustment_date DATE;

-- Companies: configurações padrão de contrato
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_template_id UUID REFERENCES contract_templates(id) ON DELETE SET NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_witness_count INTEGER DEFAULT 2;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_adjustment_policy TEXT;

-- Companies: email de boas-vindas customizável
ALTER TABLE companies ADD COLUMN IF NOT EXISTS welcome_email_template TEXT;
