import { NextRequest, NextResponse } from 'next/server';
import { deleteEmergency } from '@/lib/redis';
import { sanitizeEmergencyId } from '@/lib/security';
import { EndEmergencyPayload } from '@/types/emergency';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<EndEmergencyPayload>;
    const { emergencyId } = body;

    const cleanId = sanitizeEmergencyId(emergencyId);
    if (!cleanId) {
      return NextResponse.json(
        { error: 'Invalid emergencyId.' },
        { status: 400 }
      );
    }

    const success = await deleteEmergency(cleanId);

    return NextResponse.json(
      { success, message: 'Emergency marked as resolved and terminated.' },
      {
        status: 200,
        headers: {
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (err) {
    console.error('[POST /api/emergency/end] Error resolving emergency:', err);
    return NextResponse.json(
      { error: 'Failed to end emergency incident.' },
      { status: 500 }
    );
  }
}
