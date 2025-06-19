import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';
import dbConnect from '@/lib/mongodb/dbConnect';
import ProductOfferModel from '@/lib/mongodb/models/SellerProduct';
import CartModel from '@/lib/mongodb/models/CartModel';
import { z } from 'zod';
import { IProductBase } from '@/lib/mongodb/models/SellerProduct';
import { IUser } from '@/lib/mongodb/models/User';

const createIntentSchema = z.object({
  amount: z.number().positive(),
  offerId: z.string().optional().nullable(),
  cartId: z.string().optional().nullable(),
  servicePointId: z.number().positive(),
  shippingAddressId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;
  await dbConnect();

  try {
    const body = await req.json();
    const validation = createIntentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid request body', errors: validation.error.issues }, { status: 400 });
    }
    const { amount, offerId, cartId, servicePointId, shippingAddressId } = validation.data;

    // --- VALIDATION DES VENDEURS ---
    if (offerId) {
      const offer = await ProductOfferModel.findById(offerId).populate<{ seller: Pick<IUser, 'shippingAddresses'> }>('seller', 'shippingAddresses');
      
      if (!offer?.seller?.shippingAddresses || offer.seller.shippingAddresses.length === 0) {
        return NextResponse.json({ message: "Le vendeur de cet article n'a pas configuré d'adresse d'expédition. Achat impossible." }, { status: 400 });
      }
    } else if (cartId) {
      const cart = await CartModel.findById(cartId).populate({
        path: 'items.offer',
        populate: { path: 'seller', select: 'shippingAddresses' }
      });
      if (!cart) {
        return NextResponse.json({ message: 'Panier non trouvé.' }, { status: 404 });
      }

      for (const item of cart.items) {
        const populatedOffer = item.offer as IProductBase & { seller: Pick<IUser, 'shippingAddresses'> };

        if (!populatedOffer?.seller?.shippingAddresses || populatedOffer.seller.shippingAddresses.length === 0) {
          return NextResponse.json({ message: `L'un des articles de votre panier ne peut pas être expédié car le vendeur n'a pas configuré d'adresse.` }, { status: 400 });
        }
      }
    }
    // --- FIN VALIDATION ---

    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId,
        offerId: offerId ?? null,
        cartId: cartId ?? null,
        servicePointId,
        shippingAddressId,
      }
    });
    
    return NextResponse.json({ clientSecret: paymentIntent.client_secret });

  } catch (error) {
    console.error(`create-intent: Error for user ${userId}:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(`Internal Server Error: ${message}`, { status: 500 });
  }
} 