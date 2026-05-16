-- Vendora: campaigns table
-- Tracks AI-generated marketing media campaigns per user.

create table if not exists public.campaigns (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  product_name  text not null,
  status        text not null default 'draft'
                check (status in ('draft', 'processing', 'completed', 'failed')),
  thumbnail_url text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists campaigns_user_id_created_at_idx
  on public.campaigns (user_id, created_at desc);

-- Auto-update updated_at on row modification
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.campaigns enable row level security;

drop policy if exists "Users can view own campaigns" on public.campaigns;
create policy "Users can view own campaigns"
  on public.campaigns for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own campaigns" on public.campaigns;
create policy "Users can insert own campaigns"
  on public.campaigns for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own campaigns" on public.campaigns;
create policy "Users can update own campaigns"
  on public.campaigns for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own campaigns" on public.campaigns;
create policy "Users can delete own campaigns"
  on public.campaigns for delete
  using (auth.uid() = user_id);
