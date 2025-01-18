/*
  # Add Analysis Sharing Policies

  1. Changes
    - Add RLS policy to allow users to view analyses shared in posts
    - Add RLS policy to allow users to view analyses used in before/after comparisons

  2. Security
    - Users can only view analyses that are explicitly shared through posts
    - Original RLS policies for user's own analyses remain unchanged
*/

-- Add policy to allow viewing analyses shared in posts
CREATE POLICY "Users can view analyses shared in posts"
  ON analyses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE (posts.analysis_id = analyses.id)
      OR (posts.type = 'before_after' AND (
        posts.before_image_url = analyses.front_image_url
        OR posts.after_image_url = analyses.front_image_url
      ))
    )
  );