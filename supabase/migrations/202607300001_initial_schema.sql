create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.app_role as enum ('admin', 'user');
create type public.video_job_status as enum (
  'draft',
  'uploading',
  'script_generating',
  'ready',
  'submitted',
  'processing',
  'completed',
  'failed',
  'canceled'
);

-- Password hashes stay exclusively in Supabase Auth (auth.users).
-- Duplicating password material in public.profiles would be unsafe.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique check (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
  role public.app_role not null default 'user',
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text not null check (char_length(description) between 10 and 2000),
  selling_points jsonb not null default '[]'::jsonb check (jsonb_typeof(selling_points) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique check (storage_path !~ '(^|/)\.\.(/|$)'),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  sort_order smallint not null check (sort_order between 0 and 4),
  created_at timestamptz not null default now(),
  unique (product_id, sort_order)
);

create table public.video_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  provider text not null check (provider in ('mock', 'vidnoz')),
  provider_job_id text,
  provider_video_id text,
  provider_video_name text,
  status public.video_job_status not null default 'draft',
  progress smallint not null default 0 check (progress between 0 and 100),
  language text not null check (language in ('zh-CN', 'en-US', 'ja-JP')),
  aspect_ratio text not null check (aspect_ratio in ('9:16', '1:1', '16:9')),
  duration_seconds smallint not null check (duration_seconds in (5, 10, 15)),
  avatar_id text not null,
  voice_id text not null,
  script jsonb not null,
  request_payload jsonb not null default '{}'::jsonb,
  provider_response jsonb,
  provider_created_at timestamptz,
  provider_duration_seconds numeric,
  provider_file_size bigint,
  error_code text,
  error_message text,
  retry_count smallint not null default 0 check (retry_count between 0 and 3),
  idempotency_key uuid not null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, idempotency_key)
);

create index products_user_id_idx on public.products(user_id);
create index product_assets_product_id_idx on public.product_assets(product_id);
create index video_jobs_user_id_idx on public.video_jobs(user_id);
create index video_jobs_provider_job_id_idx on public.video_jobs(provider_job_id) where provider_job_id is not null;
create index video_jobs_provider_video_id_idx on public.video_jobs(provider_video_id) where provider_video_id is not null;
create index video_jobs_status_idx on public.video_jobs(status);
create index video_jobs_created_at_idx on public.video_jobs(created_at desc);
create index video_jobs_idempotency_key_idx on public.video_jobs(idempotency_key);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger video_jobs_set_updated_at before update on public.video_jobs
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))),
    case when new.raw_user_meta_data ->> 'role' = 'admin'
      then 'admin'::public.app_role
      else 'user'::public.app_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_assets enable row level security;
alter table public.video_jobs enable row level security;

create policy profiles_select_own on public.profiles
for select using (id = auth.uid());

create policy products_own_all on public.products
for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy product_assets_own_all on public.product_assets
for all using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.products p
    where p.id = product_id and p.user_id = auth.uid()
  )
);
create policy video_jobs_select_own on public.video_jobs
for select using (user_id = auth.uid());
create policy video_jobs_insert_own on public.video_jobs
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.products p
    where p.id = product_id and p.user_id = auth.uid()
  )
);
create policy video_jobs_update_own on public.video_jobs
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_select_own on storage.objects
for select to authenticated
using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy product_images_insert_own on storage.objects
for insert to authenticated
with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy product_images_update_own on storage.objects
for update to authenticated
using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy product_images_delete_own on storage.objects
for delete to authenticated
using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
