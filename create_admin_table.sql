-- Create the admins table for the admin authentication system
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

-- Enable Row Level Security (RLS) if needed
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Create a policy that only allows service role to access admin data
CREATE POLICY "Service role can access admins" ON public.admins
  FOR ALL USING (auth.role() = 'service_role');

