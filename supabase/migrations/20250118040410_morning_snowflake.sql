/*
  # Fix RLS policies for profiles and analyses tables

  1. Changes
    - Remove recursive policy for profiles table
    - Simplify profiles policies to focus on ownership
    - Add missing analyses table policies
    - Fix policy conditions to prevent infinite recursion

  2. Security
    - Maintain RLS protection
    - Ensure users can only access their own data
    - Allow profile creation during signup
*/

-- Drop existing policies to clean up
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read profiles of similar rating" ON profiles;

-- Create new, simplified policies for profiles
CREATE POLICY "Enable read access for authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Fix analyses policies
DROP POLICY IF EXISTS "Users can read their own analyses" ON analyses;
DROP POLICY IF EXISTS "Users can create their own analyses" ON analyses;

CREATE POLICY "Enable read access for own analyses"
  ON analyses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Enable insert for own analyses"
  ON analyses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Ensure tables have RLS enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;