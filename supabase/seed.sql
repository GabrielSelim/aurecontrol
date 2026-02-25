-- ============================================================
-- SEED DATA - AureControl
-- Gerado em: 2026-02-25
-- ============================================================
-- IMPORTANTE: Este seed deve ser executado APÓS todas as migrations.
-- Os dados de auth.users NÃO são incluídos aqui (gerenciados pelo Supabase Auth).
-- As senhas dos usuários de teste precisam ser recriadas manualmente.
-- ============================================================

-- 1. PRICING TIERS
INSERT INTO public.pricing_tiers (id, name, min_contracts, max_contracts, price_per_contract, is_active) VALUES
  ('8f88c5cd-c31a-40af-87a6-cc8ce95e83b8', 'Básico', 1, 10, 49.90, true),
  ('d2895b4b-6a7d-4587-a887-2d7e3c2c86db', 'Profissional', 11, 50, 44.90, true),
  ('4b201668-b7a2-41e1-8beb-d0640b6ceacc', 'Empresarial', 51, 100, 39.90, true),
  ('d1e8764f-9204-43be-a07d-a99cab54087c', 'Enterprise', 101, NULL, 34.90, true)
ON CONFLICT (id) DO NOTHING;

-- 2. SYSTEM SETTINGS
INSERT INTO public.system_settings (id, key, value, description) VALUES
  ('1601dc59-8e3a-46d6-8b6d-e54e6d1dbd42', 'billing_reminder_days', '{"days": 3}'::jsonb, 'Número de dias de antecedência para envio de lembretes de vencimento de faturas'),
  ('31028bfa-0d96-433e-ad91-2ec20018eeef', 'contract_expiration_alert_days', '{"days": 30}'::jsonb, 'Dias antes do vencimento para enviar alerta de contrato'),
  ('3adb7a40-8162-4184-abd0-73f29ed2190e', 'pj_contract_price', '{"amount": 49.9, "currency": "BRL"}'::jsonb, 'Preço base por contrato PJ ativo')
ON CONFLICT (id) DO NOTHING;

-- 3. COMPANIES
INSERT INTO public.companies (id, name, cnpj, email, phone, address, is_active) VALUES
  ('1434e608-53e0-48a1-98d0-4b985894a693', 'Tech Solutions Brasil Ltda', '11222333000181', 'contato@techsolutions.com.br', '11999887766', 'Av. Paulista, 1000, São Paulo - SP', true),
  ('49f55bb0-6fd7-44f7-96bd-758ce0c15f82', 'Inovação Digital ME', '11444777000161', 'contato@inovacaodigital.com.br', '21988776655', 'Rua Rio Branco, 500, Rio de Janeiro - RJ', true)
ON CONFLICT (id) DO NOTHING;

-- 4. PROFILES
-- NOTA: Os user_id abaixo correspondem a usuários em auth.users que precisam existir previamente.
-- Usuários de teste:
--   ee2f5a8c-358a-4e11-b687-8e5b5a60cfae = eng.gabrielsanz@hotmail.com (master_admin)
--   dfde18db-baf2-4477-908b-eb23658f2cf6 = admin.tech@teste.com (admin - Tech Solutions)
--   c6310333-ffc3-46e5-badd-6825b981524d = financeiro.tech@teste.com (financeiro - Tech Solutions)
--   39a3f7b4-616a-40fe-b3d8-5c7ad0ea4f2a = gestor.tech@teste.com (gestor - Tech Solutions)
--   db58c284-3974-4b78-b68a-9e53f95fe6b5 = colab.tech@teste.com (colaborador - Tech Solutions)
--   04e8de50-c456-44d9-a49f-2e39260522be = admin.inov@teste.com (admin - Inovação Digital)
--   b0e5dbae-9a5b-48dc-9fe3-12ad5de61aa1 = financeiro.inov@teste.com (financeiro - Inovação Digital)
--   9ed24ebf-8f93-4895-b63a-8697c9847afc = colab.inov@teste.com (colaborador - Inovação Digital)
--   7627daf7-0458-4aaa-877c-7a32cc8090d3 = juridico@inovacao.com (juridico - Inovação Digital)
--   8df9f69f-7076-4347-8f87-800270a795fc = juridico@techsolutions.com (juridico - Tech Solutions)

