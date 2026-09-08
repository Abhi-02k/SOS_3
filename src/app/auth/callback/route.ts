import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data.session?.user) {
        const user = data.session.user;
        const email = user.email || '';

        // Fetch user profile from database to determine role & onboarding state
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, onboarding_completed')
          .eq('email', email.toLowerCase())
          .single();

        const role = profile?.role || 'CITIZEN';
        const onboardingCompleted = Boolean(profile?.onboarding_completed);

        if (role === 'ADMIN' || role === 'DISPATCHER') {
          return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
        } else if (!onboardingCompleted) {
          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin));
        } else {
          return NextResponse.redirect(new URL('/mobile', requestUrl.origin));
        }
      }
    } catch (err) {
      console.error('Error exchanging OAuth code:', err);
    }
  }

  // Fallback redirect to mobile
  return NextResponse.redirect(new URL('/mobile', requestUrl.origin));
}
