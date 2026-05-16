-- Vendora Studio: extra fal.ai workflow inputs

alter table public.campaigns
  add column if not exists aspect_ratio       text,
  add column if not exists resolution         text,
  add column if not exists enable_web_search  boolean not null default false;
