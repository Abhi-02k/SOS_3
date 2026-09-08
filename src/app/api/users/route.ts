import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '@/types/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: any = null;
if (supabaseUrl && supabaseServiceKey && supabaseUrl.startsWith('http')) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  } catch (err) {
    console.warn('Could not init Supabase Admin for users API:', err);
  }
}

// In-memory fallback profiles (empty for production)
const inMemoryProfiles: Map<string, UserProfile> = new Map();

export async function GET() {
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: UserProfile[] = (data as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id || ''),
          email: String(row.email || ''),
          fullName: String(row.full_name || ''),
          avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url : undefined,
          role: (row.role as UserProfile['role']) || 'CITIZEN',
          phone: typeof row.phone === 'string' ? row.phone : undefined,
          deviceId: typeof row.device_id === 'string' ? row.device_id : undefined,
          bloodGroup: typeof row.blood_group === 'string' ? row.blood_group : undefined,
          medicalNotes: typeof row.medical_notes === 'string' ? row.medical_notes : undefined,
          vehicleInfo: typeof row.vehicle_info === 'string' ? row.vehicle_info : undefined,
          emergencyContacts: Array.isArray(row.emergency_contacts)
            ? (row.emergency_contacts as UserProfile['emergencyContacts'])
            : [],
          onboardingCompleted: Boolean(row.onboarding_completed),
          createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
          lastLogin: typeof row.updated_at === 'string' ? row.updated_at : undefined,
        }));
        return NextResponse.json({ users: mapped });
      }
    }

    return NextResponse.json({
      users: Array.from(inMemoryProfiles.values()),
    });
  } catch (err) {
    console.error('Error in GET /api/users:', err);
    return NextResponse.json({ users: Array.from(inMemoryProfiles.values()) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UserProfile;
    if (!body || !body.email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    inMemoryProfiles.set(body.id || body.email, body);

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('profiles').upsert({
          id: body.id || `usr_${Date.now()}`,
          email: body.email.toLowerCase(),
          full_name: body.fullName || 'User',
          avatar_url: body.avatarUrl || null,
          role: body.role || 'CITIZEN',
          phone: body.phone || null,
          device_id: body.deviceId || null,
          blood_group: body.bloodGroup || null,
          medical_notes: body.medicalNotes || null,
          vehicle_info: body.vehicleInfo || null,
          emergency_contacts: body.emergencyContacts || [],
          onboarding_completed: body.onboardingCompleted ?? false,
        } as Record<string, unknown>);
      } catch (e) {
        console.warn('Could not sync user to Supabase:', e);
      }
    }

    return NextResponse.json({ success: true, user: body });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      userId?: string;
      role?: UserProfile['role'];
      phone?: string;
      fullName?: string;
      bloodGroup?: string;
      medicalNotes?: string;
      vehicleInfo?: string;
      emergencyContacts?: UserProfile['emergencyContacts'];
      onboardingCompleted?: boolean;
    };
    const { userId, role, phone, fullName, bloodGroup, medicalNotes, vehicleInfo, emergencyContacts, onboardingCompleted } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Update memory
    for (const [key, user] of inMemoryProfiles.entries()) {
      if (user.id === userId || user.email === userId) {
        if (role !== undefined) user.role = role;
        if (phone !== undefined) user.phone = phone;
        if (fullName !== undefined) user.fullName = fullName;
        if (bloodGroup !== undefined) user.bloodGroup = bloodGroup;
        if (medicalNotes !== undefined) user.medicalNotes = medicalNotes;
        if (vehicleInfo !== undefined) user.vehicleInfo = vehicleInfo;
        if (emergencyContacts !== undefined) user.emergencyContacts = emergencyContacts;
        if (onboardingCompleted !== undefined) user.onboardingCompleted = onboardingCompleted;
        inMemoryProfiles.set(key, user);
        break;
      }
    }

    if (supabaseAdmin) {
      try {
        const updatePayload: Record<string, unknown> = {};
        if (role !== undefined) updatePayload.role = role;
        if (phone !== undefined) updatePayload.phone = phone;
        if (fullName !== undefined) updatePayload.full_name = fullName;
        if (bloodGroup !== undefined) updatePayload.blood_group = bloodGroup;
        if (medicalNotes !== undefined) updatePayload.medical_notes = medicalNotes;
        if (vehicleInfo !== undefined) updatePayload.vehicle_info = vehicleInfo;
        if (emergencyContacts !== undefined) updatePayload.emergency_contacts = emergencyContacts;
        if (onboardingCompleted !== undefined) updatePayload.onboarding_completed = onboardingCompleted;

        await supabaseAdmin
          .from('profiles')
          .update(updatePayload)
          .eq('id', userId);
      } catch (e) {
        console.warn('Could not update user in Supabase:', e);
      }
    }

    return NextResponse.json({ success: true, message: 'User updated' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
