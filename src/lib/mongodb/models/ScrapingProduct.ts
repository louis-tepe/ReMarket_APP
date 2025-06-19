import { Schema, model, models, Document, Model, Types } from 'mongoose';
import './BrandModel';
import './CategoryModel';

// Interface pour les données du produit de base scrapées
interface IProductData {
    id: number; // ID numérique provenant de la source
    title: string;
    brand: string;
    url: string;
    image_url?: string;
    images?: string[];
    description?: string;
}

// Sous-schémas
const ProductSchema = new Schema<IProductData>({
    id: { type: Number, required: true },
    title: { type: String, required: true },
    brand: { type: String, required: true, index: true },
    url: { type: String, required: true, unique: true, index: true },
    image_url: { type: String },
    images: { type: [String] },
    description: { type: String }
}, { _id: false });

const PriceAnalysisPeriodSchema = new Schema({
    average_price: Number,
    data_points: Number
}, { _id: false });

const PriceAnalysisSchema = new Schema({
    "3_months": PriceAnalysisPeriodSchema,
    "6_months": PriceAnalysisPeriodSchema,
    "1_year": PriceAnalysisPeriodSchema,
}, { _id: false });

// Interface pour une période d'analyse de prix
interface IPriceAnalysisPeriod {
    average_price?: number;
    data_points?: number;
}

// Interface principale pour le document
export interface IScrapedProduct {
  _id: number; // Utilisation de l'ID numérique du produit comme clé primaire
  source_name: string;
  product_search_name: string;
  category: Types.ObjectId; // ID de la catégorie ReMarket
  brand?: Types.ObjectId; // ID de la marque ReMarket
  slug?: string;
  product: IProductData;
  options?: Record<string, string[]>;
  specifications: Record<string, unknown>;
  price_analysis?: {
      "3_months"?: IPriceAnalysisPeriod;
      "6_months"?: IPriceAnalysisPeriod;
      "1_year"?: IPriceAnalysisPeriod;
  };
}

export interface IScrapedProductDocument extends IScrapedProduct, Document {
    _id: number; // Spécifier explicitement que _id est un nombre
}

// Schéma principal
const ScrapingProductSchema = new Schema<IScrapedProductDocument>({
    _id: { 
        type: Number,
        required: true,
        // Ne pas utiliser `unique: true` ici car Mongoose gère l'unicité de `_id`
        // et cela peut causer des problèmes avec certains pilotes.
    },
    source_name: { type: String, required: true, default: 'ledenicheur' },
    product_search_name: { type: String, required: true, index: true },
    slug: { type: String, unique: true, sparse: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    product: { type: ProductSchema, required: true },
    options: { type: Schema.Types.Map, of: [String] },
    specifications: { type: Schema.Types.Mixed },
    price_analysis: { type: PriceAnalysisSchema },
}, {
  timestamps: true, // `createdAt` et `updatedAt`
  versionKey: false,
});

const ScrapingProduct: Model<IScrapedProductDocument> = models.ScrapingProduct || model<IScrapedProductDocument>('ScrapingProduct', ScrapingProductSchema);

export default ScrapingProduct; 