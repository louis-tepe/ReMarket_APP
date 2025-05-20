import { Schema, model, models, Document, Types, Model } from 'mongoose';
import slugify from 'slugify'; // Import slugify

// Interface pour les spécifications standardisées
interface IStandardSpecification {
  label: string; // Ex: "Couleur", "Capacité de stockage"
  value: string; // Ex: "Noir", "256Go"
  unit?: string; // Ex: "Go", "mAh", "kg"
}

// Interface de base pour les propriétés de ProductModel
export interface IProductModelBase {
  title: string;
  slug: string;
  brand: Types.ObjectId;
  category: Types.ObjectId;
  standardDescription: string;
  standardImageUrls: string[];
  keyFeatures?: string[];
  isFeatured?: boolean;
  specifications: IStandardSpecification[];
}

// Interface pour l'objet ProductModel tel qu'il pourrait être retourné (par ex. après .lean())
export interface IProductModel extends IProductModelBase {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Interface pour le document Mongoose
export interface IProductModelDocument extends IProductModelBase, Document {
  // _id, createdAt, updatedAt sont fournis par Document et timestamps:true
  // Les méthodes comme isModified, isNew sont disponibles sur Document
}

const StandardSpecificationSchema = new Schema<IStandardSpecification>(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
    unit: { type: String },
  },
  { _id: false }
);

const ProductModelSchema = new Schema<IProductModelDocument>(
  {
    title: {
      type: String,
      required: [true, "Le titre standardisé est obligatoire."],
      trim: true,
      unique: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    brand: {
      type: Schema.Types.ObjectId,
      ref: 'Brand', // Ajout de la référence à BrandModel
      required: [true, "La marque est obligatoire."],
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category', // Ajout de la référence à CategoryModel
      required: [true, "La catégorie est obligatoire."],
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

ProductModelSchema.pre<IProductModelDocument>('save', function(next) {
  if (this.isModified('title') || this.isNew) {
    this.slug = slugify(this.title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
  }
  next();
});

// Index pour la recherche textuelle sur les champs importants
ProductModelSchema.index({ title: 'text', brand: 'text', category: 'text', standardDescription: 'text' });

const ProductModel: Model<IProductModelDocument> = models.ProductModel || model<IProductModelDocument>('ProductModel', ProductModelSchema);

export default ProductModel; 