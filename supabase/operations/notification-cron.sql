-- Run once as a Supabase project administrator after enabling pg_cron, pg_net and Vault.
-- Store the Edge Function secret at Vault name `notification_worker_secret` first.
-- Do not paste a secret into this migration or commit it in this file.
select cron.schedule(
  'gaadipulse-notification-worker',
  '* * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets
              where name = 'supabase_url') || '/functions/v1/notification-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-worker-secret', (select decrypted_secret from vault.decrypted_secrets
                            where name = 'notification_worker_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    );
  $job$
);

-- Verify with: select jobid, schedule, command, active from cron.job;
-- Also verify pg_net queue permissions are restricted to trusted database operators.
