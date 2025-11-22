-- ===========================================
-- ADMIN SYSTEM SETUP SCRIPT
-- Run this in your Supabase SQL editor or database console
-- ===========================================

-- 1. Create the admins table
CREATE TABLE public.admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  name text NULL,
  role text NULL DEFAULT 'admin'::text,
  is_active boolean NULL DEFAULT true,
  last_login_at timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id),
  CONSTRAINT admins_email_key UNIQUE (email),
  CONSTRAINT admins_role_check CHECK (
    (role = ANY (ARRAY['admin'::text, 'super_admin'::text]))
  )
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policy for service role access only
CREATE POLICY "Service role can access admins" ON public.admins
  FOR ALL USING (auth.role() = 'service_role');

-- 4. Insert the default admin user
-- Email: admin@goodcup.com
-- Password: temppassword123 (CHANGE THIS IN PRODUCTION!)
INSERT INTO admins (email, password_hash, name, role, is_active) VALUES (
  'admin@goodcup.com',
  '$2b$12$Z6Pk5Nztcump3hLk0PTBf.p75Ky8RKG0B6Tt1yWLEUAmq0OwLYJwO',
  'Admin User',
  'super_admin',
  true
);

-- ===========================================
-- SETUP COMPLETE
-- ===========================================
-- You can now log in to /admin/login with:
-- Email: admin@goodcup.com
-- Password: temppassword123
--
-- REMEMBER TO CHANGE THE PASSWORD IN PRODUCTION!

