import type { IScrapedProduct as BackendProductModel } from '@/lib/mongodb/models/ScrapingProduct';
import type { ICategory as BackendCategory } from '@/lib/mongodb/models/CategoryModel';
import type { FormFieldDefinition } from '@/types/form.types';
import type { IBrand as BackendBrand } from '@/lib/mongodb/models/BrandModel'; // Import IBrand
import { IProductBase } from "@/lib/mongodb/models/SellerProduct";
import { IScrapedProduct } from "@/lib/mongodb/models/ScrapingProduct";
import { IUser } from "@/lib/mongodb/models/User";
import { Types } from "mongoose";

// Export IProductModelReMarketType directly
export type IProductModelReMarketType = BackendProductModel;

// Re-exporting for clarity or if modification/extension is needed locally
export type { BackendCategory, FormFieldDefinition };
export type IBrand = BackendBrand; // Export IBrand

// Extends BackendCategory for frontend-specific properties like depth.
export interface FrontendCategory extends Omit<BackendCategory, '_id' | 'parent' | 'createdAt' | 'updatedAt'> {
    _id: string; // Mongoose ObjectId as string
    name: string;
    slug: string;
    depth: number;
    isLeafNode: boolean;
    parent?: string; // Mongoose ObjectId as string, or null/undefined
    createdAt?: string; // ISO date string
    updatedAt?: string; // ISO date string
}

// Defines the structure for a level in the cascading category dropdowns.
export interface CategoryDropdownLevel {
    level: number;
    parentId: string | null;
    options: FrontendCategory[];
    selectedId: string | null;
    placeholder: string;
}

// Details of the offer being created by the seller.
export interface OfferDetails {
    price: string; // Input as string, will be parsed to float
    currency: 'EUR'; // Currently fixed to EUR
    condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor'; // Standardized conditions
    sellerDescription: string;
    photos: File[]; // Array of files for upload
    stockQuantity: string; // Input as string, will be parsed to int
}

// Type for product models used in the ReMarket select items (dropdown).
export interface ProductModelReMarketSelectItem {
  id: string;
  name: string;
  brand?: string; // Optional: slug or ID of the brand
  category?: string; // Optional: slug or ID of the category
}

// Represents a product model with all its details for display on the sell page.
export type DisplayableProductModel = Omit<IProductModelReMarketType, '_id'> & { _id: string };

// Structure for scraped product attributes (can be from various sources).
export interface ScrapedProductAttribute {
  label: string;
  value: string;
  unit?: string;
}

// Consistent structure for displaying product attributes/specifications.
export interface AttributeItem {
  label: string;
  value: string;
  unit?: string;
}

// Alias for an array of AttributeItem, representing product specifications.
export type Specifications = AttributeItem[];

// Constant for the special ID used when a product is not listed.
export const NOT_LISTED_ID = "---PRODUCT_NOT_LISTED---"; 

export interface AnalyzedImage {
    url: string;
    visualConditionScore: number | null;
    visualConditionRawResponse: string;
}

export interface CategorySpecificField {
    label: string;
    // ... existing code ...
}

export interface ProductModelInfo {
    id: string;
    name: string;
    imageUrl?: string;
}

export type ListingStatus = 'available' | 'reserved' | 'sold' | 'archived';
export type TransactionStatus = 'available' | 'pending_payment' | 'pending_shipment' | 'shipped' | 'delivered' | 'cancelled';
export type OfferCondition = 'new' | 'like-new' | 'good' | 'fair' | 'poor';

// Represents the raw offer data structure received from the API, 
// which is a populated version of the IProductBase from Mongoose.
export type SellerOffer = Omit<IProductBase, '_id' | 'productModel' | 'seller' | 'soldTo' | 'orderId'> & {
    _id: Types.ObjectId;
    images: AnalyzedImage[];
    productModel: Pick<IScrapedProduct, 'product' | 'slug' | 'brand' | 'category'> & {
        brand?: { name: string, slug: string };
        category?: { name: string, slug: string };
    };
    seller: Pick<IUser, 'name'>;
    soldTo?: Pick<IUser, 'name'>;
    createdAt: string; // Dates are stringified
    updatedAt: string;
};

