import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature');
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret || !signature) {
    return NextResponse.json({ error: 'Configuration missing' }, { status: 400 });
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  if (expectedSignature !== signature) {
    console.error('Invalid Razorpay signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const payload = JSON.parse(body);
  const event = payload.event;

  const supabase = createAdminClient();

  if (event === 'payment.captured' || event === 'order.paid') {
    const payment = payload.payload.payment.entity;
    const order = payload.payload.order?.entity;
    
    // Extract userId from notes
    const userId = payment.notes?.userId || order?.notes?.userId;
    const planType = payment.notes?.planType || order?.notes?.planType || 'yearly';

    if (userId) {
      console.log(`Processing payment for user: ${userId}, plan: ${planType}`);
      
      const now = new Date();
      const expiresAt = new Date();
      if (planType === 'yearly') {
        expiresAt.setFullYear(now.getFullYear() + 1);
      } else if (planType === 'trial') {
        expiresAt.setDate(now.getDate() + 7);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          plan: planType,
          plan_started_at: now.toISOString(),
          plan_expires_at: expiresAt.toISOString(),
          razorpay_customer_id: payment.customer_id || null,
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ status: 'ok' });
}
