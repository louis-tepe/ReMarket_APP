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
    createdAt?: Date; 
    updatedAt?: Date;
} 