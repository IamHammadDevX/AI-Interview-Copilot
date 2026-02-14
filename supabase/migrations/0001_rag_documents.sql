create extension if not exists vector;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'document_status') then
    create type public.document_status as enum ('uploaded', 'processing', 'ready', 'error');
  end if;
end $$;

alter table public.documents
  add column if not exists user_id uuid,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists status public.document_status not null default 'uploaded',
  add column if not exists error text,
  add column if not exists extracted_text text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.embeddings
  add column if not exists project_id uuid,
  add column if not exists chunk_index int,
  add column if not exists token_count int;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_user_id_fkey'
  ) then
    alter table public.documents
      add constraint documents_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'embeddings_project_id_fkey'
  ) then
    alter table public.embeddings
      add constraint embeddings_project_id_fkey
      foreign key (project_id) references public.projects (id) on delete cascade;
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create index if not exists documents_project_id_idx on public.documents(project_id);
create index if not exists documents_user_id_idx on public.documents(user_id);

create index if not exists embeddings_document_id_idx on public.embeddings(document_id);
create index if not exists embeddings_project_id_idx on public.embeddings(project_id);

create index if not exists embeddings_embedding_ivfflat_idx
on public.embeddings
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

alter table public.documents enable row level security;
alter table public.embeddings enable row level security;

drop policy if exists documents_select_own on public.documents;
create policy documents_select_own
on public.documents
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = documents.project_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists documents_insert_own on public.documents;
create policy documents_insert_own
on public.documents
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.projects p
    where p.id = documents.project_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists documents_update_own on public.documents;
create policy documents_update_own
on public.documents
for update
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = documents.project_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = documents.project_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists documents_delete_own on public.documents;
create policy documents_delete_own
on public.documents
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = documents.project_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists embeddings_select_own on public.embeddings;
create policy embeddings_select_own
on public.embeddings
for select
to authenticated
using (
  exists (
    select 1
    from public.documents d
    join public.projects p on p.id = d.project_id
    where d.id = embeddings.document_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists embeddings_insert_own on public.embeddings;
create policy embeddings_insert_own
on public.embeddings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.documents d
    join public.projects p on p.id = d.project_id
    where d.id = embeddings.document_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists embeddings_delete_own on public.embeddings;
create policy embeddings_delete_own
on public.embeddings
for delete
to authenticated
using (
  exists (
    select 1
    from public.documents d
    join public.projects p on p.id = d.project_id
    where d.id = embeddings.document_id
      and p.user_id = auth.uid()
  )
);

create or replace function public.match_project_embeddings(
  p_project_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 5,
  p_min_similarity float default 0.75
)
returns table (
  document_id uuid,
  content text,
  similarity float
)
language sql
stable
security invoker
as $$
  select
    e.document_id,
    e.content,
    (1 - (e.embedding <=> p_query_embedding))::float as similarity
  from public.embeddings e
  join public.documents d on d.id = e.document_id
  join public.projects p on p.id = d.project_id
  where d.project_id = p_project_id
    and p.user_id = auth.uid()
    and (1 - (e.embedding <=> p_query_embedding)) > p_min_similarity
  order by e.embedding <=> p_query_embedding
  limit p_match_count;
$$;

insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

drop policy if exists "project_documents_read_own" on storage.objects;
create policy "project_documents_read_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-documents'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "project_documents_write_own" on storage.objects;
create policy "project_documents_write_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-documents'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "project_documents_delete_own" on storage.objects;
create policy "project_documents_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-documents'
  and split_part(name, '/', 1) = auth.uid()::text
);

