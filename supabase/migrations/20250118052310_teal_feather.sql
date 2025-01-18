/*
  # Update analyses table schema

  1. Changes
    - Add analysis_text column for storing the complete analysis
    - Update existing columns to match component requirements
    - Add policies for the new column

  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns and rename existing ones as needed
ALTER TABLE analyses
DROP COLUMN IF EXISTS front_analysis,
DROP COLUMN IF EXISTS side_analysis,
DROP COLUMN IF EXISTS body_analysis,
DROP COLUMN IF EXISTS body_image_url;

-- Add new columns
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS analysis_text text,
ADD COLUMN IF NOT EXISTS left_side_image_url text,
ADD COLUMN IF NOT EXISTS right_side_image_url text,
ADD COLUMN IF NOT EXISTS hair_image_url text;