update public.protocols p
set evidence_requirements = coalesce((
  select jsonb_agg(item)
  from jsonb_array_elements(p.evidence_requirements) item
  where item ->> 'code' <> 'evidence_metadata'
), '[]'::jsonb)
where p.evidence_requirements @> '[{"code":"evidence_metadata"}]'::jsonb;

alter table public.protocols
add constraint protocols_no_manual_evidence_metadata
check (not jsonb_path_exists(evidence_requirements, '$[*] ? (@.code == "evidence_metadata")'));

comment on constraint protocols_no_manual_evidence_metadata on public.protocols is
  'Evidence metadata is generated from submission and upload records rather than supplied as a tester JSON file.';
