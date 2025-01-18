-- Add new columns for teeth and body analysis
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS teeth_image_url text,
ADD COLUMN IF NOT EXISTS body_image_url text,
ADD COLUMN IF NOT EXISTS teeth_rating numeric,
ADD COLUMN IF NOT EXISTS body_rating numeric;