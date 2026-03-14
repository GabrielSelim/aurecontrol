-- ============================================================
-- pg_cron: Agendamento automático das edge functions
-- ============================================================
-- Requer pg_cron e pg_net habilitados no Supabase / PostgreSQL
-- As functions são chamadas via HTTP para Kong (interno Docker)
-- ============================================================

-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Garantir que pg_cron pode usar pg_net
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================================
-- Remove jobs anteriores se existirem (idempotente)
-- ============================================================
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN (
  'contract-expiration-alerts',
  'billing-due-reminder',
  'generate-monthly-billings',
  'retry-notifications',
  'contract-signed-reminder'
);

-- ============================================================
-- JOB 1 — Alertas de vencimento de contrato
-- Diário às 08:00 (horário UTC-3 = 11:00 UTC)
-- ============================================================
SELECT cron.schedule(
  'contract-expiration-alerts',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'http://aurecontrol-kong:8000/functions/v1/contract-expiration-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3MzU2ODk2MDAsImV4cCI6MTg5MzQ1NjAwMH0.21E1gWisC71MMm9ioWrveif8X90t36e28nrVkcpRZdo'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- JOB 2 — Lembrete de cobrança vencendo
-- Diário às 09:00 (UTC-3 = 12:00 UTC)
-- ============================================================
SELECT cron.schedule(
  'billing-due-reminder',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'http://aurecontrol-kong:8000/functions/v1/billing-due-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3MzU2ODk2MDAsImV4cCI6MTg5MzQ1NjAwMH0.21E1gWisC71MMm9ioWrveif8X90t36e28nrVkcpRZdo'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- JOB 3 — Geração mensal de obrigações (dia 1 de cada mês às 06h)
-- (UTC-3 = 09:00 UTC)
-- ============================================================
SELECT cron.schedule(
  'generate-monthly-billings',
  '0 9 1 * *',
  $$
  SELECT net.http_post(
    url := 'http://aurecontrol-kong:8000/functions/v1/generate-monthly-billings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3MzU2ODk2MDAsImV4cCI6MTg5MzQ1NjAwMH0.21E1gWisC71MMm9ioWrveif8X90t36e28nrVkcpRZdo'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- JOB 4 — Reenvio de notificações com falha
-- A cada 30 minutos
-- ============================================================
SELECT cron.schedule(
  'retry-notifications',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'http://aurecontrol-kong:8000/functions/v1/retry-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3MzU2ODk2MDAsImV4cCI6MTg5MzQ1NjAwMH0.21E1gWisC71MMm9ioWrveif8X90t36e28nrVkcpRZdo'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- JOB 5 — Lembrete de assinatura pendente (D+3)
-- Diário às 10h (UTC-3 = 13:00 UTC)
-- ============================================================
SELECT cron.schedule(
  'contract-signed-reminder',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url := 'http://aurecontrol-kong:8000/functions/v1/contract-signed-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3MzU2ODk2MDAsImV4cCI6MTg5MzQ1NjAwMH0.21E1gWisC71MMm9ioWrveif8X90t36e28nrVkcpRZdo'
    ),
    body := jsonb_build_object('reminder_mode', true)
  );
  $$
);

-- ============================================================
-- Verificar jobs criados
-- ============================================================
-- SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
