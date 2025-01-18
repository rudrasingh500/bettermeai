/*
  # Add Analysis References to Posts Table

  1. Changes
    - Drop old RLS policy that depends on image columns
    - Add foreign key references for before_analysis_id and after_analysis_id
    - Drop old image URL columns
    - Add new RLS policy for shared analyses

  2. Security
    - Update RLS policies to allow viewing shared analyses
*/

-- First drop the policy that depends on the columns
DROP POLICY IF EXISTS "Users can view analyses shared in posts" ON analyses;

-- Add foreign key references for before/after analysis
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS before_analysis_id uuid REFERENCES analyses(id),
ADD COLUMN IF NOT EXISTS after_analysis_id uuid REFERENCES analyses(id);

-- Now we can safely drop the old columns
ALTER TABLE posts
DROP COLUMN IF EXISTS before_image_url,
DROP COLUMN IF EXISTS after_image_url;

-- Add new policy for viewing shared analyses
CREATE POLICY "Users can view analyses shared in posts"
  ON analyses FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM posts
      WHERE (posts.analysis_id = analyses.id)
      OR (posts.before_analysis_id = analyses.id)
      OR (posts.after_analysis_id = analyses.id)
    )
  );