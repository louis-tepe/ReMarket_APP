import { Schema, model, models, Document, Types, Model as MongooseModel } from 'mongoose';

// Interface pour un article du panier
interface ICartItem extends Document {
  _id: Types.ObjectId; // ID unique de l'item dans le panier
  offer: Types.ObjectId; // Réf. à ProductOfferModel
  quantity: number; // Quantité de l'offre
  productModel: number; // Réf. à ScrapingProduct (pour affichage)
  addedAt: Date; // Date d'ajout au panier
}

// Interface pour le document Cart
export interface ICart extends Document {
  user: Types.ObjectId; // Réf. à UserModel
  items: ICartItem[]; // Articles dans le panier
  createdAt: Date;
  updatedAt: Date;

  // Déclaration des méthodes pour l'interface
  addItem(itemDetails: { offerId: string | Types.ObjectId; productModelId: string | number; quantity?: number }): Promise<ICart>;
  removeItem(cartItemId: string | Types.ObjectId): Promise<ICart>;
  clearCart(): Promise<ICart>;
}

const CartItemSchema = new Schema<ICartItem>({
  offer: {
    type: Schema.Types.ObjectId,
    ref: 'ProductOffer',
    required: true,
  },
  productModel: { // Dénormalisation pour accès facile aux détails du produit
    type: Number,
    ref: 'ScrapingProduct',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'La quantité doit être au moins de 1.'],
    default: 1,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  }
}, { _id: true }); // Chaque item a son propre _id

const CartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // Un seul panier par utilisateur
      index: true,
    },
    items: [CartItemSchema],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Méthode pour ajouter ou mettre à jour un article
CartSchema.methods.addItem = async function (
  { offerId, productModelId, quantity = 1 }: 
  { offerId: string | Types.ObjectId; productModelId: string | number; quantity?: number }
) {
  const offerObjectId = typeof offerId === 'string' ? new Types.ObjectId(offerId) : offerId;
  const productModelNumericId = typeof productModelId === 'string' ? parseInt(productModelId, 10) : productModelId;

  if (isNaN(productModelNumericId)) {
    throw new Error("L'ID du modèle de produit est invalide.");
  }

  const existingItem = this.items.find((item: ICartItem) => item.offer.equals(offerObjectId));

  if (existingItem) {
    existingItem.quantity += quantity;
    if (existingItem.quantity <= 0) {
      this.items = this.items.filter((item: ICartItem) => !item.offer.equals(offerObjectId));
    }
  } else if (quantity > 0) {
    this.items.push({
      _id: new Types.ObjectId(), // Générer un nouvel ObjectId pour l'item
      offer: offerObjectId,
      productModel: productModelNumericId,
      quantity: quantity,
      addedAt: new Date(),
    } as ICartItem);
  }
  return this.save();
};

// Méthode pour supprimer un article
CartSchema.methods.removeItem = async function (cartItemId: string | Types.ObjectId) {
  const idToRemove = typeof cartItemId === 'string' ? new Types.ObjectId(cartItemId) : cartItemId;
  this.items = this.items.filter((item: ICartItem) => !item._id.equals(idToRemove));
  return this.save();
};

// Méthode pour vider le panier
CartSchema.methods.clearCart = async function () {
  this.items = [];
  return this.save();
};

const CartModel = (models.Cart as MongooseModel<ICart>) || model<ICart>('Cart', CartSchema);

export default CartModel; 