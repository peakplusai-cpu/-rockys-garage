-- Allow 30MB inventory photos in rocky-uploads.
-- The browser uploads directly with a signed URL; Vercel never receives the file.
-- Safe to run more than once.

update storage.buckets
set
  file_size_limit = 31457280,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
where id = 'rocky-uploads';
