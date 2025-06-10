import type { Types } from 'mongoose';

// Minimal category information needed for filter display and logic.
export interface LeanCategory {
    _id: Types.ObjectId | string;
    name: string;
    slug: string;
    description?: string;
    depth: number;
    parent?: Types.ObjectId | string;
    children?: string[];
    isLeafNode: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
    productCount?: number;
} 