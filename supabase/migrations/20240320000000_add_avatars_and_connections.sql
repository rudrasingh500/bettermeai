-- Create storage bucket for avatars if it doesn't exist
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
end $$;

-- Drop existing storage policies if they exist
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Avatar images are publicly accessible" on storage.objects;

-- Create storage policy to allow authenticated users to upload their own avatar
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    auth.role() = 'authenticated' AND
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create storage policy to allow public access to avatars
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Add avatar_url to profiles if it doesn't exist
alter table public.profiles
add column if not exists avatar_url text;

-- Create connections table if it doesn't exist
create table if not exists public.connections (
  id uuid default uuid_generate_v4() primary key,
  user1_id uuid references auth.users(id) on delete cascade,
  user2_id uuid references auth.users(id) on delete cascade,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user1_id, user2_id)
);

-- Add RLS policies for connections
alter table public.connections enable row level security;

-- Drop existing connection policies if they exist
drop policy if exists "Users can view their own connections" on public.connections;
drop policy if exists "Users can create connections" on public.connections;
drop policy if exists "Users can update their own connections" on public.connections;

-- Policy to allow users to view their own connections
create policy "Users can view their own connections"
  on public.connections for select
  using (
    auth.uid()::uuid = user1_id or
    auth.uid()::uuid = user2_id
  );

-- Policy to allow users to create connections
create policy "Users can create connections"
  on public.connections for insert
  with check (
    auth.uid()::uuid = user1_id
  );

-- Policy to allow users to update their own connections
create policy "Users can update their own connections"
  on public.connections for update
  using (
    auth.uid()::uuid = user1_id or
    auth.uid()::uuid = user2_id
  );

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Drop existing trigger if exists
drop trigger if exists handle_connections_updated_at on public.connections;

-- Trigger to automatically update updated_at
create trigger handle_connections_updated_at
  before update on public.connections
  for each row
  execute function public.handle_updated_at();

-- Create index for faster connection lookups
create index if not exists connections_user1_id_idx on public.connections(user1_id);
create index if not exists connections_user2_id_idx on public.connections(user2_id);
create index if not exists connections_status_idx on public.connections(status);

-- Function to prevent self-connections
create or replace function public.prevent_self_connection()
returns trigger
language plpgsql
as $$
begin
  if new.user1_id = new.user2_id then
    raise exception 'Cannot create connection with yourself';
  end if;
  return new;
end;
$$;

-- Drop existing trigger if exists
drop trigger if exists prevent_self_connection on public.connections;

-- Trigger to prevent self-connections
create trigger prevent_self_connection
  before insert or update on public.connections
  for each row
  execute function public.prevent_self_connection(); 