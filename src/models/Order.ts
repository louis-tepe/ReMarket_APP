import { Schema, model, models, Document, Types } from 'mongoose';
import { IUser } from './User';
import { IOffer } from './OfferModel';

export type OrderStatus = 
  | 'pending_payment' 
  | 'payment_failed'
  | 'processing' 
  | 'shipped_to_relay' 
  | 'at_relay_point' 
  | 'collected' 
  | 'cancelled_by_user'
  | 'cancelled_by_system'
  | 'refund_pending'
  | 'refunded';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed';

interface IOrderItem extends Document {
  offerId: Types.ObjectId | IOffer;
  priceAtPurchase: number; // Prix unitaire au moment de l'achat
}

const OrderItemSchema = new Schema<IOrderItem>({
  offerId: {
    type: Schema.Types.ObjectId,
    ref: 'Offer',
    required: true,
  },
  priceAtPurchase: {
    type: Number,
    required: true,
    min: [0, "Le prix au moment de l'achat ne peut être négatif."],
  },
}, { _id: false });

interface IOrder extends Document {
  buyerId: Types.ObjectId | IUser;
  items: IOrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentIntentId?: string; // Pour l'intégration avec des services de paiement comme Stripe
  paymentStatus: PaymentStatus;
  relayPointId: string; // Identifiant ou informations sur le point relais choisi
  orderDate: Date;
  shippingDate?: Date; // Date d'expédition vers le point relais
  collectionDate?: Date; // Date de collecte par l'acheteur
  cancellationReason?: string;
  refundReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'ID de l'acheteur est obligatoire."],
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
    },
    paymentIntentId: {
      type: String,
      trim: true,
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
    relayPointId: {
      type: String,
      required: [true, "L'identifiant du point relais est obligatoire."], // Sera un ID ou une structure plus complexe plus tard
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
OrderSchema.index({ buyerId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentIntentId: 1 }, { unique: true, sparse: true }); // Options dans un objet séparé
OrderSchema.index({ relayPointId: 1 });

const Order = models.Order || model<IOrder>('Order', OrderSchema);

export default Order;
export type { IOrder, IOrderItem }; 