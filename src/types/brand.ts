import { Types } from 'mongoose';

export interface LeanBrand {
    _id: Types.ObjectId | string;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    categories?: (Types.ObjectId | string)[];
    createdAt: Date | string;
    updatedAt: Date | string;
    productCount?: number;
} 