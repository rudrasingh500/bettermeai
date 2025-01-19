/*
  # Initial Schema Setup for BetterMe.ai

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `username` (text, unique)
      - `rating` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `analyses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `front_image_url` (text)
      - `side_image_url` (text)
      - `body_image_url` (text)
      - `front_analysis` (text)
      - `side_analysis` (text)
      - `body_analysis` (text)
      - `overall_rating` (numeric)
      - `created_at` (timestamp)
    
    - `connections`
      - `id` (uuid, primary key)
      - `user1_id` (uuid, references profiles)
      - `user2_id` (uuid, references profiles)
      - `status` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  rating numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  front_image_url text,
  side_image_url text,
  body_image_url text,
  front_analysis text,
  side_analysis text,
  body_analysis text,
  overall_rating numeric,
  created_at timestamptz DEFAULT now()
);

-- Create connections table
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  user2_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'rejected')) NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read profiles of similar rating"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS viewer
      WHERE viewer.id = auth.uid()
      AND ABS(viewer.rating - profiles.rating) <= 1
    )
  );

-- Analyses policies
CREATE POLICY "Users can read their own analyses"
  ON analyses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own analyses"
  ON analyses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Connections policies
CREATE POLICY "Users can read their own connections"
  ON connections FOR SELECT
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can create connections"
  ON connections FOR INSERT
  TO authenticated
  WITH CHECK (user1_id = auth.uid());

CREATE POLICY "Users can update their own connections"
  ON connections FOR UPDATE
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());