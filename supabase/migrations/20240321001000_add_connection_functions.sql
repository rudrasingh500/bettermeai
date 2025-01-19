-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'connections' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE connections 
    ADD COLUMN updated_at timestamptz DEFAULT timezone('utc'::text, now());
  END IF;
END $$;

-- Function to accept a connection
create or replace function accept_connection(connection_id uuid, user_id uuid)
returns void as $$
begin
  update connections
  set status = 'accepted'
  where id = connection_id
  and (
    (user1_id = user_id and status = 'pending')
    or
    (user2_id = user_id and status = 'pending')
  );
end;
$$ language plpgsql security definer;

-- Function to reject a connection
create or replace function reject_connection(connection_id uuid, user_id uuid)
returns void as $$
begin
  update connections
  set status = 'rejected'
  where id = connection_id
  and (
    (user1_id = user_id and status = 'pending')
    or
    (user2_id = user_id and status = 'pending')
  );
end;
$$ language plpgsql security definer;

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

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

-- Drop existing triggers
drop trigger if exists handle_connection_change on public.connections;
drop trigger if exists handle_connections_updated_at on public.connections;

-- Create triggers in correct order
-- 1. First update the timestamp (BEFORE UPDATE)
create trigger handle_connections_updated_at
  before update on public.connections
  for each row
  execute function public.handle_updated_at();

-- 2. Then handle notifications (AFTER UPDATE)
create trigger handle_connection_change
  after update or insert on public.connections
  for each row
  execute function public.handle_connection_change(); 