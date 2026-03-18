-- Drop the foreign key constraint on users.id that references auth.users(id)
-- This app uses NextAuth for authentication, not Supabase Auth,
-- so there are no records in auth.users to reference.
-- The primary key constraint remains intact.

DO $$
DECLARE
  fk_name TEXT;
BEGIN
  -- Find the FK constraint that references auth.users
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON rc.unique_constraint_name = ccu.constraint_name
  WHERE tc.table_name = 'users'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_schema = 'auth'
    AND ccu.table_name = 'users';

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', fk_name);
    RAISE NOTICE 'Dropped FK constraint: %', fk_name;
  ELSE
    RAISE NOTICE 'No FK constraint to auth.users found (may already be dropped)';
  END IF;
END $$;
