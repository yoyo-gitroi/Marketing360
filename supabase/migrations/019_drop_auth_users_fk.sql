-- Drop the foreign key constraint on users.id that references auth.users(id)
-- This app uses NextAuth for authentication, not Supabase Auth,
-- so there are no records in auth.users to reference.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE users ADD PRIMARY KEY (id);
