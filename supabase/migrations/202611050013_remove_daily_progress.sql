-- Retain historical submissions, form versions, audit events and meter observations.
-- Remove client access to the retired progress workflows and automatic form writes.
revoke execute on function public.publish_progress_form(uuid,jsonb) from public, anon, authenticated;
revoke execute on function public.submit_progress(uuid,jsonb,uuid,uuid,integer) from public, anon, authenticated;
revoke execute on function public.review_progress(uuid,uuid,integer,text,text) from public, anon, authenticated;
revoke execute on function public.read_form_versions(uuid) from public, anon, authenticated;
revoke execute on function public.read_progress_records(uuid,integer,integer) from public, anon, authenticated;
revoke all on public.daily_progress, public.progress_form_versions, public.progress_attachments from public, anon, authenticated;
drop trigger if exists initial_progress_form on public.vehicles;
drop trigger if exists adapt_progress_meter on public.vehicles;
