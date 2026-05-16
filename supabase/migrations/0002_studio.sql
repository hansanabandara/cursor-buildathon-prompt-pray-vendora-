-- Vendora Studio: extend campaigns + media tracking + storage bucket
-- Adds the columns the Studio form needs and a media table that records
-- every asset (source upload, refined output, future variants/videos).

------------------------------------------------------------------
-- 1. Extend campaigns with Studio fields
------------------------------------------------------------------

alter table public.campaigns
  add column if not exists source_image_url    text,
  add column if not exists result_image_url    text,
  add column if not exists style               text,
  add column if not exists background          text,
  add column if not exists lighting            text,
  add column if not exists custom_style        text,
  add column if not exists custom_background   text,
  add column if not exists custom_lighting     text,
  add column if not exists prompt              text,
  add column if not exists fal_request_id      text,
  add column if not exists error_message       text;

------------------------------------------------------------------
-- 2. campaign_media: every asset belonging to a campaign
------------------------------------------------------------------

create table if not exists public.campaign_media (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.campaigns(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null
                check (kind in ('source', 'refined', 'variant', 'video')),
  url           text not null,
  storage_path  text,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists campaign_media_campaign_idx
  on public.campaign_media (campaign_id, created_at desc);

-- Grants (see note in 0001_campaigns.sql).
grant select, insert, update, delete on public.campaign_media to authenticated;

-- And grant the same on any future tables added to public:
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter table public.campaign_media enable row level security;

drop policy if exists "Users can view own media" on public.campaign_media;
create policy "Users can view own media"
  on public.campaign_media for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own media" on public.campaign_media;
create policy "Users can insert own media"
  on public.campaign_media for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own media" on public.campaign_media;
create policy "Users can delete own media"
  on public.campaign_media for delete
  using (auth.uid() = user_id);

------------------------------------------------------------------
-- 3. Storage bucket: campaign-media
--    Files are organised as <user_id>/<campaign_id>/<filename>
--    RLS only allows users to read/write within their own folder.
------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('campaign-media', 'campaign-media', false)
on conflict (id) do nothing;

drop policy if exists "Users can read own campaign media"   on storage.objects;
drop policy if exists "Users can upload own campaign media" on storage.objects;
drop policy if exists "Users can update own campaign media" on storage.objects;
drop policy if exists "Users can delete own campaign media" on storage.objects;

create policy "Users can read own campaign media"
  on storage.objects for select
  using (
    bucket_id = 'campaign-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload own campaign media"
  on storage.objects for insert
  with check (
    bucket_id = 'campaign-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own campaign media"
  on storage.objects for update
  using (
    bucket_id = 'campaign-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own campaign media"
  on storage.objects for delete
  using (
    bucket_id = 'campaign-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
