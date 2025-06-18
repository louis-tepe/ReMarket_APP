// Basic information for a product model linked to a seller's offer.
export interface ProductModelInfo {
    id: string;
    name: string;
    imageUrl?: string; // Optional image URL for display
}

// Represents a seller's offer with its current status and details.
export interface SellerOffer {
    id: string;
    productModel: ProductModelInfo;
    price: number;
    currency: string;
    condition: 'new' | 'used_likenew' | 'used_good' | 'used_fair';
    status: 'available' | 'reserved' | 'sold' | 'pending_shipment' | 'shipped' | 'delivered' | 'cancelled' | 'archived';
    sellerDescription?: string;
    sellerPhotos?: string[]; // URLs of seller-provided photos
    createdAt: string; // ISO date string
    shippingInfo?: {
        trackingNumber?: string;
        labelUrl?: string;
    };
} 