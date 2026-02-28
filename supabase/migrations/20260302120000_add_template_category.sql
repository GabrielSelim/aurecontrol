-- Add category column to contract_templates
ALTER TABLE contract_templates
ADD COLUMN IF NOT EXISTS category text;

-- Add comment
COMMENT ON COLUMN contract_templates.category IS 'Template category: pj, clt, nda, parceria, aditivo, outro';
