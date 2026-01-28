-- Fix agents RLS policies to allow embedding in ticket queries
-- The PGRST201 error occurs because authenticated users can't read agents via foreign key

-- Drop existing restrictive policy
drop policy if exists "Agents can view all agents" on agents;

-- Create a more permissive policy for authenticated users
create policy "Authenticated users can view all agents"
  on agents for select
  to authenticated
  using (true);

-- Also allow anonymous access for widget (they'll see limited data anyway)
drop policy if exists "Public can view agents" on agents;
create policy "Public can view agents"
  on agents for select
  to anon
  using (true);