INSERT INTO public.profiles (id, user_id, email, full_name, cpf, phone, company_id, is_active,
  address_cep, address_city, address_complement, address_neighborhood, address_number, address_state, address_street,
  birth_date, nationality, marital_status, identity_number, identity_issuer, profession,
  pj_cnpj, pj_razao_social, pj_nome_fantasia) VALUES
  -- Master Admin
  ('6e1d9d6d-5278-441d-86df-44f76eb2fdd9', 'ee2f5a8c-358a-4e11-b687-8e5b5a60cfae', 'eng.gabrielsanz@hotmail.com', 'Gabriel Sanz Selim de Sales', '01863625100', '67998231019', NULL, true,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  -- Admin Tech Solutions
  ('59fce32f-7008-4257-b799-bce15eeae336', 'dfde18db-baf2-4477-908b-eb23658f2cf6', 'admin.tech@teste.com', 'Sarah Isabela Brito', '371.341.291-01', '(67) 98199-9236', '1434e608-53e0-48a1-98d0-4b985894a693', true,
    '79041490', 'Campo Grande', 'Apto 14 Bloco 11', 'Tiradentes', '354', 'MS', 'Rua Dona Ziza',
    '1983-09-27', 'Brasileira', 'Casada', '42.198.631-1', 'sspms', 'C.E.O', NULL, NULL, NULL),
  -- Financeiro Tech Solutions
  ('54735bbf-610e-4928-b97a-362ef8bd9fc1', 'c6310333-ffc3-46e5-badd-6825b981524d', 'financeiro.tech@teste.com', 'Isadora Bárbara Mariane Araújo', '28989490197', '67984506730', '1434e608-53e0-48a1-98d0-4b985894a693', true,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  -- Gestor Tech Solutions
  ('7cd87e79-d988-4727-aa60-e221a0fb0cdc', '39a3f7b4-616a-40fe-b3d8-5c7ad0ea4f2a', 'gestor.tech@teste.com', 'Amanda Mariana Corte Real', '62150836157', '67997342004', '1434e608-53e0-48a1-98d0-4b985894a693', true,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  -- Colaborador Tech Solutions
  ('f1219c00-7647-469c-8067-81e9913ab447', 'db58c284-3974-4b78-b68a-9e53f95fe6b5', 'colab.tech@teste.com', 'Pietro Elias Alves', '377.787.811-15', '(67) 99631-9987', '1434e608-53e0-48a1-98d0-4b985894a693', true,
    '79041450', 'Campo Grande', NULL, 'Tiradentes', '354', 'MS', 'Rua Altair Correa Lima',
    '1978-05-12', 'Brasileiro', 'Casado', '42.093.445-5', 'ssp', NULL, '67727612000151', 'Vitor e Sérgio Gráfica Ltda', 'Vitor e Sérgio Gráfica Ltda'),
  -- Admin Inovação Digital
  ('447e18b0-13fc-454e-a4a2-c6769500267e', '04e8de50-c456-44d9-a49f-2e39260522be', 'admin.inov@teste.com', 'Emanuelly Alana Laís Oliveira', '14433308170', '67985163707', '49f55bb0-6fd7-44f7-96bd-758ce0c15f82', true,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  -- Financeiro Inovação Digital
  ('efd495fa-1d00-4390-91b6-841fbd7eeeb2', 'b0e5dbae-9a5b-48dc-9fe3-12ad5de61aa1', 'financeiro.inov@teste.com', 'Isadora Alessandra Priscila Cardoso', '83759393152', '67983971161', '49f55bb0-6fd7-44f7-96bd-758ce0c15f82', true,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 5. USER ROLES
INSERT INTO public.user_roles (id, user_id, role) VALUES
  ('b3478991-6df8-4047-bddc-3c09e0726b03', 'ee2f5a8c-358a-4e11-b687-8e5b5a60cfae', 'master_admin'),
  ('2b522616-e269-4b32-999a-8fcca8488377', 'dfde18db-baf2-4477-908b-eb23658f2cf6', 'admin'),
  ('0ded6f9a-b10b-42f4-8982-4fd91768feae', 'c6310333-ffc3-46e5-badd-6825b981524d', 'financeiro'),
  ('fa8e3703-da50-4fed-b7ad-d545ec2bd745', '39a3f7b4-616a-40fe-b3d8-5c7ad0ea4f2a', 'gestor'),
  ('cd388a8f-fec3-43ed-9170-50cc41f11a03', 'db58c284-3974-4b78-b68a-9e53f95fe6b5', 'colaborador'),
  ('c1bb525e-c722-46f0-ad08-fa1529e12991', '04e8de50-c456-44d9-a49f-2e39260522be', 'admin'),
  ('3df34eff-e563-49de-b05b-5374742f3105', 'b0e5dbae-9a5b-48dc-9fe3-12ad5de61aa1', 'financeiro'),
  ('07ecac2a-b541-4571-9781-ca78251103cd', '9ed24ebf-8f93-4895-b63a-8697c9847afc', 'colaborador'),
  ('69ec1709-1675-41d3-8067-59007458560f', '7627daf7-0458-4aaa-877c-7a32cc8090d3', 'juridico'),
  ('b4238b75-93e0-44ba-a9d0-b4c331a61db8', '8df9f69f-7076-4347-8f87-800270a795fc', 'juridico')
ON CONFLICT (id) DO NOTHING;

-- 6. CONTRACTS
INSERT INTO public.contracts (id, company_id, user_id, contract_type, job_title, salary, start_date, end_date, status, created_by, duration_type, duration_unit, duration_value, department) VALUES
  ('5abecffc-54b2-4374-9554-07ccd211d938', '1434e608-53e0-48a1-98d0-4b985894a693', 'db58c284-3974-4b78-b68a-9e53f95fe6b5', 'PJ', 'Desenvolvedor Back-end', 7777.00, '2025-12-18', '2026-06-18', 'active', 'dfde18db-baf2-4477-908b-eb23658f2cf6', 'time_based', 'months', 6, NULL),
  ('ba1953b0-8397-4db6-a4c6-bc33704495aa', '1434e608-53e0-48a1-98d0-4b985894a693', 'db58c284-3974-4b78-b68a-9e53f95fe6b5', 'PJ', 'Desenvolvedor Front-end', 7500.00, '2025-12-18', '2026-06-18', 'active', 'dfde18db-baf2-4477-908b-eb23658f2cf6', 'time_based', 'months', 6, NULL),
  ('5c5e0bf8-0eba-4f9f-9939-caeae088200f', '1434e608-53e0-48a1-98d0-4b985894a693', '39a3f7b4-616a-40fe-b3d8-5c7ad0ea4f2a', 'PJ', 'Desenvolvedor', 150000.00, '2026-02-04', '2027-02-04', 'active', 'dfde18db-baf2-4477-908b-eb23658f2cf6', 'time_based', 'months', 12, 'Tecnologia'),
  ('833b4f72-ca2f-46d7-8bde-c958b830fe9f', '1434e608-53e0-48a1-98d0-4b985894a693', 'dfde18db-baf2-4477-908b-eb23658f2cf6', 'PJ', 'Analista de Sistemas', 10000.00, '2026-02-11', NULL, 'active', 'dfde18db-baf2-4477-908b-eb23658f2cf6', 'indefinite', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 7. INVITES
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

-- 8. PAYMENTS
INSERT INTO public.payments (id, company_id, contract_id, user_id, amount, reference_month, status, description) VALUES
  ('ae838cf9-9f36-4dc9-843b-be484ffd888a', '1434e608-53e0-48a1-98d0-4b985894a693', '5abecffc-54b2-4374-9554-07ccd211d938', 'db58c284-3974-4b78-b68a-9e53f95fe6b5', 150000.00, '2026-02-01', 'pending', 'Salário Mensal')
ON CONFLICT (id) DO NOTHING;

-- 9. CONTRACT DOCUMENTS (sem document_html por ser muito extenso - usar templates)
-- Os documentos de contrato são gerados a partir dos templates.
-- IDs dos documentos existentes para referência:
--   274e49ff-4e4b-41eb-bd36-c5f3d1be696f (contract: 5abecffc, status: partial)
--   d92d0b69-00f2-42cf-a084-0219bc04e96c (contract: ba1953b0, status: partial)
--   d8dc14ab-abf7-4d1c-8c63-bb97fcc39051 (contract: 5c5e0bf8, status: pending, 2 testemunhas)
--   e18f3cb1-2b2a-4763-9241-d9bfb333672f (contract: 833b4f72, status: pending, 2 testemunhas)

-- 10. NOTIFICATION LOGS
INSERT INTO public.notification_logs (id, company_id, recipient_email, notification_type, subject, status, channel, metadata) VALUES
  ('7c5d71b4-46c9-450b-988d-9f04f5b2b49b', '1434e608-53e0-48a1-98d0-4b985894a693', 'admin.tech@teste.com', 'contract_expiration_alert', '1 contrato(s) próximo(s) do vencimento', 'sent', 'email', '{"alert_days": 30, "contracts_count": 1}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- NOTAS IMPORTANTES PARA MIGRAÇÃO:
-- ============================================================
-- 1. Os dados de auth.users (autenticação) são gerenciados pelo Supabase Auth
--    e NÃO podem ser exportados via SQL. Será necessário recriar os usuários.
-- 2. Os contract_templates contêm HTML extenso e são criados via migration
--    (ver migration 20251218185148_fe05c98c...).
-- 3. As contract_signatures contêm imagens base64 das assinaturas que são
--    muito grandes para incluir neste seed.
-- 4. Os contract_documents contêm HTML renderizado dos contratos.
-- 5. Storage buckets (avatars, contract-signatures) precisam ser recriados
--    manualmente no novo ambiente.
-- 6. Secrets (GMAIL_USER, GMAIL_APP_PASSWORD, etc.) precisam ser
--    reconfigurados no novo ambiente.
-- ============================================================
