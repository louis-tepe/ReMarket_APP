import { Types } from 'mongoose';

export interface LeanCartItem {
    _id: Types.ObjectId | string;
    productOffer: Types.ObjectId | string;
    quantity: number;
    price: number;
}

export interface LeanCart {
    _id: Types.ObjectId | string;
    user: Types.ObjectId | string; 
    items: LeanCartItem[];
    count?: number;
    total?: number;
    createdAt?: Date; 
    updatedAt?: Date;
} 

export interface PopulatedSellerForCart {
    _id: Types.ObjectId | string;
    name?: string;
    username?: string;
}

export interface PopulatedOfferForCartItem {
    _id: Types.ObjectId | string;
    price: number;
    seller: PopulatedSellerForCart;
    stockQuantity: number;
    condition: string;
    images?: string[];
}

export interface PopulatedProductModelForCartItem {
    _id: number;
    title: string;
    standardImageUrls: string[];
    slug: string;
}

export interface LeanCartItemPopulated extends Omit<LeanCartItem, 'productOffer' | 'price'> {
    offer: PopulatedOfferForCartItem;
    productModel: PopulatedProductModelForCartItem;
} 

// === CLIENT-SAFE TYPES (ObjectIDs converted to strings) ===

export interface ClientSafePopulatedSeller extends Omit<PopulatedSellerForCart, '_id'> {
    _id: string;
}

export interface ClientSafePopulatedOffer extends Omit<PopulatedOfferForCartItem, '_id' | 'seller'> {
    _id: string;
    seller: ClientSafePopulatedSeller;
}

export interface ClientSafeCartItemPopulated extends Omit<LeanCartItemPopulated, '_id' | 'offer'> {
    _id: string;
    offer: ClientSafePopulatedOffer;
    isAvailable?: boolean;
}

export interface ClientSafeCart extends Omit<LeanCart, '_id' | 'user' | 'items'> {
    _id: string;
    user: string;
    items: ClientSafeCartItemPopulated[];
}

export interface ClientSafeCartWithAvailability extends ClientSafeCart {
    hasUnavailableItems: boolean;
} 