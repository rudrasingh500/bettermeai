/*
  # Add rating columns to analyses table

  1. Changes
    - Add hair_rating column for hair score
    - Add face_rating column for facial features score
    - Add overall_rating column for combined score
    
  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS hair_rating numeric,
ADD COLUMN IF NOT EXISTS face_rating numeric,
ADD COLUMN IF NOT EXISTS overall_rating numeric;