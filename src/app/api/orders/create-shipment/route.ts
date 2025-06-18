import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb/dbConnect';
import ProductOfferModel from '@/lib/mongodb/models/SellerProduct';
import UserModel from '@/lib/mongodb/models/User';
import { sendcloudService } from '@/services/shipping/sendcloudService';
import { Types } from 'mongoose';

const createShipmentSchema = z.object({
  offerId: z.string(),
  buyerId: z.string(),
  servicePointId: z.number(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = createShipmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid request body', errors: validation.error.issues }, { status: 400 });
    }

    const { offerId, buyerId, servicePointId } = validation.data;
    await dbConnect();

    const offer = await ProductOfferModel.findById(offerId).populate('seller');
    const buyer = await UserModel.findById(buyerId);

    if (!offer || !offer.seller || !buyer) {
      return NextResponse.json({ message: 'Offer, Seller or Buyer not found' }, { status: 404 });
    }
    
    // @ts-ignore
    const seller = offer.seller;

    if (!seller.sendcloudSenderId || !seller.shippingAddress) {
      return NextResponse.json({ message: 'Seller has not configured their shipping address' }, { status: 400 });
    }

    const parcelPayload = {
      name: buyer.name || 'N/A',
      email: buyer.email,
      telephone: buyer.shippingAddress?.telephone || '',
      to_service_point: servicePointId,
      sender_address: seller.sendcloudSenderId,
      weight: "1", // TODO: Get weight from product model
      request_label: true,
      apply_shipping_rules: true,
      shipment: {
        id: 8, // Use "Unstamped letter" for testing to avoid costs
      },
      parcel_items: [{
        description: offer.description?.substring(0, 35) || 'Product',
        quantity: 1,
        weight: "1.0", // TODO: Get weight from product model
        value: String(offer.price),
      }],
    };

    // Étape 1: Créer le colis via Sendcloud
    const createdParcel = await sendcloudService.createParcel(parcelPayload);

    // Étape 2: Si la création réussit, mettre à jour l'offre dans la base de données
    offer.transactionStatus = 'pending_shipment';
    offer.listingStatus = 'sold';
    offer.soldTo = new Types.ObjectId(buyerId);
    offer.shippingInfo = {
      trackingNumber: createdParcel.tracking_number,
      labelUrl: createdParcel.label.label_printer,
      servicePointId: servicePointId,
    };
    await offer.save();

    console.log(`Shipment created and offer ${offerId} updated successfully.`);
    return NextResponse.json({ success: true, trackingNumber: createdParcel.tracking_number });

  } catch (error) {
    console.error('Failed to create shipment:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
} 