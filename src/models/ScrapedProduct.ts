import { Schema, model, models, Document, Types } from 'mongoose';

interface IScrapedProduct extends Document {
  brand: string;
  model: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  specifications?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ScrapedProductSchema = new Schema<IScrapedProduct>(
  {
    brand: {
      type: String,
      required: [true, "La marque est obligatoire."],
      trim: true,
    },
    model: {
      type: String,
      required: [true, "Le modèle est obligatoire."],
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Le titre est obligatoire."],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "La description est obligatoire."],
      trim: true,
    },
    imageUrl: {
      type: String,
      required: [true, "L'URL de l'image est obligatoire."],
    },
    category: {
      type: String,
      required: [true, "La catégorie est obligatoire."],
      trim: true,
    },
    specifications: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true, // Gère createdAt et updatedAt automatiquement
    versionKey: false,
  }
);

// Index pour améliorer les performances de recherche sur des champs fréquemment interrogés
ScrapedProductSchema.index({ brand: 1, model: 1 });
ScrapedProductSchema.index({ title: 'text', description: 'text' }); // Pour la recherche textuelle

const ScrapedProduct = models.ScrapedProduct || model<IScrapedProduct>('ScrapedProduct', ScrapedProductSchema);

export default ScrapedProduct;
export type { IScrapedProduct }; 