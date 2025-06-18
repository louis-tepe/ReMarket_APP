import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import dbConnect from '@/lib/mongodb/dbConnect';
import OrderModel from '@/lib/mongodb/models/OrderModel';
import CartModel from '@/lib/mongodb/models/CartModel';
import ProductOfferModel, { IProductOffer } from '@/lib/mongodb/models/SellerProduct';
import { IOrderItem } from '@/lib/mongodb/models/OrderModel';
import { Types, ClientSession, startSession } from 'mongoose';
import clientPromise from '@/lib/mongoClient';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
export const dynamic = 'force-dynamic';

async function executeTransactionWithRetry(
    operation: (session: ClientSession) => Promise<void>,
    maxRetries = 3
) {
    for (let i = 0; i < maxRetries; i++) {
        const session = await startSession();
        session.startTransaction();
        try {
            await operation(session);
            await session.commitTransaction();
            session.endSession();
            return;
        } catch (error: any) {
            await session.abortTransaction();
            session.endSession();

            if (error.errorLabels?.includes('TransientTransactionError') && i < maxRetries - 1) {
                console.log(`Transient transaction error caught. Retrying... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(res => setTimeout(res, 100 * Math.pow(2, i))); // Exponential backoff
            } else {
                console.error('Error handling webhook event in transaction:', error.message);
                throw error;
            }
        }
    }
}

async function createOrderFromCart(userId: string, cartId: string, paymentIntent: Stripe.PaymentIntent, session: ClientSession) {
    const cart = await CartModel.findById(cartId).session(session).populate<{ items: { offer: IProductOffer }[] }>({
        path: 'items.offer',
        model: 'ProductOffer',
    });

    if (!cart) throw new Error(`Cart with id ${cartId} not found.`);

    const orderItems: IOrderItem[] = [];

    for (const item of cart.items) {
        const productOffer = item.offer as IProductOffer;
        if (!productOffer || !productOffer.price) throw new Error('Invalid product data in cart.');
        
        // Mettre à jour l'offre pour la marquer comme vendue
        productOffer.soldTo = new Types.ObjectId(userId);
        productOffer.listingStatus = 'sold';
        productOffer.transactionStatus = 'pending_shipment';
        await productOffer.save({ session });
        
        orderItems.push({
            _id: new Types.ObjectId(),
            offer: productOffer._id,
            productModel: productOffer.productModel,
            seller: productOffer.seller,
            quantity: item.quantity,
            priceAtPurchase: productOffer.price,
            currencyAtPurchase: 'eur',
        });
    }

    const newOrder = new OrderModel({
        buyer: new Types.ObjectId(userId),
        items: orderItems,
        totalAmount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: 'processing',
        paymentIntentId: paymentIntent.id,
        paymentStatus: 'succeeded',
        paymentMethod: paymentIntent.payment_method_types[0],
        relayPointId: 'relay_point_placeholder', 
    });

    await newOrder.save({ session });
    await CartModel.findByIdAndDelete(cartId, { session });
}

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Error verifying webhook signature: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    console.log(`Stripe Webhook: Received event ${event.type}. Metadata:`, paymentIntent.metadata);
    
    await dbConnect();

    const transactionLogic = async (session: ClientSession) => {
        const { userId, cartId, offerId, servicePointId } = paymentIntent.metadata || {};

        switch (event.type) {
            case 'payment_intent.succeeded':
                console.log('PaymentIntent succeeded:', paymentIntent.id);
                
                if (offerId && userId && servicePointId) {
                    console.log(`Handling single offer purchase: offerId=${offerId}, userId=${userId}, servicePointId=${servicePointId}`);
                    
                    // La logique de mise à jour de l'offre est maintenant gérée par la route 'create-shipment'
                    // pour assurer une transaction atomique. On se contente de déclencher la création.

                    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/orders/create-shipment`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            offerId,
                            buyerId: userId,
                            servicePointId: Number(servicePointId),
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.text();
                        // Il est crucial de lever une erreur ici pour que la transaction soit annulée
                        // si la création du bordereau échoue.
                        throw new Error(`Failed to create shipment, transaction will be rolled back: ${errorData}`);
                    }
                    console.log("Successfully triggered shipment creation for offer:", offerId);

                } else if (cartId && userId) {
                    console.log(`Handling cart purchase: cartId=${cartId}, userId=${userId}`);
                    await createOrderFromCart(userId, cartId, paymentIntent, session);
                
                } else {
                    console.warn('PaymentIntent succeeded but metadata was incomplete.', paymentIntent.metadata);
                }
                break;
            
            case 'payment_intent.payment_failed':
                console.log('Payment failed for intent:', paymentIntent.id);
                await OrderModel.findOneAndUpdate(
                    { paymentIntentId: paymentIntent.id },
                    { status: 'payment_failed', paymentStatus: 'failed' },
                    { session }
                );
                break;
        }
    };

    try {
        await executeTransactionWithRetry(transactionLogic);
    } catch (error) {
        return new NextResponse('Webhook handler failed after multiple retries.', { status: 500 });
    }

    return new NextResponse('Received', { status: 200 });
} 