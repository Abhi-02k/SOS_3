import { Redis } from '@upstash/redis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Emergency } from '@/types/emergency';

// Environment variables (Server-side only)
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Global in-memory fallback for local development or disconnected state
const globalForEmergencies = globalThis as unknown as {
  inMemoryEmergencies?: Map<string, Emergency>;
};
if (!globalForEmergencies.inMemoryEmergencies) {
  globalForEmergencies.inMemoryEmergencies = new Map<string, Emergency>();
}
const memoryStore = globalForEmergencies.inMemoryEmergencies;

// Initialize Upstash Redis if configured
let redisClient: Redis | null = null;
if (upstashUrl && upstashToken && upstashUrl.startsWith('http')) {
  try {
    redisClient = new Redis({
      url: upstashUrl,
      token: upstashToken,
    });
  } catch (err) {
    console.warn('[SOS Guardian] Could not initialize Upstash Redis:', err);
  }
}

// Initialize Supabase admin client if configured
let supabaseAdmin: SupabaseClient | null = null;
if (supabaseUrl && supabaseServiceKey && supabaseUrl.startsWith('http')) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (err) {
    console.warn('[SOS Guardian] Could not initialize Supabase Admin:', err);
  }
}

const REDIS_ACTIVE_KEY = 'sos:active_ids';
const REDIS_ITEM_PREFIX = 'sos:emergency:';

/**
 * Saves a new emergency incident to Redis and secondary storage
 */
export async function saveEmergency(emergency: Emergency): Promise<void> {
  // Always maintain in memory store for instant responsiveness
  memoryStore.set(emergency.emergencyId, { ...emergency });

  // 1. Upstash Redis (Serverless-friendly state)
  if (redisClient) {
    try {
      const key = `${REDIS_ITEM_PREFIX}${emergency.emergencyId}`;
      await redisClient.set(key, JSON.stringify(emergency));
      await redisClient.sadd(REDIS_ACTIVE_KEY, emergency.emergencyId);
    } catch (err) {
      console.error('[SOS Guardian Redis] Failed to save to Upstash:', err);
    }
  }

  // 2. Supabase persistence (audit log / persistent history)
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('emergencies').upsert({
        id: emergency.emergencyId,
        device_id: emergency.deviceId,
        type: emergency.type,
        lat: emergency.lat,
        lng: emergency.lng,
        active: emergency.active,
        timestamp: new Date(emergency.timestamp).toISOString(),
        last_ping: new Date(emergency.lastPing).toISOString(),
        speed: emergency.speed ?? null,
        accuracy: emergency.accuracy ?? null,
      });
    } catch {
      // Ignored for resilience if table does not exist
    }
  }
}

/**
 * Updates coordinates and lastPing for an existing emergency incident
 */
export async function updateLocation(
  emergencyId: string,
  lat: number,
  lng: number,
  speed?: number | null,
  accuracy?: number | null
): Promise<boolean> {
  const now = Date.now();

  // Check memory store
  const existingInMemory = memoryStore.get(emergencyId);
  if (existingInMemory) {
    existingInMemory.lat = lat;
    existingInMemory.lng = lng;
    existingInMemory.lastPing = now;
    if (speed !== undefined) existingInMemory.speed = speed;
    if (accuracy !== undefined) existingInMemory.accuracy = accuracy;
    memoryStore.set(emergencyId, existingInMemory);
  }

  let updated = false;

  // 1. Upstash Redis
  if (redisClient) {
    try {
      const key = `${REDIS_ITEM_PREFIX}${emergencyId}`;
      const record = await redisClient.get<string | Emergency>(key);
      if (record) {
        const parsed: Emergency = typeof record === 'string' ? JSON.parse(record) : record;
        parsed.lat = lat;
        parsed.lng = lng;
        parsed.lastPing = now;
        if (speed !== undefined) parsed.speed = speed;
        if (accuracy !== undefined) parsed.accuracy = accuracy;
        await redisClient.set(key, JSON.stringify(parsed));
        updated = true;
      }
    } catch (err) {
      console.error('[SOS Guardian Redis] Failed to update location:', err);
    }
  }

  // 2. Supabase
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('emergencies').update({
        lat,
        lng,
        last_ping: new Date(now).toISOString(),
        speed: speed ?? null,
        accuracy: accuracy ?? null,
      }).eq('id', emergencyId);
    } catch {
      // Ignored
    }
  }

  return updated || !!existingInMemory;
}

/**
 * Deletes or marks an incident as inactive in Redis
 */
export async function deleteEmergency(emergencyId: string): Promise<boolean> {
  memoryStore.delete(emergencyId);

  let removed = false;

  // 1. Upstash Redis
  if (redisClient) {
    try {
      const key = `${REDIS_ITEM_PREFIX}${emergencyId}`;
      await redisClient.srem(REDIS_ACTIVE_KEY, emergencyId);
      await redisClient.del(key);
      removed = true;
    } catch (err) {
      console.error('[SOS Guardian Redis] Failed to delete from Upstash:', err);
    }
  }

  // 2. Supabase
  if (supabaseAdmin) {
    try {
      await supabaseAdmin
        .from('emergencies')
        .update({ active: false })
        .eq('id', emergencyId);
    } catch {
      // Ignored
    }
  }

  return removed || true;
}

/**
 * Retrieves all currently active emergencies
 */
export async function getAllEmergencies(): Promise<Emergency[]> {
  if (redisClient) {
    try {
      const activeIds = await redisClient.smembers(REDIS_ACTIVE_KEY);
      if (Array.isArray(activeIds) && activeIds.length > 0) {
        const keys = activeIds.map((id) => `${REDIS_ITEM_PREFIX}${id}`);
        const items = await redisClient.mget<(string | Emergency)[]>(...keys);
        const emergencies: Emergency[] = [];

        for (const item of items) {
          if (item) {
            const parsed: Emergency = typeof item === 'string' ? JSON.parse(item) : item;
            if (parsed && parsed.active) {
              emergencies.push(parsed);
              // sync to memory store
              memoryStore.set(parsed.emergencyId, parsed);
            }
          }
        }

        // Return sorted by most recent
        return emergencies.sort((a, b) => b.lastPing - a.lastPing);
      }
    } catch (err) {
      console.error('[SOS Guardian Redis] Failed to fetch active emergencies:', err);
    }
  }

  // 2. Fetch from Supabase PostgreSQL if configured
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('emergencies')
        .select('*')
        .eq('active', true)
        .order('last_ping', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const list: Emergency[] = data.map((row) => ({
          emergencyId: row.id,
          deviceId: row.device_id,
          type: row.type as 'MANUAL' | 'AUTO',
          lat: Number(row.lat),
          lng: Number(row.lng),
          active: Boolean(row.active),
          timestamp: new Date(row.timestamp).getTime(),
          lastPing: new Date(row.last_ping).getTime(),
          speed: row.speed !== null ? Number(row.speed) : null,
          accuracy: row.accuracy !== null ? Number(row.accuracy) : null,
          notes: row.notes,
        }));

        // Keep local cache synced
        list.forEach((item) => memoryStore.set(item.emergencyId, item));
        return list;
      }
    } catch (err) {
      // Table may not exist yet if user hasn't run the SQL migration
    }
  }

  // 3. Fallback to in-memory store
  const allInMemory = Array.from(memoryStore.values()).filter((e) => e.active);
  return allInMemory.sort((a, b) => b.lastPing - a.lastPing);
}
