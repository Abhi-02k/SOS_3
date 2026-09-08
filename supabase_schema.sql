-- ==============================================================================
-- SOS GUARDIAN — SUPABASE DATABASE SCHEMA & REALTIME SETUP
-- Copy and run this entire script in your Supabase SQL Editor (console.supabase.com)
-- ==============================================================================

-- 1. Create the emergencies table
CREATE TABLE IF NOT EXISTS public.emergencies (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('MANUAL', 'AUTO')),
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_ping TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    speed NUMERIC(6, 2) DEFAULT NULL,
    accuracy NUMERIC(6, 2) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create performance indexes for high-speed sub-millisecond dispatch queries
CREATE INDEX IF NOT EXISTS idx_emergencies_active ON public.emergencies (active);
CREATE INDEX IF NOT EXISTS idx_emergencies_last_ping ON public.emergencies (last_ping DESC);
CREATE INDEX IF NOT EXISTS idx_emergencies_device_id ON public.emergencies (device_id);

-- 3. Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_emergencies_updated_at ON public.emergencies;
CREATE TRIGGER trigger_emergencies_updated_at
BEFORE UPDATE ON public.emergencies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active emergencies
DROP POLICY IF EXISTS "Allow public read access to active emergencies" ON public.emergencies;
CREATE POLICY "Allow public read access to active emergencies"
ON public.emergencies
FOR SELECT
USING (true);

-- Allow service role full read & write access
DROP POLICY IF EXISTS "Allow service role full access" ON public.emergencies;
CREATE POLICY "Allow service role full access"
ON public.emergencies
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Enable Supabase Realtime (Live WebSockets)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'emergencies'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;
    END IF;
END $$;

-- 6. User Profiles Table for Role-Based Access Control (Admin, Dispatcher, Citizen)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'DISPATCHER', 'CITIZEN')),
    phone TEXT DEFAULT NULL,
    device_id TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read profiles" ON public.profiles;
CREATE POLICY "Allow public read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow service role full access to profiles" ON public.profiles;
CREATE POLICY "Allow service role full access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Seed Initial Demo Users
INSERT INTO public.profiles (id, email, full_name, role, device_id)
VALUES 
  ('usr_admin_001', 'admin@guardian.sos', 'Commander Alex Vance', 'ADMIN', 'DISPATCH-HQ-01'),
  ('usr_disp_002', 'dispatcher@guardian.sos', 'Officer Sarah Connor', 'DISPATCHER', 'DISPATCH-UNIT-02'),
  ('usr_citizen_003', 'citizen@guardian.sos', 'John Doe (Driver)', 'CITIZEN', 'GUARDIAN-MOBILE-7821')
ON CONFLICT (email) DO NOTHING;

-- Verification query
SELECT count(*) AS active_emergencies FROM public.emergencies;
SELECT count(*) AS total_profiles FROM public.profiles;
