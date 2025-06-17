// Represents an offer associated with a cart item.
export interface CartItemOffer {
    _id: string;
    price: number;
    seller?: { name?: string; username?: string };
    // Add other offer fields if necessary for the cart display
}

// Represents product model details for a cart item.
export interface CartItemProductModel {
    _id: string;
    title: string;
    standardImageUrls?: string[];
    slug?: string; // For linking back to the product page
}

// Represents a single item in the shopping cart.
export interface CartItem {
    _id: string; // Cart item's unique ID
    offer: CartItemOffer;
    productModel: CartItemProductModel;
    quantity: number;
    addedAt?: string; // ISO date string - optional since API might not return it
}

// Represents the overall structure of the cart data.
export interface CartData {
    items: CartItem[];
    count: number; // Total number of items (sum of quantities)
    total: number; // Total price of the cart
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
    condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
}

export interface ProductModel {
    _id: string;
    title: string;
    standardImageUrls?: string[];
    slug?: string;
} 