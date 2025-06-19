import dbConnect from '@/lib/mongodb/dbConnect';
import ProductOfferModel from '@/lib/mongodb/models/SellerProduct';
import UserModel, { IShippingAddress, IUser } from '@/lib/mongodb/models/User';
import { sendcloudService } from '@/services/shipping/sendcloudService';
import { ClientSession } from 'mongoose';

/**
 * Creates a shipment by interacting with the Sendcloud API and updates the offer document.
 * This function is designed to be called within a MongoDB transaction.
 * 
 * @param offerId - The ID of the offer being shipped.
 * @param buyerId - The ID of the buyer.
 * @param servicePointId - The ID of the Sendcloud service point.
 * @param shippingAddressId - The ID of the buyer's shipping address.
 * @param session - The MongoDB client session for the transaction.
 */
export async function createShipmentInTransaction(
    offerId: string,
    buyerId: string,
    servicePointId: number,
    shippingAddressId: string,
    session: ClientSession
) {
    await dbConnect(); // Ensure DB connection is available

    // Fetch documents within the transaction
    const offer = await ProductOfferModel.findById(offerId).populate<{ seller: IUser }>({
        path: 'seller',
        select: 'shippingAddresses name email'
    }).session(session);

    const buyer = await UserModel.findById(buyerId).session(session);

    if (!offer) throw new Error(`Offer not found for ID: ${offerId}`);
    if (!buyer) throw new Error(`Buyer not found for ID: ${buyerId}`);
    if (!offer.seller) throw new Error(`Seller information is missing for offer ID: ${offerId}`);

    const sellerShippingAddress = offer.seller.shippingAddresses?.[0];
    const buyerShippingAddress = buyer.shippingAddresses?.find(addr => addr._id.toString() === shippingAddressId);

    if (!sellerShippingAddress) throw new Error("Seller's shipping address is missing.");
    if (!buyerShippingAddress) throw new Error("Buyer's shipping address is missing.");

    // Step 1: Get shipping methods for the service point
    const shippingMethods = await sendcloudService.getShippingMethodsForServicePoint(servicePointId);
    if (!shippingMethods || shippingMethods.length === 0) {
        throw new Error('No shipping methods found for this service point.');
    }
    const shippingMethodId = shippingMethods[0].id; // Use the first available method

    // Step 2: Create the parcel payload for Sendcloud
    const fromAddress = sellerShippingAddress as IShippingAddress;
    const toAddress = buyerShippingAddress as IShippingAddress;

    const parcelPayload = {
        name: buyer.name || 'N/A',
        email: buyer.email,
        telephone: toAddress.telephone || '',
        address: toAddress.address,
        house_number: toAddress.houseNumber,
        city: toAddress.city,
        postal_code: toAddress.postalCode,
        country: toAddress.country,
        to_service_point: servicePointId,
        from_address: {
            from_name: fromAddress.name,
            from_company_name: fromAddress.companyName || fromAddress.name,
            from_street: fromAddress.address,
            from_house_number: fromAddress.houseNumber,
            from_city: fromAddress.city,
            from_postal_code: fromAddress.postalCode,
            from_country: fromAddress.country,
            from_telephone: fromAddress.telephone || '',
            from_email: offer.seller.email,
        },
        weight: "1", // TODO: Get weight from product model
        request_label: true,
        apply_shipping_rules: false,
        shipment: { id: shippingMethodId },
        parcel_items: [{
            description: offer.description?.substring(0, 35) || 'Product',
            quantity: 1,
            weight: "1.0",
            value: String(offer.price),
        }],
    };

    // Step 3: Create the parcel via Sendcloud API
    const createdParcel = await sendcloudService.createParcel(parcelPayload);

    // Step 4: Update the offer with shipping information
    offer.shippingInfo = {
        trackingNumber: createdParcel.tracking_number,
        labelUrl: createdParcel.label.label_printer,
        servicePointId: servicePointId,
    };
    
    // The offer is already marked as 'sold' in the calling function.
    // We just add the shipping info.
    await offer.save({ session });

    console.log(`Shipment created and offer ${offerId} updated successfully with tracking number.`);
} 