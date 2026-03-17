-- ============================================================
-- SEED APP DATA - AureControl (sem dependência de auth.users)
-- Executado pelo init-db.sh ANTES do GoTrue iniciar
-- ============================================================

-- 1. PRICING TIERS
INSERT INTO public.pricing_tiers (name, min_contracts, max_contracts, price_per_contract, is_active) VALUES
  ('Básico', 1, 10, 49.90, true),
  ('Profissional', 11, 50, 44.90, true),
  ('Empresarial', 51, 100, 39.90, true),
  ('Enterprise', 101, NULL, 34.90, true)
ON CONFLICT (min_contracts) DO NOTHING;

-- 2. SYSTEM SETTINGS
INSERT INTO public.system_settings (id, key, value, description) VALUES
  ('1601dc59-8e3a-46d6-8b6d-e54e6d1dbd42', 'billing_reminder_days', '{"days": 3}'::jsonb, 'Número de dias de antecedência para envio de lembretes de vencimento de faturas'),
  ('31028bfa-0d96-433e-ad91-2ec20018eeef', 'contract_expiration_alert_days', '{"days": 30}'::jsonb, 'Dias antes do vencimento para enviar alerta de contrato'),
  ('3adb7a40-8162-4184-abd0-73f29ed2190e', 'pj_contract_price', '{"amount": 49.9, "currency": "BRL"}'::jsonb, 'Preço base por contrato PJ ativo')
ON CONFLICT (key) DO NOTHING;

-- 3. COMPANIES
INSERT INTO public.companies (id, name, cnpj, email, phone, address, is_active) VALUES
  ('1434e608-53e0-48a1-98d0-4b985894a693', 'Tech Solutions Brasil Ltda', '11222333000181', 'contato@techsolutions.com.br', '11999887766', 'Av. Paulista, 1000, São Paulo - SP', true),
  ('49f55bb0-6fd7-44f7-96bd-758ce0c15f82', 'Inovação Digital ME', '11444777000161', 'contato@inovacaodigital.com.br', '21988776655', 'Rua Rio Branco, 500, Rio de Janeiro - RJ', true)
ON CONFLICT (id) DO NOTHING;

-- 4. INVITES (invited_by é NULL, sem FK para auth.users)
INSERT INTO public.invites (id, company_id, email, role, status, token, invited_by, accepted_at, expires_at) VALUES
  ('3a8506d5-7e06-4d42-bd8e-a63561964c0d', '1434e608-53e0-48a1-98d0-4b985894a693', 'admin.tech@teste.com', 'admin', 'accepted', 'token-admin-tech-001', NULL, '2025-12-17 21:12:59.828579+00', '2026-01-16 21:06:02.707632+00'),
  ('5a6d6025-2d23-4246-9708-dc3107b35f35', '1434e608-53e0-48a1-98d0-4b985894a693', 'financeiro.tech@teste.com', 'financeiro', 'accepted', 'token-fin-tech-001', NULL, '2025-12-17 21:14:46.440704+00', '2026-01-16 21:06:02.707632+00'),
  ('029dd833-05de-48dd-ae2c-561aa8000767', '1434e608-53e0-48a1-98d0-4b985894a693', 'gestor.tech@teste.com', 'gestor', 'accepted', 'token-gest-tech-001', NULL, '2025-12-17 23:09:22.988993+00', '2026-01-16 21:06:02.707632+00'),
  ('900dd0fb-0f57-4fc7-832f-62acdd7796c5', '1434e608-53e0-48a1-98d0-4b985894a693', 'colab.tech@teste.com', 'colaborador', 'accepted', 'token-colab-tech-001', NULL, '2025-12-17 23:10:17.130927+00', '2026-01-16 21:06:02.707632+00'),
  ('b3650ee6-09e0-491c-9fa7-b9d8a18998f4', '49f55bb0-6fd7-44f7-96bd-758ce0c15f82', 'admin.inov@teste.com', 'admin', 'accepted', 'token-admin-inov-001', NULL, '2025-12-17 23:22:26.26375+00', '2026-01-16 21:06:02.707632+00'),
  ('43621a94-01c5-4387-b83c-68cadc366bc4', '49f55bb0-6fd7-44f7-96bd-758ce0c15f82', 'financeiro.inov@teste.com', 'financeiro', 'accepted', 'token-fin-inov-001', NULL, '2025-12-17 23:23:44.575379+00', '2026-01-16 21:06:02.707632+00'),
  ('f0b765de-533c-4e98-9f84-2af0e64c53eb', '49f55bb0-6fd7-44f7-96bd-758ce0c15f82', 'colab.inov@teste.com', 'colaborador', 'accepted', 'token-colab-inov-001', NULL, '2025-12-17 23:31:26.640011+00', '2026-01-16 21:06:02.707632+00'),
  ('5ba4cd7a-5803-489e-adff-e82f46a475da', '49f55bb0-6fd7-44f7-96bd-758ce0c15f82', 'juridico@inovacao.com', 'juridico', 'accepted', 'token-juridico-inov-001', NULL, '2025-12-18 00:45:58.190967+00', '2025-12-25 00:45:14.530174+00'),
  ('a79cda1c-1f9a-4675-95cf-7f1c8418ed7f', '1434e608-53e0-48a1-98d0-4b985894a693', 'juridico@techsolutions.com', 'juridico', 'accepted', 'token-juridico-tech-001', NULL, '2025-12-18 00:50:20.501329+00', '2025-12-25 00:45:14.530174+00'),
  ('3e25db98-e08a-484e-869a-31a608174a8c', '49f55bb0-6fd7-44f7-96bd-758ce0c15f82', 'gestor.inov@teste.com', 'gestor', 'pending', 'token-gest-inov-001', NULL, NULL, '2026-01-16 21:06:02.707632+00')
ON CONFLICT (id) DO NOTHING;

-- 5. NOTIFICATION LOGS
INSERT INTO public.notification_logs (id, company_id, recipient_email, notification_type, subject, status, channel, metadata) VALUES
  ('7c5d71b4-46c9-450b-988d-9f04f5b2b49b', '1434e608-53e0-48a1-98d0-4b985894a693', 'admin.tech@teste.com', 'contract_expiration_alert', '1 contrato(s) próximo(s) do vencimento', 'sent', 'email', '{"alert_days": 30, "contracts_count": 1}'::jsonb)
ON CONFLICT (id) DO NOTHING;
