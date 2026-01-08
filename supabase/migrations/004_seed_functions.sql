-- Seed functions with SECURITY DEFINER to bypass RLS for demo data
-- These functions should only be used during development/demo setup

-- Function to seed a customer
create or replace function seed_customer(
  p_email text,
  p_name text,
  p_preferred_language text default 'en',
  p_metadata jsonb default '{}'
) returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into customers (email, name, preferred_language, metadata)
  values (p_email, p_name, p_preferred_language, p_metadata)
  returning id into v_id;

  return v_id;
end;
$$;

-- Function to seed a ticket
create or replace function seed_ticket(
  p_customer_id uuid,
  p_subject text,
  p_status text default 'open',
  p_priority text default 'normal',
  p_ai_confidence float default null,
  p_ai_handled boolean default true,
  p_tags text[] default '{}'
) returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into tickets (customer_id, subject, status, priority, ai_confidence, ai_handled, tags)
  values (p_customer_id, p_subject, p_status, p_priority, p_ai_confidence, p_ai_handled, p_tags)
  returning id into v_id;

  return v_id;
end;
$$;

-- Function to seed a message
create or replace function seed_message(
  p_ticket_id uuid,
  p_sender_type text,
  p_content text,
  p_content_translated text default null,
  p_original_language text default null,
  p_confidence float default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into messages (ticket_id, sender_type, content, content_translated, original_language, confidence)
  values (p_ticket_id, p_sender_type, p_content, p_content_translated, p_original_language, p_confidence)
  returning id into v_id;

  return v_id;
end;
$$;

-- Grant execute permissions
grant execute on function seed_customer to anon;
grant execute on function seed_ticket to anon;
grant execute on function seed_message to anon;
