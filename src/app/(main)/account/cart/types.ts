import { ClientSafeCart, ClientSafeCartItemPopulated } from '@/types/cart';

export type OfferCondition = 'new' | 'like-new' | 'good' | 'fair' | 'poor';

// Represents an offer associated with a cart item.
export interface CartItemOffer {
    _id: string;
    price: number;
    seller?: { name?: string; username?: string };
    condition: OfferCondition;
    stockQuantity: number;
    images?: string[];
    // Add other offer fields if necessary for the cart display
}

// Represents product model details for a cart item.
export interface CartItemProductModel {
    _id: number;
    title: string;
    standardImageUrls?: string[];
    slug?: string; // For linking back to the product page
    condition: OfferCondition;
}

// Defines the payload for cart modification actions.
export interface CartActionPayload {
    action: 'add' | 'remove' | 'update' | 'clear';
    offerId?: string; // For adding an item
    productModelId?: string; // For adding an item
    cartItemId?: string; // For removing or updating an item
    quantity?: number; // For adding or updating quantity
}

export interface Offer {
    _id: string;
    price: number;
    seller: {
        _id: string;
        name?: string;
        username?: string;
    };
    images?: string[];
    stockQuantity: number;
    condition: OfferCondition;
}

export interface ProductModel {
    _id: number;
    title: string;
    standardImageUrls?: string[];
    slug?: string;
}

export interface CartData extends ClientSafeCart {
    hasUnavailableItems: boolean;
    items: CartItem[];
}

export interface CartItem extends ClientSafeCartItemPopulated {
    isAvailable: boolean;
} 