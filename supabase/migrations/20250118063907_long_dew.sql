/*
  # Add gender field to profiles table

  1. Changes
    - Add gender column to profiles table with type text and check constraint
    - Set default value to 'other'
    - Make column not nullable
    - Add check constraint to ensure valid gender values

  2. Notes
    - Uses safe migration pattern with IF NOT EXISTS
    - Preserves existing data by setting default value
*/

DO $$ 
BEGIN
  -- Add gender column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN gender text NOT NULL DEFAULT 'other'
    CHECK (gender IN ('male', 'female', 'other'));
  END IF;
END $$;