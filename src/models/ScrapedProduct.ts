import { Schema, model, models, Document } from 'mongoose';

// Correspond au type ProductAttribute du scraper
interface IProductAttribute {
  label: string;
  value: string;
}

export interface IScrapedProduct {
  asin?: string; // ASIN Amazon
  source: string; // Source du scraping (ex: "amazon")
  sourceUrl: string; // URL du produit sur la source
  title: string; // Titre principal du produit
  brand?: string;
  productModelName?: string; // Renommé pour éviter le conflit avec Document.model
  category?: string; // Catégorie identifiée
  description?: string; // Description complète, si disponible
  
  imageUrls: string[]; // URLs des images du produit
  
  // Informations spécifiques à Amazon (ou autre source)
  currentPrice?: number;
  listPrice?: number;
  currency?: string; // Ex: "EUR", "USD"
  reviewRating?: number;
  reviewCount?: number;

  attributes: IProductAttribute[]; // Caractéristiques techniques brutes
  
  // Champs pour la gestion interne ReMarket
  status: 'pending_review' | 'approved' | 'rejected'; // Statut de ce produit scrapé
  // processedForProductModel: boolean; // A-t-il été utilisé pour créer un ProductModel ReMarket ?

  createdAt: Date;
  updatedAt: Date;
}

export interface IScrapedProductDocument extends IScrapedProduct, Document {}

const ProductAttributeSchema = new Schema<IProductAttribute>(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false } // Pas besoin d'ID pour les sous-documents ici
);

const ScrapedProductSchema = new Schema<IScrapedProductDocument>(
  {
    asin: { type: String, trim: true, index: true, sparse: true }, // L'ASIN n'est pas toujours là
    source: { type: String, required: true, default: 'amazon' },
    sourceUrl: { type: String, required: true, trim: true },
    title: {
      type: String,
      required: [true, "Le titre est obligatoire."],
      trim: true,
    },
    brand: { type: String, trim: true, index: true },
    productModelName: { type: String, trim: true, index: true }, // Renommé ici aussi
    category: { type: String, trim: true, index: true },
    description: { type: String, trim: true },
    imageUrls: [{ type: String }],
    currentPrice: { type: Number },
    listPrice: { type: Number },
    currency: { type: String, trim: true, default: 'EUR' }, // À ajuster si Amazon.com (USD)
    reviewRating: { type: Number },
    reviewCount: { type: Number },
    attributes: [ProductAttributeSchema],
    status: { type: String, enum: ['pending_review', 'approved', 'rejected'], default: 'pending_review' },
    // processedForProductModel: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

ScrapedProductSchema.index({ title: 'text', description: 'text', brand: 'text' });
ScrapedProductSchema.index({ sourceUrl: 1 }, { unique: true }); // URL unique pour éviter doublons de la même source

const ScrapedProduct = models.ScrapedProduct || model<IScrapedProductDocument>('ScrapedProduct', ScrapedProductSchema);

export default ScrapedProduct;
// export type { IScrapedProduct }; // IScrapedProduct est déjà exporté plus haut 