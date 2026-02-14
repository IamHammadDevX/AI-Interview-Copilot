do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'interview_transcripts'
  ) then
    create table public.interview_transcripts (
      id uuid primary key default gen_random_uuid(),
      project_id uuid not null,
      speaker text not null,
      text text not null,
      timestamp_ms bigint not null,
      created_at timestamptz not null default now()
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'interview_transcripts_project_id_fkey'
  ) then
    alter table public.interview_transcripts
      add constraint interview_transcripts_project_id_fkey
      foreign key (project_id) references public.projects (id) on delete cascade;
  end if;
end $$;

create index if not exists interview_transcripts_project_id_idx
  on public.interview_transcripts(project_id);

create index if not exists interview_transcripts_created_at_idx
  on public.interview_transcripts(created_at desc);

alter table public.interview_transcripts enable row level security;

drop policy if exists interview_transcripts_select_own on public.interview_transcripts;
create policy interview_transcripts_select_own
on public.interview_transcripts
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = interview_transcripts.project_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists interview_transcripts_insert_own on public.interview_transcripts;
create policy interview_transcripts_insert_own
on public.interview_transcripts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = interview_transcripts.project_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists interview_transcripts_delete_own on public.interview_transcripts;
create policy interview_transcripts_delete_own
on public.interview_transcripts
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = interview_transcripts.project_id
      and p.user_id = auth.uid()
  )
);

grant select on public.interview_transcripts to anon;
grant all privileges on public.interview_transcripts to authenticated;

