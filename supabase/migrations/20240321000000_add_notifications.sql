-- Create notifications table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('connection_request', 'connection_accepted', 'connection_rejected')),
  data jsonb not null default '{}'::jsonb,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid()::uuid = user_id);

-- Add update policy for notifications
create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid()::uuid = user_id)
  with check (auth.uid()::uuid = user_id);

-- Function to create notification
create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_data jsonb
) returns void as $$
begin
  insert into public.notifications (user_id, type, data)
  values (p_user_id, p_type, p_data);
end;
$$ language plpgsql security definer;

-- Function to handle connection changes
create or replace function public.handle_connection_change()
returns trigger as $$
begin
  -- For new connection requests
  if (TG_OP = 'INSERT') then
    -- Create notification for the recipient
    perform public.create_notification(
      new.user2_id,
      'connection_request',
      jsonb_build_object(
        'connection_id', new.id,
        'user_id', new.user1_id
      )
    );
  -- For status updates
  elsif (TG_OP = 'UPDATE' and old.status != new.status) then
    -- If accepted, notify the requester
    if (new.status = 'accepted') then
      perform public.create_notification(
        new.user1_id,
        'connection_accepted',
        jsonb_build_object(
          'connection_id', new.id,
          'user_id', new.user2_id
        )
      );
    -- If rejected, notify the requester
    elsif (new.status = 'rejected') then
      perform public.create_notification(
        new.user1_id,
        'connection_rejected',
        jsonb_build_object(
          'connection_id', new.id,
          'user_id', new.user2_id
        )
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for connection changes
drop trigger if exists handle_connection_change on public.connections;
create trigger handle_connection_change
  after insert or update on public.connections
  for each row
  execute function public.handle_connection_change();

-- Enable realtime for notifications
alter publication supabase_realtime add table public.notifications;

-- Add indexes for better performance
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_read_idx on public.notifications(read);
create index if not exists notifications_created_at_idx on public.notifications(created_at); 