-- Existing projects: hide rocky_staff.line_user_id from the public Supabase API.
-- Service role used by the admin server is unchanged.
-- Safe to run more than once.

revoke select on table public.rocky_staff from anon, authenticated;
grant select (
  id,
  display_name,
  role,
  line_url,
  line_id,
  note,
  sort_order,
  created_at
) on table public.rocky_staff to anon, authenticated;
