create or replace function private.can_read_study_workflow(required_study_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
    or private.has_study_role(required_study_id, 'test_coordinator')
    or private.has_study_role(required_study_id, 'expert_reviewer')
    or private.has_study_role(required_study_id, 'law_firm_viewer')
    or (
      private.current_user_role() = 'law_firm_viewer'
      and private.is_study_member(required_study_id)
    );
$$;

revoke all on function private.can_read_study_workflow(uuid) from public;
grant execute on function private.can_read_study_workflow(uuid) to authenticated;

comment on function private.can_read_study_workflow(uuid) is
  'Allows operational roles with matching study roles and grants a globally read-only viewer access to every study where that account has active membership.';
