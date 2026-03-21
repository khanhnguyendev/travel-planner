-- Allow users to update their own profile row (display_name only; avatar managed by OAuth)
CREATE POLICY "profiles: users can update own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
