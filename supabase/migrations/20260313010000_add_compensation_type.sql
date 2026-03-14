-- Add compensation_type and variable_component to contracts table
-- Supports: fixed, hourly, variable_goal, variable_deliverable, mixed

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS compensation_type TEXT NOT NULL DEFAULT 'fixed'
    CHECK (compensation_type IN ('fixed', 'hourly', 'variable_goal', 'variable_deliverable', 'mixed')),
  ADD COLUMN IF NOT EXISTS variable_component DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS goal_description TEXT DEFAULT NULL;

COMMENT ON COLUMN contracts.compensation_type IS 'Model of remuneration: fixed, hourly, variable_goal, variable_deliverable, mixed';
COMMENT ON COLUMN contracts.variable_component IS 'Variable portion for mixed compensation model';
COMMENT ON COLUMN contracts.goal_description IS 'Description of the meta/goal for variable_goal or variable_deliverable models';
