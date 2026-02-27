#!/bin/bash
# ============================================================
# Seed de usuários de teste - AureControl
# Executado APÓS o GoTrue aplicar suas migrations no auth schema
# ============================================================
set -e

echo "=== AureControl Seed Users ==="

DB_HOST="${DB_HOST:-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-postgres}"

# Esperar o PostgreSQL
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
  echo "Aguardando PostgreSQL..."
  sleep 2
done

# Esperar o GoTrue aplicar suas migrations (auth.identities precisa existir)
echo "Aguardando GoTrue aplicar migrations no schema auth..."
RETRIES=0
MAX_RETRIES=60
while [ $RETRIES -lt $MAX_RETRIES ]; do
  HAS_IDENTITIES=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='auth' AND table_name='identities');" 2>/dev/null || echo "f")

  if [ "$HAS_IDENTITIES" = "t" ]; then
    echo "GoTrue migrations aplicadas! Schema auth atualizado."
    break
  fi

  RETRIES=$((RETRIES + 1))
  echo "auth.identities ainda não existe ($RETRIES/$MAX_RETRIES), aguardando 3s..."
  sleep 3
done

if [ "$HAS_IDENTITIES" != "t" ]; then
  echo "ERRO: GoTrue não aplicou migrations após $MAX_RETRIES tentativas. Abortando seed de usuários."
  exit 1
fi

# Verificar se já foi feito (algum user de teste existe?)
ALREADY_SEEDED=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT EXISTS (SELECT 1 FROM auth.users WHERE id='ee2f5a8c-358a-4e11-b687-8e5b5a60cfae');" 2>/dev/null || echo "f")

if [ "$ALREADY_SEEDED" = "t" ]; then
  echo "Usuários de teste já existem. Pulando seed."
  exit 0
fi

echo "Inserindo usuários de teste..."

# Detectar colunas disponíveis para construir o INSERT correto
HAS_EMAIL_CONFIRMED=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='auth' AND table_name='users' AND column_name='email_confirmed_at');" 2>/dev/null || echo "f")

if [ "$HAS_EMAIL_CONFIRMED" = "t" ]; then
  CONFIRM_COL="email_confirmed_at"
else
  CONFIRM_COL="confirmed_at"
fi

echo "Usando coluna de confirmação: $CONFIRM_COL"

