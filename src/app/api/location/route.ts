import { NextRequest, NextResponse } from 'next/server';
import { updateLocation } from '@/lib/redis';
import { isValidCoordinate, sanitizeEmergencyId, checkRateLimit } from '@/lib/security';
import { LocationUpdatePayload } from '@/types/emergency';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    // Allow frequent telemetry pings (up to 120 per minute)
    const rateCheck = checkRateLimit(`loc:${ip}`, 120, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429 }
      );
    }

    const body = (await req.json()) as Partial<LocationUpdatePayload>;
    const { emergencyId, lat, lng, speed, accuracy } = body;

    const cleanId = sanitizeEmergencyId(emergencyId);
    if (!cleanId) {
      return NextResponse.json(
        { error: 'Invalid emergencyId.' },
        { status: 400 }
      );
    }

    if (!isValidCoordinate(lat, lng)) {
      return NextResponse.json(
        { error: 'Invalid coordinates provided.' },
        { status: 400 }
      );
    }

    const success = await updateLocation(
      cleanId,
      Number(lat),
      Number(lng),
      typeof speed === 'number' && Number.isFinite(speed) ? speed : null,
      typeof accuracy === 'number' && Number.isFinite(accuracy) ? accuracy : null
    );

    return NextResponse.json(
      { success, updated: success },
      {
        status: 200,
        headers: {
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (err) {
    console.error('[POST /api/location] Error updating beacon location:', err);
    return NextResponse.json(
      { error: 'Failed to update incident location.' },
      { status: 500 }
    );
  }
}
