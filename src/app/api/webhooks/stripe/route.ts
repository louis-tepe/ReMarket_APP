import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import dbConnect from '@/lib/mongodb/dbConnect';
import OrderModel from '@/lib/mongodb/models/OrderModel';
import CartModel from '@/lib/mongodb/models/CartModel';
import ProductOfferModel, { IProductOffer } from '@/lib/mongodb/models/SellerProduct';
import { IOrderItem } from '@/lib/mongodb/models/OrderModel';
import { Types } from 'mongoose';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function createOrderFromCart(userId: string, cartId: string, paymentIntent: Stripe.PaymentIntent) {
    await dbConnect();
    const cart = await CartModel.findById(cartId).populate({
        path: 'items.productId',
        model: 'ProductOffer',
    });

    if (!cart) throw new Error(`Cart with id ${cartId} not found.`);

    const orderItems: IOrderItem[] = cart.items.map(item => {
        const product = item.productId as IProductOffer;
        if (!product || !product.price) throw new Error('Invalid product data in cart.');
        
        return {
            _id: new Types.ObjectId(),
            offer: product._id,
            productModel: product.productModel,
            seller: product.seller,
            quantity: item.quantity,
            priceAtPurchase: product.price,
            currencyAtPurchase: 'eur',
        };
    });

    const newOrder = new OrderModel({
        buyer: userId,
        items: orderItems,
        totalAmount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: 'processing',
        paymentIntentId: paymentIntent.id,
        paymentStatus: 'succeeded',
        paymentMethod: paymentIntent.payment_method_types[0],
        relayPointId: 'relay_point_placeholder', // Placeholder - to be updated
    });

    await newOrder.save();
    // Vider le panier après la création de la commande
    await CartModel.findByIdAndDelete(cartId);

    return newOrder;
}

export async function POST(req: Request) {
    const body = await req.text();
    const signature = headers().get('stripe-signature') as string;

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Error verifying webhook signature: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { userId, cartId, offerId, servicePointId } = paymentIntent.metadata || {};

    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                console.log('PaymentIntent succeeded:', paymentIntent.id);
                
                // Logic for single offer purchase
                if (offerId && userId && servicePointId) {
                    console.log(`Handling single offer purchase: offerId=${offerId}, userId=${userId}, servicePointId=${servicePointId}`);
                    
                    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/orders/create-shipment`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            // TODO: Secure this endpoint, e.g., with a secret key
                        },
                        body: JSON.stringify({
                            offerId,
                            buyerId: userId,
                            servicePointId: Number(servicePointId),
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.text();
                        throw new Error(`Failed to create shipment: ${errorData}`);
                    }
                    console.log("Successfully triggered shipment creation for offer:", offerId);

                } else if (cartId && userId) { // Existing cart logic
                    console.log(`Handling cart purchase: cartId=${cartId}, userId=${userId}`);
                    await createOrderFromCart(userId, cartId, paymentIntent);
                
                } else {
                    console.warn('PaymentIntent succeeded but metadata was incomplete.', paymentIntent.metadata);
                }
                break;
            
            case 'payment_intent.payment_failed':
                console.log('Payment failed for intent:', paymentIntent.id);
                // Optionnel: Mettre à jour une commande existante au statut 'payment_failed'
                await OrderModel.findOneAndUpdate(
                    { paymentIntentId: paymentIntent.id },
                    { status: 'payment_failed', paymentStatus: 'failed' }
                );
                break;
        }
    } catch (error: any) {
        console.error('Error handling webhook event:', error.message);
        return new NextResponse('Webhook handler failed.', { status: 500 });
    }

    return new NextResponse('Received', { status: 200 });
} 