-- Vendora: campaign_videos
-- Each refined image campaign can spawn multiple video renders (showcase or
-- advertisement), each parameterised differently.

create table if not exists public.campaign_videos (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,

  mode            text not null check (mode in ('showcase', 'advertisement')),
  platform        text,             -- 'instagram','facebook','youtube','x','tiktok','custom' (ad mode only)

  -- fal workflow inputs
  duration        text not null default 'auto',
  resolution      text not null default '720p',
  aspect_ratio    text not null default 'auto',
  generate_audio  boolean not null default true,

  -- styling
  video_style         text,
  custom_video_style  text,
  color_palette       text,
  custom_color_palette text,
  theme               text,
  custom_theme        text,
  background_music    text,
  custom_background_music text,
  talking_style       text,
  custom_talking_style    text,
  custom_brief        text,    -- free-form notes appended to the prompt

  -- generated artefacts
  prompt          text,
  video_url       text,
  storage_path    text,
  fal_request_id  text,
  status          text not null default 'processing'
                  check (status in ('processing', 'completed', 'failed')),
  error_message   text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists campaign_videos_campaign_idx
  on public.campaign_videos (campaign_id, created_at desc);

-- auto-update updated_at
drop trigger if exists campaign_videos_set_updated_at on public.campaign_videos;
create trigger campaign_videos_set_updated_at
  before update on public.campaign_videos
  for each row execute function public.set_updated_at();

-- Grants
grant select, insert, update, delete on public.campaign_videos to authenticated;

-- RLS
alter table public.campaign_videos enable row level security;

drop policy if exists "Users can view own videos"   on public.campaign_videos;
drop policy if exists "Users can insert own videos" on public.campaign_videos;
drop policy if exists "Users can update own videos" on public.campaign_videos;
drop policy if exists "Users can delete own videos" on public.campaign_videos;

create policy "Users can view own videos"
  on public.campaign_videos for select
  using (auth.uid() = user_id);

create policy "Users can insert own videos"
  on public.campaign_videos for insert
  with check (auth.uid() = user_id);

create policy "Users can update own videos"
  on public.campaign_videos for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own videos"
  on public.campaign_videos for delete
  using (auth.uid() = user_id);
