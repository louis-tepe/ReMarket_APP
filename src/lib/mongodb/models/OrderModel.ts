import { Schema, model, models, Document, Types, Model as MongooseModel } from 'mongoose';
import { IUser } from './User';
import { IProductBase } from './ProductBaseModel'; // Renommé IOffer en IProductBase pour clarté

// Statuts possibles pour une commande
export type OrderStatus =
  | 'pending_payment'     // En attente de paiement
  | 'payment_failed'      // Paiement échoué
  | 'processing'          // Commande en cours de traitement (anciennement pending_shipment)
  | 'shipped_to_relay'    // Expédiée vers le point relais
  | 'at_relay_point'      // Disponible au point relais
  | 'collected'           // Récupérée par l'acheteur (anciennement completed/delivered)
  | 'cancelled_by_user'   // Annulée par l'utilisateur
  | 'cancelled_by_system' // Annulée par le système/vendeur
  | 'refund_pending'      // Remboursement en attente
  | 'refunded';           // Remboursée

// Statuts possibles pour un paiement
export type PaymentStatus = 'pending' | 'succeeded' | 'failed';

// Interface pour un article commandé
interface IOrderItem extends Document { // Etend Document pour _id, etc.
  _id: Types.ObjectId; // ID unique de l'item dans la commande
  offer: Types.ObjectId | IProductBase; // Réf. à l'offre (ProductOffer)
  productModel: Types.ObjectId;        // Réf. au modèle de produit (ProductModel)
  seller: Types.ObjectId | IUser;        // Réf. au vendeur (User)
  quantity: number;                    // Quantité commandée
  priceAtPurchase: number;             // Prix unitaire au moment de l'achat
  currencyAtPurchase: string;          // Devise au moment de l'achat
}

// Interface pour le document Order
export interface IOrder extends Document {
  buyer: Types.ObjectId | IUser;      // Acheteur (User)
  items: IOrderItem[];                // Articles de la commande
  totalAmount: number;                // Montant total payé
  currency: string;                   // Devise de la transaction
  status: OrderStatus;                // Statut actuel de la commande
  paymentIntentId?: string;           // ID de l'intention de paiement (ex: Stripe)
  paymentStatus: PaymentStatus;         // Statut du paiement
  paymentMethod?: string;             // Méthode de paiement (ex: 'card')
  relayPointId: string;               // ID du point relais choisi
  orderDate: Date;                    // Date de création de la commande
  shippingDate?: Date;                // Date d'expédition vers le relais
  collectionDate?: Date;              // Date de collecte par l'acheteur
  cancellationReason?: string;        // Motif en cas d'annulation
  refundReason?: string;              // Motif en cas de remboursement
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    // _id est généré automatiquement par Mongoose pour les sous-documents par défaut si { _id: true }
    offer: {
      type: Schema.Types.ObjectId,
      ref: 'ProductOffer', // Réf. au modèle d'offre (ProductBaseModel est la base)
      required: true,
    },
    productModel: {
      type: Schema.Types.ObjectId,
      ref: 'ProductModel',
      required: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "La quantité doit être d'au moins 1."],
    },
    priceAtPurchase: {
      type: Number,
      required: true,
      min: [0, "Le prix au moment de l'achat ne peut pas être négatif."],
    },
    currencyAtPurchase: {
      type: String,
      required: true,
    }
  },
  { _id: true } // Assure un _id pour chaque OrderItem, utile pour modifications/références
);

const OrderSchema = new Schema<IOrder>(
  {
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'ID de l'acheteur est obligatoire."],
      index: true,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: [(val: IOrderItem[]) => val.length > 0, 'La commande doit contenir au moins un article.'],
    },
    totalAmount: {
      type: Number,
      required: [true, "Le montant total est obligatoire."],
      min: [0, "Le montant total ne peut pas être négatif."],
    },
    currency: {
      type: String,
      required: true,
      default: 'EUR',
    },
    status: {
      type: String,
      enum: Object.values([
        'pending_payment', 'payment_failed', 'processing', 'shipped_to_relay',
        'at_relay_point', 'collected', 'cancelled_by_user', 'cancelled_by_system',
        'refund_pending', 'refunded'
      ] as const),
      message: "Le statut de la commande n'est pas valide.",
      default: 'pending_payment',
      index: true,
    },
    paymentIntentId: {
      type: String,
      trim: true,
      index: true,
      sparse: true, // Peut être absent, donc index sparse
    },
    paymentStatus: {
      type: String,
      enum: Object.values(['pending', 'succeeded', 'failed'] as const),
      message: "Le statut du paiement n'est pas valide.",
      default: 'pending',
      required: true,
    },
    paymentMethod: {
      type: String,
      trim: true,
    },
    relayPointId: {
      type: String,
      required: [true, "L'identifiant du point relais est obligatoire."],
      trim: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    shippingDate: { type: Date },
    collectionDate: { type: Date },
    cancellationReason: { type: String, trim: true },
    refundReason: { type: String, trim: true }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index composés pour requêtes fréquentes
OrderSchema.index({ buyer: 1, status: 1 }); // Correction: buyer au lieu de buyerId
OrderSchema.index({ relayPointId: 1 });

// Hook pre-save pour mettre à jour le statut des offres lorsque la commande est collectée
OrderSchema.pre('save', async function(next) {
  if (this.isModified('status') && this.status === 'collected') {
    // Accès sécurisé au modèle ProductOffer pour éviter les erreurs de modèle non défini
    const ProductOfferModel = models.ProductOffer || model('ProductOffer'); 
    if (!ProductOfferModel) {
        console.error("Modèle ProductOffer non trouvé lors de la tentative de mise à jour du statut des offres.");
        return next(new Error("Modèle ProductOffer non trouvé."));
    }

    try {
      for (const item of this.items) {
        // S'assurer que item.offer est un ObjectId pour la requête
        const offerId = item.offer instanceof Types.ObjectId ? item.offer : (item.offer as IProductBase)._id;
        if (!offerId) {
            console.warn(`ID d'offre manquant pour l'item ${item._id} dans la commande ${this._id}. Skipping update.`);
            continue;
        }

        await ProductOfferModel.findByIdAndUpdate(offerId, {
          transactionStatus: 'sold',
          listingStatus: 'sold', 
          soldTo: this.buyer, 
          orderId: this._id 
        });
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut des offres après collecte de la commande:", error);
      return next(error as Error); // Propager l'erreur pour interrompre la sauvegarde si critique
    }
  }
  next();
});

const OrderModel: MongooseModel<IOrder> = models.Order || model<IOrder>('Order', OrderSchema);

export default OrderModel;
export type { IOrderItem }; 