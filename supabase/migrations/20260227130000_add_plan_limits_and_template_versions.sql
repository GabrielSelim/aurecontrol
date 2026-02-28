-- Sprint 15: Plan & Limits for companies + Template version history

-- Companies: plan and limits fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'starter';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS max_collaborators INTEGER DEFAULT 10;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_expires_at DATE;

-- Template version history table
CREATE TABLE IF NOT EXISTS contract_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  saved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient version lookups
CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON contract_template_versions(template_id, version_number DESC);

-- RLS policies for template versions
ALTER TABLE contract_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template versions for their company templates"
  ON contract_template_versions FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM contract_templates
      WHERE company_id IN (
        SELECT company_id FROM profiles WHERE user_id = auth.uid()
      ) OR is_system_default = true
    )
  );

CREATE POLICY "Users can insert template versions for their company templates"
  ON contract_template_versions FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT id FROM contract_templates
      WHERE company_id IN (
        SELECT company_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );
