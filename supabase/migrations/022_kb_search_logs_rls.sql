-- R-Link Customer Service Platform - Restrict KB search logs access

set search_path to public, extensions;

alter table kb_search_logs enable row level security;

drop policy if exists "Service role full access to kb_search_logs" on kb_search_logs;

create policy "Service role full access to kb_search_logs"
  on kb_search_logs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
