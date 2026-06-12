-- Drop old restrict-only policies
DROP POLICY IF EXISTS "clubs: admin insert" ON clubs;
DROP POLICY IF EXISTS "clubs: admin update" ON clubs;

-- Create new policies allowing authenticated users to create clubs
CREATE POLICY "clubs: insert authenticated" ON clubs
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Allow creator or admin to update
CREATE POLICY "clubs: creator or admin update" ON clubs
  FOR UPDATE USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
