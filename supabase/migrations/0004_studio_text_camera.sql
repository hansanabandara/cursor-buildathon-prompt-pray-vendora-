-- Vendora Studio: keep-product-name text-cleanup toggle + camera angle

alter table public.campaigns
  add column if not exists remove_other_text     boolean not null default false,
  add column if not exists camera_angle          text,
  add column if not exists custom_camera_angle   text;
