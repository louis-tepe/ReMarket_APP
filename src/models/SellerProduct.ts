import { Schema, model, models, Document, Types } from 'mongoose';
import { IScrapedProduct } from './ScrapedProduct'; // Assurez-vous que le chemin est correct
import { IUser } from './User'; // Assurez-vous que le chemin est correct

export type SellerProductStatus = 'available' | 'sold' | 'pending_approval' | 'rejected';

interface ISellerProduct extends Document {
  scrapedProductId: Types.ObjectId | IScrapedProduct;
  sellerId: Types.ObjectId | IUser;
  condition: string; // Ex: "Comme neuf", "Très bon état", "Bon état", "Usé"
  price: number;
  quantity: number;
  sellerDescription?: string;
  sellerImages?: string[];
  status: SellerProductStatus;
  listedAt: Date;
  soldAt?: Date;
  rejectionReason?: string; // Ajouté pour stocker la raison du rejet
  createdAt: Date;
  updatedAt: Date;
}

const SellerProductSchema = new Schema<ISellerProduct>(
  {
    scrapedProductId: {
      type: Schema.Types.ObjectId,
      ref: 'ScrapedProduct',
      required: [true, "L'ID du produit scrapé est obligatoire."],
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'ID du vendeur est obligatoire."],
    },
    condition: {
      type: String,
      required: [true, "L'état du produit est obligatoire."],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Le prix est obligatoire."],
      min: [0, "Le prix ne peut être négatif."],
    },
    quantity: {
      type: Number,
      required: [true, "La quantité est obligatoire."],
      min: [1, "La quantité doit être d'au moins 1."],
      default: 1,
    },
    sellerDescription: {
      type: String,
      trim: true,
    },
    sellerImages: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ['available', 'sold', 'pending_approval', 'rejected'],
        message: "La valeur du statut n'est pas valide.",
      },
      default: 'pending_approval', // Les produits sont en attente d'approbation par défaut
    },
    listedAt: {
      type: Date,
      default: Date.now,
    },
    soldAt: {
      type: Date,
    },
    rejectionReason: {
        type: String,
        trim: true,
    }
  },
  {
    timestamps: true, // Gère createdAt et updatedAt automatiquement
    versionKey: false,
  }
);

// Index pour améliorer les performances de recherche
SellerProductSchema.index({ scrapedProductId: 1 });
SellerProductSchema.index({ sellerId: 1 });
SellerProductSchema.index({ status: 1, condition: 1 });

const SellerProduct = models.SellerProduct || model<ISellerProduct>('SellerProduct', SellerProductSchema);

export default SellerProduct;
export type { ISellerProduct }; 