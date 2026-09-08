-- ==============================================================================
-- SOS GUARDIAN — PRODUCTION SUPABASE SCHEMA & REALTIME SETUP (IDEMPOTENT / MIGRATION-SAFE)
-- Copy and run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- Safe to run on fresh or existing databases (adds missing columns automatically).
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. User Profiles Table (Integrated with Google OAuth & Driver Onboarding)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL DEFAULT 'Citizen Responder',
    role TEXT NOT NULL DEFAULT 'CITIZEN' CHECK (role IN ('ADMIN', 'DISPATCHER', 'CITIZEN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent Column Additions (ensures existing tables get all new columns)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_id TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blood_group TEXT DEFAULT 'UNKNOWN';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS medical_notes TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_info TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ DEFAULT NOW();

-- Performance Indexes on Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON public.profiles (onboarding_completed);

-- ==============================================================================
-- 3. Emergencies Table (Real-Time SOS & Crash Incidents with Medical/Family Telemetry)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.emergencies (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL DEFAULT 'DEV-UNKNOWN',
    type TEXT NOT NULL DEFAULT 'MANUAL' CHECK (type IN ('MANUAL', 'AUTO')),
    lat DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    lng DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_ping TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent Column Additions for Emergencies
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS driver_name TEXT DEFAULT NULL;
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS driver_phone TEXT DEFAULT NULL;
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS blood_group TEXT DEFAULT NULL;
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS medical_notes TEXT DEFAULT NULL;
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS vehicle_info TEXT DEFAULT NULL;
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISPATCHED', 'RESOLVED', 'CANCELLED'));
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS speed NUMERIC(6, 2) DEFAULT NULL;
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS accuracy NUMERIC(6, 2) DEFAULT NULL;
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS heading NUMERIC(6, 2) DEFAULT NULL;
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS responder_notes TEXT DEFAULT NULL;
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS assigned_unit TEXT DEFAULT NULL;
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS resolved_by TEXT DEFAULT NULL;
ALTER TABLE public.emergencies ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ DEFAULT NULL;

-- Performance Indexes on Emergencies
CREATE INDEX IF NOT EXISTS idx_emergencies_active ON public.emergencies (active);
CREATE INDEX IF NOT EXISTS idx_emergencies_status ON public.emergencies (status);
CREATE INDEX IF NOT EXISTS idx_emergencies_last_ping ON public.emergencies (last_ping DESC);
CREATE INDEX IF NOT EXISTS idx_emergencies_device_id ON public.emergencies (device_id);
CREATE INDEX IF NOT EXISTS idx_emergencies_user_id ON public.emergencies (user_id);

-- ==============================================================================
-- 4. Emergency GPS Breadcrumbs Table (Trajectory Tracking for Moving Vehicles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.emergency_breadcrumbs (
    id BIGSERIAL PRIMARY KEY,
    emergency_id TEXT NOT NULL REFERENCES public.emergencies(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    speed NUMERIC(6, 2) DEFAULT NULL,
    accuracy NUMERIC(6, 2) DEFAULT NULL,
    heading NUMERIC(6, 2) DEFAULT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breadcrumbs_emergency_id ON public.emergency_breadcrumbs (emergency_id, timestamp DESC);

-- ==============================================================================
-- 5. Audit Logs Table (Emergency Dispatch Actions & Relative Notification Log)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    emergency_id TEXT REFERENCES public.emergencies(id) ON DELETE SET NULL,
    user_id TEXT DEFAULT NULL,
    user_email TEXT DEFAULT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_emergency_id ON public.audit_logs (emergency_id);

-- ==============================================================================
-- 6. Automatic updated_at Trigger Functions
-- ==============================================================================
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

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 7. Automatic Google OAuth User Synchronization Trigger
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    user_full_name TEXT;
    user_avatar TEXT;
    user_role TEXT;
BEGIN
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    user_avatar := NEW.raw_user_meta_data->>'avatar_url';

    -- Auto-assign ADMIN if email contains 'admin'
    IF NEW.email ILIKE '%admin%' THEN
        user_role := 'ADMIN';
    ELSIF NEW.email ILIKE '%dispatch%' THEN
        user_role := 'DISPATCHER';
    ELSE
        user_role := 'CITIZEN';
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        avatar_url,
        role,
        onboarding_completed,
        last_login
    )
    VALUES (
        NEW.id::TEXT,
        NEW.email,
        user_full_name,
        user_avatar,
        user_role,
        (user_role != 'CITIZEN'),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
        avatar_url = EXCLUDED.avatar_url,
        last_login = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on Supabase auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- 8. Row Level Security (RLS) Configuration
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_breadcrumbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Allow public read profiles" ON public.profiles;
CREATE POLICY "Allow public read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow service role full access to profiles" ON public.profiles;
CREATE POLICY "Allow service role full access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Emergencies Policies
DROP POLICY IF EXISTS "Allow public read active emergencies" ON public.emergencies;
CREATE POLICY "Allow public read active emergencies" ON public.emergencies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow service role full access to emergencies" ON public.emergencies;
CREATE POLICY "Allow service role full access to emergencies" ON public.emergencies FOR ALL USING (true) WITH CHECK (true);

-- Breadcrumbs Policies
DROP POLICY IF EXISTS "Allow public read breadcrumbs" ON public.emergency_breadcrumbs;
CREATE POLICY "Allow public read breadcrumbs" ON public.emergency_breadcrumbs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow service role full access to breadcrumbs" ON public.emergency_breadcrumbs;
CREATE POLICY "Allow service role full access to breadcrumbs" ON public.emergency_breadcrumbs FOR ALL USING (true) WITH CHECK (true);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Allow service role full access to audit logs" ON public.audit_logs;
CREATE POLICY "Allow service role full access to audit logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 9. Realtime Publication Setup (Live Radar & Incident Updates)
-- ==============================================================================
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

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'emergency_breadcrumbs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_breadcrumbs;
    END IF;
END $$;

-- ==============================================================================
-- 10. Initial Seed Data (Pre-configured Admins & Driver Profile)
-- ==============================================================================
INSERT INTO public.profiles (
    id, email, full_name, role, phone, device_id, blood_group, medical_notes, emergency_contacts, onboarding_completed
)
VALUES 
  (
    'usr_admin_001',
    'admin@guardian.sos',
    'Commander Alex Vance',
    'ADMIN',
    '+1 (555) 911-0001',
    'DISPATCH-HQ-01',
    'O+',
    'No known medical conditions',
    '[]'::jsonb,
    TRUE
  ),
  (
    'usr_disp_002',
    'dispatcher@guardian.sos',
    'Officer Sarah Connor',
    'DISPATCHER',
    '+1 (555) 911-0002',
    'DISPATCH-UNIT-02',
    'A+',
    'No allergies',
    '[]'::jsonb,
    TRUE
  ),
  (
    'usr_citizen_003',
    'citizen@guardian.sos',
    'John Doe (Driver)',
    'CITIZEN',
    '+1 (555) 911-0003',
    'GUARDIAN-MOBILE-7821',
    'O+',
    'Asthma, carries inhaler',
    '[{"name": "Jane Doe", "relationship": "Spouse", "phone": "+1 (555) 999-8877"}]'::jsonb,
    TRUE
  )
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    blood_group = EXCLUDED.blood_group,
    medical_notes = EXCLUDED.medical_notes,
    emergency_contacts = EXCLUDED.emergency_contacts,
    onboarding_completed = EXCLUDED.onboarding_completed;

-- Verification Queries
SELECT count(*) AS total_profiles FROM public.profiles;
SELECT count(*) AS active_emergencies FROM public.emergencies;
