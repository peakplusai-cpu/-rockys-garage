-- Rocky's Garage — isolated tables in the shared Anson Supabase project.
-- Never modify admin / staff / cars / site_settings (Anson) or atelier tables.
-- Apply in the Supabase SQL editor.

create table if not exists rocky_admin (
  id int primary key default 1 check (id = 1),
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists rocky_staff (
  id text primary key,
  display_name text not null,
  role text not null,
  line_url text not null default '',
  line_id text not null default '',
  note text not null default '',
  line_user_id text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists rocky_cars (
  id text primary key,
  slug text unique not null,
  make text not null,
  make_en text not null default '',
  model text not null,
  year int not null,
  price bigint not null,
  mileage int not null default 0,
  color text not null default '',
  interior text not null default '',
  engine text not null default '',
  horsepower int not null default 0,
  transmission text not null default '',
  drivetrain text not null default '',
  doors smallint not null default 4,
  body_type text not null default 'sedan',
  displacement text not null default '',
  options jsonb not null default '[]'::jsonb,
  specs jsonb not null default '[]'::jsonb,
  equipment jsonb not null default '[]'::jsonb,
  story text not null default '',
  status text not null default 'available',
  published boolean not null default false,
  featured boolean not null default false,
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table rocky_cars drop constraint if exists rocky_cars_doors_check;
alter table rocky_cars add constraint rocky_cars_doors_check check (doors in (2, 4, 5));

create table if not exists rocky_site_settings (
  id int primary key default 1 check (id = 1),
  instagram text not null default '',
  line_url text not null default '',
  instagram_url text not null default '',
  featured_video_url text not null default '',
  featured_video_caption text not null default '',
  updated_at timestamptz not null default now()
);

alter table rocky_admin enable row level security;
alter table rocky_staff enable row level security;
alter table rocky_cars enable row level security;
alter table rocky_site_settings enable row level security;

drop policy if exists rocky_staff_public_read on rocky_staff;
create policy rocky_staff_public_read on rocky_staff for select to anon, authenticated using (true);

drop policy if exists rocky_cars_public_read on rocky_cars;
create policy rocky_cars_public_read on rocky_cars for select to anon, authenticated using (published = true);

drop policy if exists rocky_settings_public_read on rocky_site_settings;
create policy rocky_settings_public_read on rocky_site_settings for select to anon, authenticated using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rocky-uploads',
  'rocky-uploads',
  true,
  31457280,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 31457280,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

drop policy if exists rocky_uploads_public_read on storage.objects;
create policy rocky_uploads_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'rocky-uploads');

-- line_user_id is an internal LINE binding. A table-level SELECT grant would
-- still expose it, so public roles only receive the columns the site shows.
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
