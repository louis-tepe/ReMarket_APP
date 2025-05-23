import { Schema, model, models, Document, Types, Model as MongooseModel } from 'mongoose';
import slugify from 'slugify'; // Import slugify
// BrandModel est référencé, s'assurer de son import si des opérations spécifiques étaient nécessaires (ici, ref suffit)
// import BrandModel from './BrandModel'; 

// Interface pour les spécifications standardisées
interface IStandardSpecification {
  label: string; // Ex: "Couleur", "Capacité de stockage"
  value: string; // Ex: "Noir", "256Go"
  unit?: string; // Ex: "Go", "mAh", "kg"
}

// Interface pour les attributs bruts du scraping
interface IRawAttribute {
  label: string;
  value: string;
}

// Ajout des types pour les nouvelles données Idealo
interface IIdealoOptionChoice {
  optionName: string;
  availableValues: string[];
}

interface IIdealoQA {
  question: string;
  answer: string;
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
  
  // Champs issus du scraping (anciennement ScrapedProduct)
  scrapedSource?: string; // Source du scraping (ex: "idealo", "amazon")
  scrapedSourceUrl?: string; // URL du produit sur la source
  rawTitle?: string; // Titre brut du scraping
  rawBrandName?: string; // Nom de la marque brute du scraping
  rawCategoryName?: string; // Nom de la catégorie brute du scraping
  rawDescription?: string; // Description brute du scraping
  rawImageUrls?: string[]; // URLs des images brutes du scraping
  rawCurrentPrice?: number;
  rawListPrice?: number;
  rawCurrency?: string;
  rawReviewRating?: number;
  rawReviewCount?: number;
  rawAttributes?: IRawAttribute[]; // Caractéristiques techniques brutes du scraping
  rawAsin?: string; // ASIN Amazon (si applicable)

  // Statut global du produit
  status: 'scraped_pending_review' | 'scraped_rejected' | 'standardization_pending' | 'active' | 'inactive' | 'error_standardization';

  // Nouveaux champs pour les données Idealo
  sourceUrlIdealo?: string;
  variantTitle?: string;
  priceNewIdealo?: number;
  priceUsedIdealo?: number;
  optionChoicesIdealo?: IIdealoOptionChoice[];
  qasIdealo?: IIdealoQA[];
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

// Fonction pour générer un slug standardisé
const generateSlug = (title: string) => slugify(title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });

const StandardSpecificationSchema = new Schema<IStandardSpecification>(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    unit: { type: String, trim: true }
  },
  { _id: false }
);

// Schéma pour les attributs bruts
const RawAttributeSchema = new Schema<IRawAttribute>(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true }
  },
  { _id: false }
);

// Schémas pour les nouveaux types Idealo
const IdealoOptionChoiceSchema = new Schema<IIdealoOptionChoice>(
  {
    optionName: { type: String, required: true, trim: true },
    availableValues: [{ type: String, required: true, trim: true }]
  },
  { _id: false }
);

const IdealoQASchema = new Schema<IIdealoQA>(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true }
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
      unique: true,
      index: true,
      // Le slug est requis et sera généré/mis à jour par le hook pre-save
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
    standardImageUrls: {
      type: [String],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0 && v.every(url => typeof url === 'string' && url.trim() !== ''),
        message: "Au moins une URL d'image standardisée valide est requise."
      }
      // Optionnel à la création si généré plus tard, mais une URL est attendue pour un produit actif.
    },
    keyFeatures: [{ type: String, trim: true }],
    isFeatured: { 
      type: Boolean, 
      default: false, 
      index: true // Indexer si on filtre souvent dessus
    },
    specifications: [StandardSpecificationSchema],
    // Nouveaux champs pour les données Idealo
    sourceUrlIdealo: { type: String, trim: true },
    variantTitle: { type: String, trim: true },
    priceNewIdealo: { type: Number },
    priceUsedIdealo: { type: Number },
    optionChoicesIdealo: [IdealoOptionChoiceSchema],
    qasIdealo: [IdealoQASchema],
    // Les lignes concernant 'status', 'approvedBy', 'approvedAt' sont supprimées ici
    // originalScrapedProductId: { type: Schema.Types.ObjectId, ref: 'ScrapedProduct' }, // Ce champ n'est plus nécessaire

    // Champs du scraping
    scrapedSource: { type: String, trim: true, index: true },
    scrapedSourceUrl: { type: String, trim: true, index: true, sparse: true }, // sparse: true car pas toujours présent
    rawTitle: { type: String, trim: true },
    rawBrandName: { type: String, trim: true },
    rawCategoryName: { type: String, trim: true },
    rawDescription: { type: String, trim: true },
    rawImageUrls: [{ type: String, trim: true }],
    rawCurrentPrice: { type: Number },
    rawListPrice: { type: Number },
    rawCurrency: { type: String, trim: true },
    rawReviewRating: { type: Number },
    rawReviewCount: { type: Number },
    rawAttributes: [RawAttributeSchema],
    rawAsin: { type: String, trim: true, index: true, sparse: true },

    status: {
      type: String,
      enum: ['scraped_pending_review', 'scraped_rejected', 'standardization_pending', 'active', 'inactive', 'error_standardization'],
      default: 'standardization_pending', // Un produit créé est en attente de standardisation par défaut
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Hook pre-save pour générer/mettre à jour le slug à partir du titre
ProductModelSchema.pre('save', function (this: IProductModelDocument, next) {
  if (this.isModified('title') || this.isNew) {
    if (this.title) { // S'assurer que le titre existe avant de générer le slug
      this.slug = generateSlug(this.title);
    } else if (this.isNew) {
      // Si nouveau et pas de titre, on pourrait bloquer ou générer un slug temporaire
      // Pour l'instant, on suppose que `title` est toujours fourni à la création (requis par schéma)
      // Si le titre peut être absent initialement, cette logique doit être adaptée
    }
  }
  next();
});

// Index pour la recherche textuelle sur les champs importants
ProductModelSchema.index({ title: 'text', brand: 'text', category: 'text', standardDescription: 'text' });

const ProductModel: MongooseModel<IProductModelDocument> = models.ProductModel || model<IProductModelDocument>('ProductModel', ProductModelSchema);

export default ProductModel; 