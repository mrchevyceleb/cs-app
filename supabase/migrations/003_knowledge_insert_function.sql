-- Function to insert knowledge article with embedding (bypasses PostgREST schema cache issue)
create or replace function insert_knowledge_article(
  p_title text,
  p_content text,
  p_category text default null,
  p_embedding extensions.vector(1536) default null
) returns json
language plpgsql
security definer
as $$
declare
  v_id uuid;
  v_created_at timestamptz;
begin
  insert into knowledge_articles (title, content, category, embedding)
  values (p_title, p_content, p_category, p_embedding)
  returning id, created_at into v_id, v_created_at;

  return json_build_object(
    'id', v_id,
    'title', p_title,
    'content', p_content,
    'category', p_category,
    'created_at', v_created_at
  );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function insert_knowledge_article to authenticated;
grant execute on function insert_knowledge_article to anon;
