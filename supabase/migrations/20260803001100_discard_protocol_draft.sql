create or replace function public.discard_protocol_draft(
  p_study_id uuid,
  p_protocol_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  selected_protocol public.protocols;
begin
  if caller_id is null or not private.can_manage_study(p_study_id) then
    raise exception 'You are not authorized to manage this study' using errcode = '42501';
  end if;

  select * into selected_protocol
  from public.protocols
  where id = p_protocol_id and study_id = p_study_id
  for update;

  if selected_protocol.id is null then
    raise exception 'Protocol not found' using errcode = 'P0002';
  end if;
  if selected_protocol.status <> 'draft' then
    raise exception 'Only a draft protocol can be discarded' using errcode = '42501';
  end if;

  insert into public.activity_logs (
    study_id, actor_id, action, category, target_type, target_id, details
  ) values (
    p_study_id, caller_id, 'protocol.draft_discarded', 'protocol', 'protocol', selected_protocol.id,
    jsonb_build_object(
      'protocol_code', selected_protocol.protocol_code,
      'version', selected_protocol.version,
      'title', selected_protocol.title,
      'change_summary', selected_protocol.change_summary
    )
  );

  delete from public.protocols where id = selected_protocol.id and status = 'draft';
  return selected_protocol.version;
end;
$$;

revoke all on function public.discard_protocol_draft(uuid, uuid) from public;
grant execute on function public.discard_protocol_draft(uuid, uuid) to authenticated;

comment on function public.discard_protocol_draft(uuid, uuid) is
  'Deletes only an authorized draft protocol after preserving its identifying metadata in the activity log.';
