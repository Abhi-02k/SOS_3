import { NextResponse } from 'next/server';
import { getAllEmergencies } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const emergencies = await getAllEmergencies();

    return NextResponse.json(
      {
        count: emergencies.length,
        emergencies,
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (err) {
    console.error('[GET /api/emergencies] Error fetching emergencies:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve active emergencies.' },
      { status: 500 }
    );
  }
}
