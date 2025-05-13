import { Schema, model, models, Document, Types } from 'mongoose';

// Interface pour les champs dynamiques spécifiques à la catégorie de l'offre
interface IDynamicField {
  label: string;
  value: string | number | boolean;
  unit?: string;
}

export interface IOffer extends Document {
  productModel: Types.ObjectId; // Référence au _id du ProductModel ReMarket pertinent
  scrapedProduct?: Types.ObjectId; // Optionnel: Référence au ScrapedProduct si l'offre est basée dessus avant création du ProductModel final
  seller: Types.ObjectId; // Référence au _id de l'Utilisateur (vendeur)
  
  price: number; // Prix de vente fixé par le vendeur
  currency: string; // Ex: "EUR"
  
  condition: 'new' | 'used_likenew' | 'used_good' | 'used_fair'; // État de l'article du vendeur
  sellerDescription?: string; // Description spécifique du vendeur pour son article
  sellerPhotos: string[]; // URLs des photos de l'article du vendeur
  
  dynamicFields?: IDynamicField[]; // Champs additionnels basés sur la catégorie (ex: capacité batterie, kilométrage)
  
  status: 'available' | 'reserved' | 'sold' | 'pending_shipment' | 'shipped' | 'delivered' | 'cancelled' | 'archived';
  
  // Potentiellement, des champs pour la logistique
  // shippingMethod?: string;
  // trackingNumber?: string;
  // pointRelaisId?: string;

  soldTo?: Types.ObjectId; // Référence à l'acheteur si vendu
  orderId?: Types.ObjectId; // Référence à la commande associée

  createdAt: Date;
  updatedAt: Date;
}

const DynamicFieldSchema = new Schema<IDynamicField>(
  {
    label: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true }, // Peut être string, number, boolean
    unit: { type: String },
  },
  { _id: false }
);

const OfferSchema = new Schema<IOffer>(
  {
    productModel: {
      type: Schema.Types.ObjectId,
      ref: 'ProductModel',
      required: true,
      index: true,
    },
    scrapedProduct: {
        type: Schema.Types.ObjectId,
        ref: 'ScrapedProduct',
        index: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: [true, "Le prix est obligatoire."],
      min: [0.01, "Le prix doit être positif."],
    },
    currency: {
      type: String,
      required: true,
      default: 'EUR',
    },
    condition: {
      type: String,
      required: [true, "L\'état de l'article est obligatoire."],
      enum: ['new', 'used_likenew', 'used_good', 'used_fair'],
    },
    sellerDescription: {
      type: String,
      trim: true,
      maxLength: [1000, "La description ne peut pas dépasser 1000 caractères."],
    },
    sellerPhotos: [
      {
        type: String,
        required: [true, "Au moins une photo de votre article est requise."],
      },
    ],
    dynamicFields: [DynamicFieldSchema],
    status: {
      type: String,
      enum: ['available', 'reserved', 'sold', 'pending_shipment', 'shipped', 'delivered', 'cancelled', 'archived'],
      default: 'available',
      required: true,
      index: true,
    },
    soldTo: { type: Schema.Types.ObjectId, ref: 'User' },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

OfferSchema.index({ seller: 1, status: 1 });
OfferSchema.index({ productModel: 1, status: 1, price: 1 }); // Pour la recherche d'offres sur une fiche produit

const OfferModel = models.Offer || model<IOffer>('Offer', OfferSchema);

export default OfferModel; 