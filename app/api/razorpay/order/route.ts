import { NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Yearly Plan - ₹999
    const amount = 999 * 100; // in paise
    const currency = 'INR';

    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt: `receipt_yearly_${user.id}_${Date.now()}`,
      notes: {
        userId: user.id,
        planType: 'yearly',
      },
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
