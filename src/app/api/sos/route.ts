import { NextRequest, NextResponse } from 'next/server';
import { saveEmergency } from '@/lib/redis';
import { isValidCoordinate, sanitizeDeviceId, checkRateLimit } from '@/lib/security';
import { Emergency, SosPayload } from '@/types/emergency';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`sos:${ip}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before retrying.' },
        { status: 429 }
      );
    }

    const body = (await req.json()) as Partial<SosPayload>;
    const { deviceId, lat, lng, type, speed, accuracy } = body;

    // Security validation
    const cleanDeviceId = sanitizeDeviceId(deviceId);
    if (!cleanDeviceId) {
      return NextResponse.json(
        { error: 'Invalid deviceId. Must be 3-64 alphanumeric characters.' },
        { status: 400 }
      );
    }

    if (!isValidCoordinate(lat, lng)) {
      return NextResponse.json(
        { error: 'Invalid coordinates. Latitude must be [-90, 90], Longitude [-180, 180].' },
        { status: 400 }
      );
    }

    const cleanType = type === 'AUTO' ? 'AUTO' : 'MANUAL';
    const now = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const emergencyId = `sos_${now}_${randomSuffix}`;

    const emergency: Emergency = {
      emergencyId,
      deviceId: cleanDeviceId,
      type: cleanType,
      lat: Number(lat),
      lng: Number(lng),
      active: true,
      timestamp: now,
      lastPing: now,
      speed: typeof speed === 'number' && Number.isFinite(speed) ? speed : null,
      accuracy: typeof accuracy === 'number' && Number.isFinite(accuracy) ? accuracy : null,
    };

    await saveEmergency(emergency);

    return NextResponse.json(
      {
        success: true,
        emergencyId,
        incident: emergency,
      },
      {
        status: 201,
        headers: {
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (err) {
    console.error('[POST /api/sos] Error handling emergency:', err);
    return NextResponse.json(
      { error: 'Failed to process emergency beacon.' },
      { status: 500 }
    );
  }
}
