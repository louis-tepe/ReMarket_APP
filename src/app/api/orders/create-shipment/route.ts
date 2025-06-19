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
    
    // @ts-expect-error
    const seller = offer.seller;

    if (!seller.shippingAddress) {
      return NextResponse.json({ message: 'Le vendeur n\'a pas configuré son adresse d\'expédition' }, { status: 400 });
    }

    if (!buyer.shippingAddress) {
        return NextResponse.json({ message: 'L\'acheteur n\'a pas configuré son adresse de livraison' }, { status: 400 });
    }

    // Étape 1: Récupérer les méthodes d'envoi pour le point relais
    const shippingMethods = await sendcloudService.getShippingMethodsForServicePoint(servicePointId);
    if (!shippingMethods || shippingMethods.length === 0) {
      return NextResponse.json({ message: 'Aucune méthode de livraison trouvée pour ce point relais' }, { status: 400 });
    }
    const shippingMethodId = shippingMethods[0].id; // On prend la première méthode disponible

    const parcelPayload = {
      name: buyer.name || 'N/A',
      email: buyer.email,
      telephone: buyer.shippingAddress.telephone || '',

      // Recipient address is required even for service point delivery
      address: buyer.shippingAddress.address,
      house_number: buyer.shippingAddress.houseNumber,
      city: buyer.shippingAddress.city,
      postal_code: buyer.shippingAddress.postalCode,
      country: buyer.shippingAddress.country,

      to_service_point: servicePointId,
      
      from_address: {
        from_name: seller.shippingAddress.name,
        from_company_name: seller.shippingAddress.companyName || seller.shippingAddress.name,
        from_street: seller.shippingAddress.address,
        from_house_number: seller.shippingAddress.houseNumber,
        from_city: seller.shippingAddress.city,
        from_postal_code: seller.shippingAddress.postalCode,
        from_country: seller.shippingAddress.country,
        from_telephone: seller.shippingAddress.telephone || '',
        from_email: seller.email,
      },

      weight: "1", // TODO: Get weight from product model
      request_label: true,
      apply_shipping_rules: false, // On désactive car on choisit manuellement la méthode
      shipment: {
        id: shippingMethodId, 
      },
      parcel_items: [{
        description: offer.description?.substring(0, 35) || 'Product',
        quantity: 1,
        weight: "1.0", // TODO: Get weight from product model
        value: String(offer.price),
      }],
    };

    // Étape 2: Créer le colis via Sendcloud
    const createdParcel = await sendcloudService.createParcel(parcelPayload);

    // Étape 3: Si la création réussit, mettre à jour l'offre dans la base de données
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