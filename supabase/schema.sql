-- Studiobase schema. Paste into the Supabase SQL editor and run.
-- Safe to re-run: uses IF NOT EXISTS guards.

create table if not exists public.generations (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  media_type      text not null default 'image'
                    check (media_type in ('image', 'video', 'audio')),
  prompt          text not null,
  aspect_ratio    text not null,
  image_size      text not null,
  image_key       text not null,
  reference_keys  text[] not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists generations_user_created_at_idx
  on public.generations (user_id, created_at desc);
