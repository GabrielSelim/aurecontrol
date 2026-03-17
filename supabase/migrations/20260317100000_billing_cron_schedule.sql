-- ============================================================
-- Cron: gerar faturas mensais automaticamente no dia 1 de cada mês
-- Usa pg_cron + pg_net (já habilitados)
-- Horário: 08:00 (horário do servidor/UTC) no dia 1 de cada mês
-- ============================================================

-- Remove job anterior se existir (para re-apply segura)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-monthly-billings') THEN
    PERFORM cron.unschedule('generate-monthly-billings');
  END IF;
END;
$$;

-- Agenda o job
SELECT cron.schedule(
  'generate-monthly-billings',
  '0 8 1 * *',
  $$
  SELECT net.http_post(
    url     := 'http://kong:8000/functions/v1/generate-monthly-billings',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);

-- Confirma agendamento
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-monthly-billings') THEN
    RAISE NOTICE 'Cron job "generate-monthly-billings" agendado com sucesso (dia 1 às 08:00).';
  ELSE
    RAISE EXCEPTION 'Falha ao agendar cron job';
  END IF;
END;
$$;
