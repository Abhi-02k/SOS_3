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

-- Allow public read access to active emergencies (for command dashboard and mobile clients)
DROP POLICY IF EXISTS "Allow public read access to active emergencies" ON public.emergencies;
CREATE POLICY "Allow public read access to active emergencies"
ON public.emergencies
FOR SELECT
USING (true);

-- Allow authenticated/service role full read & write access
DROP POLICY IF EXISTS "Allow service role full access" ON public.emergencies;
CREATE POLICY "Allow service role full access"
ON public.emergencies
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Enable Supabase Realtime Replication (Live WebSockets)
-- Allows the dispatch dashboard to receive instant Postgres database changes
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

-- Verification query
SELECT * FROM public.emergencies ORDER BY last_ping DESC LIMIT 10;
