import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('payment_intent_id');

    if (!paymentIntentId) {
        return NextResponse.json({ error: 'Payment Intent ID is required' }, { status: 400 });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        return NextResponse.json({
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
        });
    } catch (error) {
        console.error("Failed to retrieve payment intent:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: 'Failed to retrieve payment details', details: errorMessage }, { status: 500 });
    }
} 