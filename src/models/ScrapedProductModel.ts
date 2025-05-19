import { Document } from 'mongoose';

export interface IProductAttribute {
  label: string;
  value: string;
  unit?: string;
}

export interface IScrapedProduct extends Document {
  // productName?: string;
  // source?: string;
  // sourceProductId?: string;
  // imageUrls?: string[];
  // description?: string;
  // price?: number;
  // currency?: string;
  // brand?: string;
  // categorySuggestions?: string[];
  attributes?: IProductAttribute[];
  // rawData?: any;
  // processedAt?: Date;
  // createdAt: Date;
  // updatedAt: Date;
} 