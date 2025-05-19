import type { IScrapedProduct } from '@/models/ScrapedProduct';
import type { IProductModel as IProductModelReMarketType } from '@/models/ProductModel';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  isLeafNode: boolean;
}

export interface Brand {
  id: string;
  name: string;
}

export interface ProductModelReMarketSelectItem {
  id: string;
  name: string;
  brand?: string;
  category?: string;
}

export interface OfferDetails {
  price: string;
  currency: string;
  condition: string;
  sellerDescription: string;
  photos: File[];
  dynamicFields?: Record<string, string | number | boolean>;
}

export type DisplayableProductModel =
  (IProductModelReMarketType & { _id: string; /* status?: string */ }) |
  (IScrapedProduct & { _id: string });

export interface AttributeItem {
  label: string;
  value: string;
  unit?: string;
}

export type Specifications = AttributeItem[]; 