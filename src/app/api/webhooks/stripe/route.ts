import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import dbConnect from '@/lib/mongodb/dbConnect';
import OrderModel, { IOrderItem } from '@/lib/mongodb/models/OrderModel';
import CartModel from '@/lib/mongodb/models/CartModel';
import ProductOfferModel, { IProductBase } from '@/lib/mongodb/models/SellerProduct';
import { Types, ClientSession, startSession } from 'mongoose';
import { createShipmentInTransaction } from '@/services/shipping/shipmentService';
import { MongoError } from 'mongodb';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
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
        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            if (error instanceof MongoError && error.hasErrorLabel('TransientTransactionError') && i < maxRetries - 1) {
                console.log(`Transient transaction error caught. Retrying... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(res => setTimeout(res, 100 * Math.pow(2, i))); // Exponential backoff
            } else {
                const message = error instanceof Error ? error.message : 'An unknown error occurred';
                console.error('Error handling webhook event in transaction:', message);
                throw error;
            }
        }
    }
}

async function createOrderFromSingleOffer(
    userId: string,
    offerId: string,
    servicePointId: string,
    shippingAddressId: string,
    paymentIntent: Stripe.PaymentIntent,
    session: ClientSession
) {
    const offer = await ProductOfferModel.findById(offerId)
        .populate({
            path: 'seller',
            select: 'shippingAddresses email name',
        })
        .session(session);

    if (!offer) {
        throw new Error(`Offer ${offerId} not found.`);
    }
    if (offer.listingStatus === 'sold') {
        // This can happen in race conditions. Abort the transaction.
        throw new Error(`Offer ${offerId} has already been sold.`);
    }

    // Mark offer as sold
    offer.listingStatus = 'sold';
    offer.soldTo = new Types.ObjectId(userId);
    await offer.save({ session });
    console.log(`[Webhook] Offer ${offerId} marked as sold.`);

    // Create the order
    const newOrder = new OrderModel({
        buyer: new Types.ObjectId(userId),
        items: [{
            offer: offer._id,
            productModel: offer.productModel,
            seller: offer.seller,
            quantity: 1, // Quantity is 1 for a single offer
            priceAtPurchase: offer.price,
            currencyAtPurchase: 'eur',
        }],
        totalAmount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: 'processing',
        paymentIntentId: paymentIntent.id,
        paymentStatus: 'succeeded',
        paymentMethod: paymentIntent.payment_method_types[0],
        relayPointId: servicePointId,
    });
    await newOrder.save({ session });
    console.log(`[Webhook] Order ${newOrder._id} created in DB.`);

    // Trigger shipment creation directly within the transaction
    await createShipmentInTransaction(offerId, userId, Number(servicePointId), shippingAddressId, session);

    console.log(`[Webhook] Shipment process completed for single offer: ${offerId}`);
}

async function createOrderFromCart(
    userId: string,
    cartId: string,
    servicePointId: string,
    shippingAddressId: string,
    paymentIntent: Stripe.PaymentIntent,
    session: ClientSession
) {
    const cart = await CartModel.findById(cartId)
        .session(session)
        .populate({
            path: 'items.offer',
            model: 'ProductOffer',
            populate: {
                path: 'seller',
                model: 'User',
                select: 'shippingAddresses email name',
            },
        });

    if (!cart) throw new Error(`Cart with id ${cartId} not found.`);

    const orderItems: IOrderItem[] = [];
    const processedOffers = [];

    for (const item of cart.items) {
        // Cast explicite pour s'assurer que TypeScript traite l'offre comme populée
        const productOffer = item.offer as IProductBase;
        
        if (!productOffer || !productOffer.price) {
            console.warn(`Invalid product data for offer in cart ${cartId}. Skipping item.`);
            continue;
        };

        // Ensure the offer is not already sold before processing
        const freshOffer = await ProductOfferModel.findById(productOffer._id).session(session);
        if (!freshOffer) {
             throw new Error(`Offer ${productOffer._id} not found during cart processing.`);
        }
        if (freshOffer.listingStatus === 'sold') {
            console.warn(`Offer ${productOffer._id} in cart was already sold. Skipping item.`);
            // If an item was already sold, we must abort the entire transaction
            // to prevent partial fulfillment and incorrect charges.
            throw new Error(`One of the items in the cart (offer: ${productOffer._id}) has already been sold. The transaction cannot proceed.`);
        }

        // Mark the offer as sold
        freshOffer.listingStatus = 'sold';
        freshOffer.soldTo = new Types.ObjectId(userId);
        await freshOffer.save({ session });
        console.log(`[Webhook] Offer ${productOffer._id} from cart marked as sold.`);
        
        // Trigger shipment creation for each offer directly
        await createShipmentInTransaction(
            productOffer._id.toString(),
            userId,
            Number(servicePointId),
            shippingAddressId,
            session
        );
        
        orderItems.push({
            offer: productOffer._id,
            productModel: productOffer.productModel,
            seller: productOffer.seller,
            quantity: item.quantity,
            priceAtPurchase: productOffer.price,
            currencyAtPurchase: 'eur',
        });
        processedOffers.push(productOffer._id.toString());
    }

    if (orderItems.length === 0) {
        console.warn(`No valid items could be processed from cart ${cartId}. Aborting order creation.`);
        // No need to throw an error here, as the loop would have thrown if an item was invalid.
        // This case handles an empty cart being sent, which shouldn't happen.
        return;
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
        relayPointId: servicePointId, 
    });

    await newOrder.save({ session });
    console.log(`[Webhook] Order ${newOrder._id} created from cart ${cartId}.`);

    await CartModel.findByIdAndDelete(cartId, { session });
}

export async function POST(req: NextRequest) {
    if (!endpointSecret) {
        console.error('STRIPE_WEBHOOK_SECRET is not set.');
        return new NextResponse('Internal Server Error: Webhook secret not configured.', { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err: any) {
        console.error(`⚠️  Webhook signature verification failed: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const transactionLogic = async (session: ClientSession) => {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { userId, cartId, offerId, servicePointId, shippingAddressId } = paymentIntent.metadata || {};

        if (!userId || !servicePointId || !shippingAddressId) {
            console.error('Webhook received without required metadata.', paymentIntent.metadata);
            // Non-recoverable error, so we don't throw to avoid retries from Stripe.
            return;
        }

        switch (event.type) {
            case 'payment_intent.succeeded':
                console.log('✅ PaymentIntent Succeeded:', paymentIntent.id);

                if (offerId) {
                    await createOrderFromSingleOffer(userId, offerId, servicePointId, shippingAddressId, paymentIntent, session);
                } else if (cartId) {
                    await createOrderFromCart(userId, cartId, servicePointId, shippingAddressId, paymentIntent, session);
                } else {
                    console.warn('PaymentIntent succeeded but metadata was incomplete (missing offerId or cartId).', paymentIntent.metadata);
                }
                break;

            case 'payment_intent.payment_failed':
                console.log('Payment failed for intent:', paymentIntent.id);
                // Note: Finding the order to update its status might need to be outside the main transaction logic
                // if the order isn't created on failure, or handled differently.
                // For now, we assume an order might exist.
                await OrderModel.findOneAndUpdate(
                    { paymentIntentId: paymentIntent.id },
                    { status: 'payment_failed', paymentStatus: 'failed' },
                    { session }
                ).exec();
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    };

    try {
        await executeTransactionWithRetry(transactionLogic);
        return new NextResponse(null, { status: 200 });
    } catch (error) {
        // The transaction retry logic already logs the specific error.
        // This catch is for any error that escapes the retry mechanism.
        const message = error instanceof Error ? error.message : 'Unknown server error';
        return new NextResponse(`Server error processing webhook: ${message}`, { status: 500 });
    }
} 