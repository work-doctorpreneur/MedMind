import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already had a trial or is already a member
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, plan_started_at')
      .eq('id', user.id)
      .single();

    if (profile?.plan_started_at) {
      return NextResponse.json({ error: 'Trial already used or plan already active' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(now.getDate() + 7);

    const { error } = await adminSupabase
      .from('profiles')
      .update({
        plan: 'trial',
        plan_started_at: now.toISOString(),
        plan_expires_at: expiresAt.toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ status: 'ok', expires_at: expiresAt.toISOString() });
  } catch (error: any) {
    console.error('Trial start error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
