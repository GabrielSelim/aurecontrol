-- Contract Goals / Deliverables
-- Used for variable compensation contracts (variable_goal, variable_deliverable, mixed)

CREATE TABLE IF NOT EXISTS contract_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_value DECIMAL(10,2),           -- monetary value to be unlocked when achieved
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'achieved', 'rejected', 'partial')),
  due_date DATE,
  achieved_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewer_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by contract
CREATE INDEX IF NOT EXISTS idx_contract_goals_contract_id ON contract_goals(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_goals_company_id ON contract_goals(company_id);

-- RLS
ALTER TABLE contract_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_goals_select" ON contract_goals
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contract_goals_insert" ON contract_goals
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contract_goals_update" ON contract_goals
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contract_goals_delete" ON contract_goals
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );
