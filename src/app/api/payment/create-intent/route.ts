import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';
import dbConnect from '@/lib/mongodb/dbConnect';
import CartModel from '@/lib/mongodb/models/CartModel';
import { IProductOffer } from '@/lib/mongodb/models/SellerProduct';

// S'assure que l'objet populé a bien les propriétés attendues
function isPopulatedOffer(item: any): item is { productId: IProductOffer, quantity: number } {
  return item.productId && typeof item.productId === 'object' && 'price' in item.productId;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  await dbConnect();

  try {
    const { amount, offerId, servicePointId } = await req.json();

    if (typeof amount !== 'number' || amount <= 0) {
        return new NextResponse('Invalid amount specified', { status: 400 });
    }
    if (!offerId || !servicePointId) {
        return new NextResponse('Missing offerId or servicePointId', { status: 400 });
    }

    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: session.user.id,
        offerId: offerId,
        servicePointId: servicePointId,
      }
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });

  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
} 