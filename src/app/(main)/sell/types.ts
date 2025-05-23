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
}

export type DisplayableProductModel = IProductModelReMarketType & { _id: string };

export interface ScrapedProductAttribute {
  label: string;
  value: string;
  unit?: string;
}

export interface AttributeItem {
  label: string;
  value: string;
  unit?: string;
}

export type Specifications = AttributeItem[]; 