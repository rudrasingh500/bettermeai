/*
  # Add teeth and body analysis features

  1. New Columns
    - `teeth_image_url` (text): Store URL for teeth image
    - `body_image_url` (text): Store URL for body image
    - `teeth_rating` (numeric): Store teeth rating (1-10)
    - `body_rating` (numeric): Store body rating (1-10)

  2. Changes
    - Add new columns to analyses table
    - Update overall rating calculation to include teeth and body ratings
*/

-- Add new columns for teeth and body analysis if they don't exist
DO $$ 
BEGIN
  -- Add teeth_image_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'analyses' AND column_name = 'teeth_image_url'
  ) THEN
    ALTER TABLE analyses ADD COLUMN teeth_image_url text;
  END IF;

  -- Add body_image_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'analyses' AND column_name = 'body_image_url'
  ) THEN
    ALTER TABLE analyses ADD COLUMN body_image_url text;
  END IF;

  -- Add teeth_rating
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'analyses' AND column_name = 'teeth_rating'
  ) THEN
    ALTER TABLE analyses ADD COLUMN teeth_rating numeric;
  END IF;

  -- Add body_rating
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'analyses' AND column_name = 'body_rating'
  ) THEN
    ALTER TABLE analyses ADD COLUMN body_rating numeric;
  END IF;
END $$;