/*
  # Add Bio to Profiles and Update Viewing Policies

  1. Changes
    - Add bio column to profiles table
    - Update RLS policies to allow viewing other profiles
    
  2. Security
    - Maintain existing RLS policies for updates
    - Add policy for viewing other profiles
*/

-- Add bio column to profiles
alter table public.profiles
add column if not exists bio text;

-- Drop the restrictive profile viewing policy if it exists
drop policy if exists "Users can read profiles of similar rating" on profiles;
drop policy if exists "Users can read their own profile" on profiles;

-- Create a new policy that allows viewing all profiles
create policy "Enable viewing all profiles"
  on profiles for select
  to authenticated
  using (true);

-- Keep the update policy restricted to own profile
create policy "Users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id); 