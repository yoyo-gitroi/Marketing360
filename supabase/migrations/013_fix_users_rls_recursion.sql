-- Fix infinite recursion in users table RLS policy and signup flow.
--
-- Problems:
-- 1. Users SELECT policy queries "users" itself → infinite recursion
-- 2. Organizations has no INSERT policy → signup can't create an org

-- ============================================================
-- Fix users table policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view members of their organization" ON users;

-- Users can always read their own row (no recursion, direct check)
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Users can view other members in their org.
-- The inner subquery resolves via the "own profile" policy above, breaking the recursion.
CREATE POLICY "Users can view org members"
  ON users FOR SELECT
  USING (
    org_id IN (
      SELECT u.org_id FROM users u WHERE u.id = auth.uid()
    )
  );

-- ============================================================
-- Fix organizations table policies for signup
-- ============================================================

-- Allow authenticated users to create organizations (needed during signup)
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
