import { Schema, model, models, Document, Types } from 'mongoose';
import { IUser } from './User'; // Importer IUser si ce n'est pas déjà fait
import { IProductBase as IOffer } from './ProductBaseModel'; // Importer IProductBase

// Types pour les statuts
export type OrderStatus =
  | 'pending_payment'
  | 'payment_failed'
  | 'processing' // Anciennement 'pending_shipment' ou équivalent
  | 'shipped_to_relay'
  | 'at_relay_point'
  | 'collected' // Anciennement 'delivered' ou 'completed'
  | 'cancelled_by_user'
  | 'cancelled_by_system' // Nouveau statut pour annulations système/vendeur
  | 'refund_pending' // Nouveau statut
  | 'refunded';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed';


// Interface pour un article dans la commande
interface IOrderItem extends Document {
  offer: Types.ObjectId | IOffer; // Référence à ProductOfferModel (IProductBase)
  productModel: Types.ObjectId; // Dénormalisation : référence à ProductModel
  seller: Types.ObjectId | IUser; // Dénormalisation : référence au vendeur de cette offre spécifique
  quantity: number;
  priceAtPurchase: number; // Prix de l'offre au moment de l'achat
  currencyAtPurchase: string; // Devise au moment de l'achat
}

// Interface pour le document Order
export interface IOrder extends Document {
  buyer: Types.ObjectId | IUser; // Référence à UserModel (acheteur)
  items: IOrderItem[]; // Tableau des articles commandés
  totalAmount: number; // Montant total de la commande
  currency: string; // Devise de la commande
  status: OrderStatus;
  paymentIntentId?: string; // Pour l'intégration avec des services de paiement comme Stripe
  paymentStatus: PaymentStatus;
  paymentMethod?: string; // Ex: 'card', 'paypal'
  relayPointId: string; // Identifiant ou informations sur le point relais choisi
  orderDate: Date; // Date de la commande, default: Date.now()
  shippingDate?: Date; // Date d'expédition vers le point relais
  collectionDate?: Date; // Date de collecte par l'acheteur
  cancellationReason?: string;
  refundReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    offer: {
      type: Schema.Types.ObjectId,
      ref: 'ProductOffer', // Référence au modèle d'offre (ProductBaseModel)
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
      min: 1,
    },
    priceAtPurchase: {
      type: Number,
      required: true,
      min: [0, "Le prix au moment de l'achat ne peut être négatif."],
    },
    currencyAtPurchase: {
      type: String,
      required: true,
    }
  },
  { _id: true } // Donner un _id à chaque OrderItem
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
      min: [0, "Le montant total ne peut être négatif."],
    },
    currency: {
      type: String,
      required: true,
      default: 'EUR',
    },
    status: {
      type: String,
      enum: {
        values: [
          'pending_payment',
          'payment_failed',
          'processing',
          'shipped_to_relay',
          'at_relay_point',
          'collected',
          'cancelled_by_user',
          'cancelled_by_system',
          'refund_pending',
          'refunded'
        ],
        message: "La valeur du statut de la commande n'est pas valide.",
      },
      default: 'pending_payment',
      index: true,
    },
    paymentIntentId: {
      type: String,
      trim: true,
      index: true,
      sparse: true, // Peut être absent
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['pending', 'succeeded', 'failed'],
        message: "Le statut du paiement n'est pas valide."
      },
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
    shippingDate: {
      type: Date,
    },
    collectionDate: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    refundReason: {
      type: String,
      trim: true,
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index
OrderSchema.index({ buyerId: 1, status: 1 }); // Compound index
OrderSchema.index({ relayPointId: 1 });


// Hook pour s'assurer que si une commande est marquée 'collected' (ou un statut équivalent de complétion),
// les offres associées voient leur transactionStatus mis à 'sold'.
OrderSchema.pre('save', async function(next) {
  if (this.isModified('status') && (this.status === 'collected')) { // Adapter le statut si besoin
    const ProductOfferModel = models.ProductOffer || model('ProductOffer');
    try {
      for (const item of this.items) {
        await ProductOfferModel.findByIdAndUpdate(item.offer, {
          transactionStatus: 'sold',
          listingStatus: 'sold', // Marquer aussi le listing comme sold
          soldTo: this.buyer, // Enregistrer l'acheteur
          orderId: this._id // Enregistrer l'ID de la commande
        });
      }
    } catch (error) {
      console.error("Erreur critique lors de la mise à jour du statut des offres après complétion de la commande:", error);
      // Gérer l'erreur (par exemple, ne pas bloquer la sauvegarde de la commande mais logguer/notifier)
      // Modification : propager l'erreur
      return next(error as Error); // Propager l'erreur pour interrompre la sauvegarde
    }
  }
  next();
});

const OrderModel = models.Order || model<IOrder>('Order', OrderSchema);

export default OrderModel;
export type { IOrderItem }; 