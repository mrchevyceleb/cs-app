-- R-Link Customer Service Platform - Enhanced Knowledge Base
-- Adds KB source tracking, full-text search, hybrid search RPCs, and search logging

set search_path to public, extensions;

-- ===========================================
-- 1. Add columns to knowledge_articles
-- ===========================================

alter table knowledge_articles
  add column if not exists source_file text,
  add column if not exists section_path text,
  add column if not exists file_number int,
  add column if not exists chunk_index int default 0,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists is_kb_source boolean default false,
  add column if not exists updated_at timestamptz default now();

-- Full-text search column (generated)
alter table knowledge_articles
  add column if not exists fts tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) stored;

-- ===========================================
-- 2. Indexes
-- ===========================================

create index if not exists idx_ka_source_file on knowledge_articles(source_file);
create index if not exists idx_ka_is_kb_source on knowledge_articles(is_kb_source);
create index if not exists idx_ka_category on knowledge_articles(category);
create index if not exists idx_ka_fts on knowledge_articles using gin(fts);
create index if not exists idx_ka_metadata on knowledge_articles using gin(metadata);

-- ===========================================
-- 3. Enhanced vector search RPC
-- ===========================================

create or replace function match_knowledge_enhanced(
  query_embedding extensions.vector(1536),
  match_threshold float default 0.6,
  match_count int default 10
) returns table (
  id uuid,
  title text,
  content text,
  category text,
  source_file text,
  section_path text,
  file_number int,
  chunk_index int,
  metadata jsonb,
  is_kb_source boolean,
  similarity float
)
language sql stable
set search_path = public, extensions
as $$
  select
    ka.id,
    ka.title,
    ka.content,
    ka.category,
    ka.source_file,
    ka.section_path,
    ka.file_number,
    ka.chunk_index,
    ka.metadata,
    ka.is_kb_source,
    1 - (ka.embedding <=> query_embedding) as similarity
  from knowledge_articles ka
  where
    ka.embedding is not null
    and 1 - (ka.embedding <=> query_embedding) > match_threshold
  order by ka.embedding <=> query_embedding
  limit match_count;
$$;

-- ===========================================
-- 4. Keyword / full-text search RPC
-- ===========================================

create or replace function search_knowledge_text(
  search_query text,
  result_limit int default 10
) returns table (
  id uuid,
  title text,
  content text,
  category text,
  source_file text,
  section_path text,
  file_number int,
  chunk_index int,
  metadata jsonb,
  is_kb_source boolean,
  rank float
)
language sql stable
set search_path = public, extensions
as $$
  select
    ka.id,
    ka.title,
    ka.content,
    ka.category,
    ka.source_file,
    ka.section_path,
    ka.file_number,
    ka.chunk_index,
    ka.metadata,
    ka.is_kb_source,
    ts_rank_cd(ka.fts, websearch_to_tsquery('english', search_query)) as rank
  from knowledge_articles ka
  where
    ka.fts @@ websearch_to_tsquery('english', search_query)
  order by rank desc
  limit result_limit;
$$;

-- ===========================================
-- 5. KB search logs table
-- ===========================================

create table if not exists kb_search_logs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  search_type text not null default 'hybrid', -- 'vector', 'keyword', 'hybrid'
  source text not null default 'unknown', -- 'triage', 'nova', 'customer_chat', 'suggestions', 'widget', 'portal', 'api'
  article_ids uuid[] default '{}',
  top_similarity float,
  result_count int default 0,
  ticket_id uuid references tickets(id),
  customer_id uuid references customers(id),
  was_helpful boolean,
  created_at timestamptz default now()
);

create index if not exists idx_kb_search_logs_created on kb_search_logs(created_at desc);
create index if not exists idx_kb_search_logs_source on kb_search_logs(source);
create index if not exists idx_kb_search_logs_query on kb_search_logs using gin(to_tsvector('english', query));

-- ===========================================
-- 6. updated_at trigger for knowledge_articles
-- ===========================================

create or replace function update_knowledge_articles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists knowledge_articles_updated_at on knowledge_articles;
create trigger knowledge_articles_updated_at
  before update on knowledge_articles
  for each row
  execute function update_knowledge_articles_updated_at();

-- ===========================================
-- 7. RLS for kb_search_logs (service role only)
-- ===========================================

alter table kb_search_logs enable row level security;

-- Allow service role full access (no restrictive policies needed for server-side table)
create policy "Service role full access to kb_search_logs"
  on kb_search_logs for all
  using (true)
  with check (true);
