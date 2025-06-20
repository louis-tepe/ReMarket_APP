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

    // Add robust validation to prevent API errors with incomplete addresses
    if (!buyerShippingAddress.name || !buyerShippingAddress.address || !buyerShippingAddress.city || !buyerShippingAddress.country || !buyerShippingAddress.postalCode || !buyerShippingAddress.telephone) {
      throw new Error(`Buyer's shipping address (ID: ${shippingAddressId}) is incomplete. Please update it in your account settings.`);
    }
    if (!sellerShippingAddress.name || !sellerShippingAddress.address || !sellerShippingAddress.city || !sellerShippingAddress.country || !sellerShippingAddress.postalCode || !sellerShippingAddress.telephone) {
      throw new Error(`The seller's shipping address is incomplete. This purchase cannot be completed at this time.`);
    }

    // Step 1: Get shipping methods available for the specific sender and service point
    const shippingMethods = await sendcloudService.getShippingMethods({
      servicePointId: servicePointId,
      fromCountry: sellerShippingAddress.country,
      fromPostalCode: sellerShippingAddress.postalCode,
    });
    if (!shippingMethods || shippingMethods.length === 0) {
        throw new Error(`No shipping methods found for service point ${servicePointId} from postal code ${sellerShippingAddress.postalCode}.`);
    }

    // Step 2: Find a suitable shipping method based on weight
    const parcelWeight = 1.0; // TODO: Get weight from product model, ensure it's a number
    const suitableMethod = shippingMethods.find(method => {
      const minWeight = parseFloat(method.min_weight);
      const maxWeight = parseFloat(method.max_weight);
      return parcelWeight >= minWeight && parcelWeight <= maxWeight;
    });

    if (!suitableMethod) {
        console.error("Available methods:", JSON.stringify(shippingMethods, null, 2));
        throw new Error(`No suitable shipping method found for a parcel of ${parcelWeight}kg for service point ${servicePointId}.`);
    }

    // Step 3: Create the parcel payload for Sendcloud
    const fromAddress = sellerShippingAddress as IShippingAddress;
    const toAddress = buyerShippingAddress as IShippingAddress;

    const parcelPayload = {
      // Recipient contact info & address
      name: toAddress.name,
      email: buyer.email,
      telephone: toAddress.telephone!,
      address: toAddress.address,
      house_number: toAddress.houseNumber,
      city: toAddress.city,
      postal_code: toAddress.postalCode,
      country: toAddress.country,
      
      // Destination is the service point
      to_service_point: servicePointId,

      from_address: {
          from_name: fromAddress.name,
          from_company_name: fromAddress.companyName || fromAddress.name,
          from_street: fromAddress.address,
          from_house_number: fromAddress.houseNumber,
          from_city: fromAddress.city,
          from_postal_code: fromAddress.postalCode,
          from_country: fromAddress.country,
          from_telephone: fromAddress.telephone,
          from_email: offer.seller.email,
      },
      weight: String(parcelWeight),
      request_label: true,
      apply_shipping_rules: false,
      shipment: { id: suitableMethod.id },
      parcel_items: [{
          description: offer.description?.substring(0, 35) || 'Product',
          quantity: 1,
          weight: String(parcelWeight), // TODO: Get weight from product model
          value: String(offer.price),
          // hs_code and origin_country might be needed for international shipping
      }],
    };

    // --- DIAGNOSTIC LOGGING ---
    console.log("[Webhook Diagnostic] Buyer's address object being used:", toAddress);
    console.log("[Webhook Diagnostic] Final payload being sent to Sendcloud:", JSON.stringify(parcelPayload, null, 2));
    // --- END DIAGNOSTIC LOGGING ---

    // Step 4: Create the parcel via Sendcloud API
    const createdParcel = await sendcloudService.createParcel(parcelPayload);

    // Step 5: Update the offer with shipping information
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