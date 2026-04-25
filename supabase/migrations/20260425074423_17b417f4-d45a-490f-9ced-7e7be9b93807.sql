
-- Remove any prior version of the same job (idempotent)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'mark-overdue-fees-nightly';

-- Schedule: every day at 01:00 UTC
SELECT cron.schedule(
  'mark-overdue-fees-nightly',
  '0 1 * * *',
  $$SELECT public.mark_overdue_fees();$$
);
