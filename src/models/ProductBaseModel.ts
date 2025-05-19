import { Schema, model, models, Document, Types } from 'mongoose';
import { ICategory } from './CategoryModel'; // Assurez-vous que le chemin est correct

// Interface pour les champs communs à toutes les offres de produits
export interface IProductBase extends Document {
  category: Types.ObjectId | ICategory; // Référence à la catégorie (feuille) pour les champs spécifiques
  productModel: Types.ObjectId; // Référence au ProductModel ReMarket pertinent (fiche produit standard)

  // Champs communs pour une offre
  seller: Types.ObjectId; // Référence à l'utilisateur vendeur
  price: number; // Prix de vente de l'offre
  currency: string; // Devise (ex: "EUR")
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor'; // État du produit
  description: string; // Description de l'offre par le vendeur
  images: string[]; // URLs des images de l'offre
  stockQuantity: number; // Quantité en stock pour cette offre
  
  // Champs pour la gestion de l'annonce et le statut transactionnel
  transactionStatus?: 'available' | 'reserved' | 'pending_shipment' | 'shipped' | 'delivered' | 'cancelled' | 'sold';
  soldTo?: Types.ObjectId; // Référence à l'acheteur si vendu
  orderId?: Types.ObjectId; // Référence à la commande associée

  // Discriminator key
  kind: string;

  createdAt: Date;
  updatedAt: Date;
}

const ProductBaseSchema = new Schema<IProductBase>(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, "La catégorie du produit est obligatoire pour déterminer les champs spécifiques."],
      // Validation que la catégorie est une feuille est dans le hook pre-validate
    },
    productModel: {
      type: Schema.Types.ObjectId,
      ref: 'ProductModel', // Assurez-vous que 'ProductModel' est le nom correct de votre modèle de fiche produit
      required: [true, "La référence au ProductModel (fiche produit) est obligatoire."],
      index: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Assurez-vous que 'User' est le nom correct de votre modèle utilisateur
      required: [true, "Le vendeur est obligatoire."],
    },
    price: {
      type: Number,
      required: [true, "Le prix de l'offre est obligatoire."],
      min: [0, "Le prix doit être positif."], // Permettre 0 si gratuit, sinon 0.01
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
        message: "L'état '{VALUE}' n'est pas supporté.",
      },
    },
    description: {
      type: String,
      required: [true, "La description de l'offre est obligatoire."],
      trim: true,
      minlength: [10, "La description doit contenir au moins 10 caractères."],
    },
    images: {
      type: [String],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: "Au moins une image est requise pour l'offre.",
      },
    },
    stockQuantity: {
      type: Number,
      required: [true, "La quantité en stock est obligatoire."],
      min: [0, "La quantité en stock ne peut être négative."],
      default: 1,
    },
    transactionStatus: {
        type: String,
        enum: ['available', 'reserved', 'pending_shipment', 'shipped', 'delivered', 'cancelled', 'sold'],
        required: false, 
        default: 'available', // Mettre 'available' par défaut si listingStatus est supprimé
        index: true,
    },
    soldTo: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: false 
    },
    orderId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Order', // Assurez-vous que 'Order' est le nom de votre modèle de commande
        required: false 
    },
  },
  {
    timestamps: true,
    versionKey: false,
    discriminatorKey: 'kind', // Important pour Mongoose Discriminators
  }
);

ProductBaseSchema.pre('save', function(next) {
  // Si l'offre est marquée comme vendue (via transactionStatus)
  if (this.isModified('transactionStatus') && this.transactionStatus === 'sold') {
    this.transactionStatus = 'sold'; // Assurer la cohérence (déjà fait par la condition, mais explicite)
    // Idéalement, d'autres logiques comme la décrémentation du stock du ProductModel pourraient avoir lieu ici ou via des événements
  }
  next();
});

// Hook pré-validation pour s'assurer que la catégorie est une feuille
ProductBaseSchema.pre('validate', async function (next) {
  if (this.category) {
    const CategoryModel = models.Category; // Accéder au modèle de catégorie compilé
    // Si CategoryModel n'est pas disponible directement (par ex. lors de la première compilation),
    // vous pourriez avoir besoin de l'importer dynamiquement ou de vous assurer qu'il est chargé.
    // Pour ce cas, on suppose qu'il est accessible via models.Category.
    if (!CategoryModel) {
        // Fallback si models.Category n'est pas encore peuplé
        // Ceci est un contournement et dépend de la façon dont Mongoose gère les modèles.
        // Idéalement, CategoryModel devrait être importé directement si possible sans causer de dépendances cycliques.
        try {
            const dynamicImport = await import('./CategoryModel'); // Tentative d'importation dynamique
            const ResolvedCategoryModel = dynamicImport.default;
             if (ResolvedCategoryModel) {
                const categoryDoc = await ResolvedCategoryModel.findById(this.category);
                if (categoryDoc && !categoryDoc.isLeafNode) {
                    this.invalidate('category', 'La catégorie spécifiée doit être une catégorie feuille (sans sous-catégories).');
                }
            } else {
                 console.warn("CategoryModel n'a pas pu être résolu dynamiquement pour la validation de isLeafNode.");
            }
        } catch (e) {
            console.error("Erreur lors de l'importation dynamique de CategoryModel pour la validation:", e);
        }
       
    } else { // Si models.Category est disponible
        const categoryDoc = await CategoryModel.findById(this.category);
        if (categoryDoc && !categoryDoc.isLeafNode) {
          this.invalidate('category', 'La catégorie spécifiée doit être une catégorie feuille (sans sous-catégories).');
        }
    }
  }
  next();
});


// Le modèle de base. Les discriminateurs seront ajoutés à celui-ci.
// Le nom 'ProductOffer' est utilisé ici, adaptez si un autre nom est plus pertinent pour votre contexte global d'offres.
const ProductOfferModel = models.ProductOffer || model<IProductBase>('ProductOffer', ProductBaseSchema);

export default ProductOfferModel; 