import { Schema, model, models, Document, Types, Model as MongooseModel } from 'mongoose';
import { ICategory } from './CategoryModel';
import CategoryModel from './CategoryModel'; // Import direct pour la validation

// Interface pour les informations d'expédition
export interface IShippingInfo {
  trackingNumber?: string;
  labelUrl?: string;
  servicePointId?: number; // ID du point relais de destination
}

// Interface de base pour toutes les offres de produits
export interface IProductBase extends Document {
  category: Types.ObjectId | ICategory; // Réf. à Category (doit être une feuille)
  productModel: Types.ObjectId;         // Réf. à ProductModel (fiche produit standard ReMarket)

  // Informations sur l'offre spécifique du vendeur
  seller: Types.ObjectId;               // Réf. à User (vendeur)
  price: number;                        // Prix de vente
  currency: string;                     // Devise (ex: "EUR")
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor'; // État du produit
  description: string;                  // Description par le vendeur
  images: string[];                     // URLs des images de l'offre (au moins une)
  stockQuantity: number;                // Quantité disponible (0 si plus en stock)
  
  // Analyse IA (optionnelle)
  visualConditionScore?: number;        // Score (0-4) de l'analyse visuelle par IA
  visualConditionRawResponse?: string;  // Réponse brute de l'IA (pour debug/référence)

  // Statuts de l'offre
  listingStatus: 'active' | 'inactive' | 'rejected' | 'sold'; // Statut de visibilité de l'annonce
  transactionStatus?: 'available' | 'reserved' | 'pending_shipment' | 'shipped' | 'delivered' | 'cancelled' | 'sold'; // Statut transactionnel
  
  // Informations post-vente (si applicable)
  soldTo?: Types.ObjectId;               // Réf. à User (acheteur)
  orderId?: Types.ObjectId;              // Réf. à Order (commande associée)
  shippingInfo?: IShippingInfo;          // Informations d'expédition

  kind: string; // Clé de discriminateur (slug de la catégorie feuille)

  createdAt: Date;
  updatedAt: Date;
}

const ShippingInfoSchema = new Schema<IShippingInfo>({
  trackingNumber: { type: String, trim: true },
  labelUrl: { type: String, trim: true },
  servicePointId: { type: Number },
}, { _id: false });

const ProductBaseSchema = new Schema<IProductBase>(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, "La catégorie (feuille) du produit est obligatoire."],
    },
    productModel: {
      type: Schema.Types.ObjectId,
      ref: 'ProductModel',
      required: [true, "La référence au ProductModel (fiche produit standard) est obligatoire."],
      index: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "Le vendeur est obligatoire."],
      index: true, 
    },
    price: {
      type: Number,
      required: [true, "Le prix de l'offre est obligatoire."],
      min: [0, "Le prix doit être une valeur positive (0 admis si gratuit)."], 
    },
    currency: {
        type: String,
        required: [true, "La devise est obligatoire."],
        default: 'EUR',
    },
    condition: {
      type: String,
      required: [true, "L'état du produit est obligatoire."],
      enum: {
        values: ['new', 'like-new', 'good', 'fair', 'poor'],
        message: "L'état '{VALUE}' n'est pas un état supporté.",
      },
    },
    description: {
      type: String,
      required: [true, "La description de l'offre par le vendeur est obligatoire."],
      trim: true,
      minlength: [10, "La description doit comporter au moins 10 caractères."],
    },
    images: {
      type: [String],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0 && v.every(url => typeof url === 'string'),
        message: "Au moins une URL d'image valide est requise pour l'offre.",
      },
    },
    stockQuantity: {
      type: Number,
      required: [true, "La quantité en stock est obligatoire."],
      min: [0, "La quantité en stock ne peut pas être négative."],
      default: 1,
      validate: {
        validator: Number.isInteger,
        message: "La quantité en stock doit être un nombre entier."
      }
    },
    visualConditionScore: {
      type: Number,
      min: 0,
      max: 4,
      required: false,
    },
    visualConditionRawResponse: {
        type: String,
        trim: true,
        required: false,
    },
    listingStatus: {
        type: String,
        required: true,
        enum: ['active', 'inactive', 'rejected', 'sold'],
        default: 'active',
        index: true,
    },
    transactionStatus: {
        type: String,
        enum: ['available', 'reserved', 'pending_shipment', 'shipped', 'delivered', 'cancelled', 'sold'],
        required: false, 
        index: true,
    },
    soldTo: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: false 
    },
    orderId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Order', 
        required: false 
    },
    shippingInfo: {
      type: ShippingInfoSchema,
      required: false,
    }
  },
  {
    timestamps: true,
    versionKey: false,
    discriminatorKey: 'kind',
  }
);

// Hook pre-save pour gérer la logique des statuts
ProductBaseSchema.pre('save', function(this: IProductBase, next) {
  // Si l'annonce devient active et n'est pas déjà vendue, elle devient disponible
  if (this.isModified('listingStatus') || this.isNew) {
    if (this.listingStatus === 'active' && this.transactionStatus !== 'sold') {
      this.transactionStatus = 'available';
    }
  }

  // Si l'offre est marquée comme vendue (par l'un ou l'autre statut)
  // ou si la quantité en stock atteint 0.
  const markedAsSold = (this.isModified('listingStatus') && this.listingStatus === 'sold') || 
                       (this.isModified('transactionStatus') && this.transactionStatus === 'sold');
  const stockDepleted = this.stockQuantity === 0;

  if (markedAsSold || stockDepleted) {
    this.listingStatus = 'sold'; 
    this.transactionStatus = 'sold'; 
    if (stockDepleted && this.stockQuantity < 1 && !markedAsSold) {
      // Cas où le stock est épuisé mais pas explicitement marqué vendu par une autre logique
      console.log(`Offre ${this._id} marquée automatiquement comme vendue car stock épuisé.`);
    }
  }
  next();
});

// Hook pre-validation pour s'assurer que la catégorie est une feuille (isLeafNode: true)
ProductBaseSchema.pre('validate', async function (this: IProductBase, next) {
  if (this.category) {
    try {
      // Utiliser l'interface ICategory pour le typage du document retourné par lean()
      const categoryDoc = await CategoryModel.findById(this.category).select('isLeafNode').lean<ICategory | null>();
      
      if (!categoryDoc) {
        this.invalidate('category', 'Catégorie non trouvée.', this.category.toString());
      } else if (!categoryDoc.isLeafNode) {
        this.invalidate('category', "La catégorie spécifiée doit être une catégorie feuille (sans sous-catégories). Les offres ne peuvent être associées qu\'aux catégories terminales.", this.category.toString());
      }
    } catch (error) {
      console.error("Erreur lors de la validation de la catégorie (isLeafNode):", error);
      this.invalidate('category', 'Erreur lors de la vérification de la catégorie.', this.category.toString());
    }
  }
  next();
});

const ProductOfferModel: MongooseModel<IProductBase> = models.ProductOffer || model<IProductBase>('ProductOffer', ProductBaseSchema);

export default ProductOfferModel; 