# Inserir auth.users (adaptado ao schema do GoTrue)
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<EOSQL
-- Inserir usuários de teste (senha: Teste@123)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, ${CONFIRM_COL}, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, reauthentication_token, phone_change_token, email_change, phone_change) VALUES
  ('ee2f5a8c-358a-4e11-b687-8e5b5a60cfae', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'eng.gabrielsanz@hotmail.com', crypt('Teste@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Gabriel Sanz Selim de Sales"}', false, '', '', '', '', '', '', '', ''),
  ('dfde18db-baf2-4477-908b-eb23658f2cf6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin.tech@teste.com', crypt('Teste@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sarah Isabela Brito"}', false, '', '', '', '', '', '', '', ''),
  ('c6310333-ffc3-46e5-badd-6825b981524d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'financeiro.tech@teste.com', crypt('Teste@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Isadora Bárbara Mariane Araújo"}', false, '', '', '', '', '', '', '', ''),
  ('39a3f7b4-616a-40fe-b3d8-5c7ad0ea4f2a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gestor.tech@teste.com', crypt('Teste@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Amanda Mariana Corte Real"}', false, '', '', '', '', '', '', '', ''),
  ('db58c284-3974-4b78-b68a-9e53f95fe6b5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'colab.tech@teste.com', crypt('Teste@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Pietro Elias Alves"}', false, '', '', '', '', '', '', '', ''),
  ('04e8de50-c456-44d9-a49f-2e39260522be', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin.inov@teste.com', crypt('Teste@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Emanuelly Alana Laís Oliveira"}', false, '', '', '', '', '', '', '', ''),
  ('b0e5dbae-9a5b-48dc-9fe3-12ad5de61aa1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'financeiro.inov@teste.com', crypt('Teste@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Isadora Alessandra Priscila Cardoso"}', false, '', '', '', '', '', '', '', ''),
  ('9ed24ebf-8f93-4895-b63a-8697c9847afc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'colab.inov@teste.com', crypt('Teste@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Colaborador Inovação"}', false, '', '', '', '', '', '', '', ''),
  ('7627daf7-0458-4aaa-877c-7a32cc8090d3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'juridico@inovacao.com', crypt('Teste@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Jurídico Inovação"}', false, '', '', '', '', '', '', '', ''),
  ('8df9f69f-7076-4347-8f87-800270a795fc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'juridico@techsolutions.com', crypt('Teste@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Jurídico Tech Solutions"}', false, '', '', '', '', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Identities (necessário para login no GoTrue)
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES
  (gen_random_uuid(), 'ee2f5a8c-358a-4e11-b687-8e5b5a60cfae', 'ee2f5a8c-358a-4e11-b687-8e5b5a60cfae', jsonb_build_object('sub', 'ee2f5a8c-358a-4e11-b687-8e5b5a60cfae', 'email', 'eng.gabrielsanz@hotmail.com'), 'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'dfde18db-baf2-4477-908b-eb23658f2cf6', 'dfde18db-baf2-4477-908b-eb23658f2cf6', jsonb_build_object('sub', 'dfde18db-baf2-4477-908b-eb23658f2cf6', 'email', 'admin.tech@teste.com'), 'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c6310333-ffc3-46e5-badd-6825b981524d', 'c6310333-ffc3-46e5-badd-6825b981524d', jsonb_build_object('sub', 'c6310333-ffc3-46e5-badd-6825b981524d', 'email', 'financeiro.tech@teste.com'), 'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), '39a3f7b4-616a-40fe-b3d8-5c7ad0ea4f2a', '39a3f7b4-616a-40fe-b3d8-5c7ad0ea4f2a', jsonb_build_object('sub', '39a3f7b4-616a-40fe-b3d8-5c7ad0ea4f2a', 'email', 'gestor.tech@teste.com'), 'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'db58c284-3974-4b78-b68a-9e53f95fe6b5', 'db58c284-3974-4b78-b68a-9e53f95fe6b5', jsonb_build_object('sub', 'db58c284-3974-4b78-b68a-9e53f95fe6b5', 'email', 'colab.tech@teste.com'), 'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), '04e8de50-c456-44d9-a49f-2e39260522be', '04e8de50-c456-44d9-a49f-2e39260522be', jsonb_build_object('sub', '04e8de50-c456-44d9-a49f-2e39260522be', 'email', 'admin.inov@teste.com'), 'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'b0e5dbae-9a5b-48dc-9fe3-12ad5de61aa1', 'b0e5dbae-9a5b-48dc-9fe3-12ad5de61aa1', jsonb_build_object('sub', 'b0e5dbae-9a5b-48dc-9fe3-12ad5de61aa1', 'email', 'financeiro.inov@teste.com'), 'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), '9ed24ebf-8f93-4895-b63a-8697c9847afc', '9ed24ebf-8f93-4895-b63a-8697c9847afc', jsonb_build_object('sub', '9ed24ebf-8f93-4895-b63a-8697c9847afc', 'email', 'colab.inov@teste.com'), 'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7627daf7-0458-4aaa-877c-7a32cc8090d3', '7627daf7-0458-4aaa-877c-7a32cc8090d3', jsonb_build_object('sub', '7627daf7-0458-4aaa-877c-7a32cc8090d3', 'email', 'juridico@inovacao.com'), 'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), '8df9f69f-7076-4347-8f87-800270a795fc', '8df9f69f-7076-4347-8f87-800270a795fc', jsonb_build_object('sub', '8df9f69f-7076-4347-8f87-800270a795fc', 'email', 'juridico@techsolutions.com'), 'email', NOW(), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Profiles
INSERT INTO public.profiles (id, user_id, email, full_name, cpf, phone, company_id, is_active,
  address_cep, address_city, address_complement, address_neighborhood, address_number, address_state, address_street,
  birth_date, nationality, marital_status, identity_number, identity_issuer, profession,
  pj_cnpj, pj_razao_social, pj_nome_fantasia) VALUES
  ('6e1d9d6d-5278-441d-86df-44f76eb2fdd9', 'ee2f5a8c-358a-4e11-b687-8e5b5a60cfae', 'eng.gabrielsanz@hotmail.com', 'Gabriel Sanz Selim de Sales', '01863625100', '67998231019', NULL, true,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('59fce32f-7008-4257-b799-bce15eeae336', 'dfde18db-baf2-4477-908b-eb23658f2cf6', 'admin.tech@teste.com', 'Sarah Isabela Brito', '371.341.291-01', '(67) 98199-9236', '1434e608-53e0-48a1-98d0-4b985894a693', true,
    '79041490', 'Campo Grande', 'Apto 14 Bloco 11', 'Tiradentes', '354', 'MS', 'Rua Dona Ziza',
    '1983-09-27', 'Brasileira', 'Casada', '42.198.631-1', 'sspms', 'C.E.O', NULL, NULL, NULL),
  ('54735bbf-610e-4928-b97a-362ef8bd9fc1', 'c6310333-ffc3-46e5-badd-6825b981524d', 'financeiro.tech@teste.com', 'Isadora Bárbara Mariane Araújo', '28989490197', '67984506730', '1434e608-53e0-48a1-98d0-4b985894a693', true,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('7cd87e79-d988-4727-aa60-e221a0fb0cdc', '39a3f7b4-616a-40fe-b3d8-5c7ad0ea4f2a', 'gestor.tech@teste.com', 'Amanda Mariana Corte Real', '62150836157', '67997342004', '1434e608-53e0-48a1-98d0-4b985894a693', true,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('f1219c00-7647-469c-8067-81e9913ab447', 'db58c284-3974-4b78-b68a-9e53f95fe6b5', 'colab.tech@teste.com', 'Pietro Elias Alves', '377.787.811-15', '(67) 99631-9987', '1434e608-53e0-48a1-98d0-4b985894a693', true,
    '79041450', 'Campo Grande', NULL, 'Tiradentes', '354', 'MS', 'Rua Altair Correa Lima',
    '1978-05-12', 'Brasileiro', 'Casado', '42.093.445-5', 'ssp', NULL, '67727612000151', 'Vitor e Sérgio Gráfica Ltda', 'Vitor e Sérgio Gráfica Ltda'),
  ('447e18b0-13fc-454e-a4a2-c6769500267e', '04e8de50-c456-44d9-a49f-2e39260522be', 'admin.inov@teste.com', 'Emanuelly Alana Laís Oliveira', '14433308170', '67985163707', '49f55bb0-6fd7-44f7-96bd-758ce0c15f82', true,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('efd495fa-1d00-4390-91b6-841fbd7eeeb2', 'b0e5dbae-9a5b-48dc-9fe3-12ad5de61aa1', 'financeiro.inov@teste.com', 'Isadora Alessandra Priscila Cardoso', '83759393152', '67983971161', '49f55bb0-6fd7-44f7-96bd-758ce0c15f82', true,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- User Roles
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

-- Contracts
INSERT INTO public.contracts (id, company_id, user_id, contract_type, job_title, salary, start_date, end_date, status, created_by, duration_type, duration_unit, duration_value, department) VALUES
  ('5abecffc-54b2-4374-9554-07ccd211d938', '1434e608-53e0-48a1-98d0-4b985894a693', 'db58c284-3974-4b78-b68a-9e53f95fe6b5', 'PJ', 'Desenvolvedor Back-end', 7777.00, '2025-12-18', '2026-06-18', 'active', 'dfde18db-baf2-4477-908b-eb23658f2cf6', 'time_based', 'months', 6, NULL),
  ('ba1953b0-8397-4db6-a4c6-bc33704495aa', '1434e608-53e0-48a1-98d0-4b985894a693', 'db58c284-3974-4b78-b68a-9e53f95fe6b5', 'PJ', 'Desenvolvedor Front-end', 7500.00, '2025-12-18', '2026-06-18', 'active', 'dfde18db-baf2-4477-908b-eb23658f2cf6', 'time_based', 'months', 6, NULL),
  ('5c5e0bf8-0eba-4f9f-9939-caeae088200f', '1434e608-53e0-48a1-98d0-4b985894a693', '39a3f7b4-616a-40fe-b3d8-5c7ad0ea4f2a', 'PJ', 'Desenvolvedor', 150000.00, '2026-02-04', '2027-02-04', 'active', 'dfde18db-baf2-4477-908b-eb23658f2cf6', 'time_based', 'months', 12, 'Tecnologia'),
  ('833b4f72-ca2f-46d7-8bde-c958b830fe9f', '1434e608-53e0-48a1-98d0-4b985894a693', 'dfde18db-baf2-4477-908b-eb23658f2cf6', 'PJ', 'Analista de Sistemas', 10000.00, '2026-02-11', NULL, 'active', 'dfde18db-baf2-4477-908b-eb23658f2cf6', 'indefinite', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Payments
INSERT INTO public.payments (id, company_id, contract_id, user_id, amount, reference_month, status, description) VALUES
  ('ae838cf9-9f36-4dc9-843b-be484ffd888a', '1434e608-53e0-48a1-98d0-4b985894a693', '5abecffc-54b2-4374-9554-07ccd211d938', 'db58c284-3974-4b78-b68a-9e53f95fe6b5', 150000.00, '2026-02-01', 'pending', 'Salário Mensal')
ON CONFLICT (id) DO NOTHING;

EOSQL

echo "=== Seed de usuários concluído! ==="
echo "Usuários criados com senha: Teste@123"
