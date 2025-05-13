import { Schema, model, models, Document, Types } from 'mongoose';

// Interface pour les spécifications standardisées
interface IStandardSpecification {
  label: string; // Ex: "Couleur", "Capacité de stockage"
  value: string; // Ex: "Noir", "256Go"
  unit?: string; // Ex: "Go", "mAh", "kg"
}

// Interface pour les données brutes de ProductModel
export interface IProductModel {
  _id: Types.ObjectId | string; // Ajouter _id explicitement pour les objets lean
  title: string; // Titre unique et standardisé pour le produit
  brand: string; // Marque standardisée
  category: string; // Catégorie standardisée (pourrait être un ID vers une collection de catégories)
  
  standardDescription: string; // Description officielle et standardisée du produit
  standardImageUrls: string[]; // URLs des images officielles et standardisées
  keyFeatures?: string[]; // Liste des caractéristiques clés
  isFeatured?: boolean; // Pour marquer les produits vedettes
  
  specifications: IStandardSpecification[]; // Spécifications techniques standardisées
  
  // Champs de gestion
  slug?: string; // Ajout du champ slug qui était utilisé dans product-service
  
  // Référence au ScrapedProduct original si ce modèle a été généré à partir d'un scraping
  // originalScrapedProductId?: Types.ObjectId; 

  createdAt: Date;
  updatedAt: Date;
}

// Interface pour le document Mongoose, étendant les données brutes et Document
export interface IProductModelDocument extends Omit<IProductModel, '_id'>, Document {}

const StandardSpecificationSchema = new Schema<IStandardSpecification>(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
    unit: { type: String },
  },
  { _id: false }
);

const ProductModelSchema = new Schema<IProductModel>(
  {
    title: {
      type: String,
      required: [true, "Le titre standardisé est obligatoire."],
      trim: true,
      unique: true, // Assurer que chaque ProductModel ReMarket a un titre unique
      index: true,
    },
    brand: {
      type: String,
      required: [true, "La marque est obligatoire."],
      trim: true,
      index: true,
    },
    category: {
      type: String, // Pourrait être Schema.Types.ObjectId si référence à une collection CategoryModel
      required: [true, "La catégorie est obligatoire."],
      trim: true,
      index: true,
    },
    standardDescription: {
      type: String,
      required: [true, "La description standardisée est obligatoire."],
      trim: true,
    },
    standardImageUrls: [
      {
        type: String,
        required: [true, "Au moins une image standardisée est requise."],
      },
    ],
    keyFeatures: [{ type: String, trim: true }],
    isFeatured: { 
      type: Boolean, 
      default: false, 
      index: true // Indexer si on filtre souvent dessus
    },
    specifications: [StandardSpecificationSchema],
    // Les lignes concernant 'status', 'approvedBy', 'approvedAt' sont supprimées ici
    // originalScrapedProductId: { type: Schema.Types.ObjectId, ref: 'ScrapedProduct' }, // Si vous décidez de garder ce champ, il reste ici.
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index pour la recherche textuelle sur les champs importants
ProductModelSchema.index({ title: 'text', brand: 'text', category: 'text', standardDescription: 'text' });

const ProductModel = models.ProductModel || model<IProductModel>('ProductModel', ProductModelSchema);

export default ProductModel; 