-- R-Link Customer Service Platform - Vector Features
-- Enable pgvector extension for embeddings

-- Set search_path to include extensions schema where pgvector operators are defined
set search_path to public, extensions;

-- Add embedding column to knowledge_articles
alter table knowledge_articles add column if not exists embedding extensions.vector(1536);

-- Create vector similarity search index (HNSW is faster for queries)
create index if not exists idx_knowledge_articles_embedding on knowledge_articles
  using hnsw (embedding extensions.vector_cosine_ops);

-- Vector similarity search function for knowledge base RAG
-- Note: The function needs its own search_path setting for runtime
create or replace function match_knowledge(
  query_embedding extensions.vector(1536),
  match_threshold float default 0.7,
  match_count int default 5
) returns table (
  id uuid,
  title text,
  content text,
  category text,
  similarity float
)
language sql stable
set search_path = public, extensions
as $$
  select
    id,
    title,
    content,
    category,
    1 - (embedding <=> query_embedding) as similarity
  from knowledge_articles
  where
    embedding is not null
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
