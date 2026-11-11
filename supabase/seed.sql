-- Optional SQL seed for Rocky tables (after schema.sql). Replace demo URLs with production IDs.

insert into rocky_staff (id, display_name, role, line_url, line_id, note, line_user_id, sort_order, created_at)
values (
  'staff_rocky',
  '洛基',
  '店長',
  'https://line.me/R/ti/p/@rockysgarage',
  'rockysgarage',
  '美式精選、賞車估價一次談妥。',
  '',
  1,
  now()
)
on conflict (id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  line_url = excluded.line_url,
  line_id = excluded.line_id,
  note = excluded.note;

insert into rocky_site_settings (id, instagram, line_url, instagram_url, updated_at)
values (
  1,
  '',
  'https://line.me/R/ti/p/@rockysgarage',
  'https://instagram.com/rockysgarage',
  now()
)
on conflict (id) do update set
  line_url = excluded.line_url,
  instagram_url = excluded.instagram_url,
  updated_at = now();
