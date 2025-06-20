import { Schema, model, models, Document, Types, Model as MongooseModel } from 'mongoose';
import { IProductBase } from './SellerProduct';

// Interface pour un article du panier
export interface ICartItem {
  _id?: Types.ObjectId; // ID unique de l'item dans le panier
  offer: Types.ObjectId | IProductBase; // Réf. à ProductOfferModel
  quantity: number; // Quantité de l'offre
  price: number; // Prix de l'offre au moment de l'ajout
  productModel: number; // Réf. à ScrapingProduct (pour affichage)
  addedAt: Date; // Date d'ajout au panier
}

interface ICartItemDocument extends ICartItem, Document {
  _id: Types.ObjectId;
}

// Interface pour le document Cart
export interface ICart extends Document {
  user: Types.ObjectId; // Réf. à UserModel
  items: ICartItemDocument[]; // Articles dans le panier
  createdAt: Date;
  updatedAt: Date;

  // Déclaration des méthodes pour l'interface
  addItem(itemDetails: { offerId: string | Types.ObjectId; productModelId: string | number; quantity?: number; price: number }): Promise<ICart>;
  removeItem(cartItemId: string | Types.ObjectId): Promise<ICart>;
  updateItemQuantity(cartItemId: string | Types.ObjectId, newQuantity: number): Promise<ICart>;
  clearCart(): Promise<ICart>;
}

const CartItemSchema = new Schema<ICartItemDocument>({
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
  price: {
    type: Number,
    required: true,
    min: [0, 'Le prix doit être une valeur positive.'],
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
  { offerId, productModelId, quantity = 1, price }: 
  { offerId: string | Types.ObjectId; productModelId: string | number; quantity?: number; price: number }
) {
  const offerObjectId = typeof offerId === 'string' ? new Types.ObjectId(offerId) : offerId;
  const productModelNumericId = typeof productModelId === 'string' ? parseInt(productModelId, 10) : productModelId;

  if (isNaN(productModelNumericId)) {
    throw new Error("L'ID du modèle de produit est invalide.");
  }

  const existingItem = this.items.find((item: ICartItemDocument) => {
    if (item.offer instanceof Types.ObjectId) {
        return item.offer.equals(offerObjectId);
    }
    return item.offer._id.equals(offerObjectId);
  });

  if (existingItem) {
    existingItem.quantity += quantity;
    if (existingItem.quantity <= 0) {
        this.items = this.items.filter((item: ICartItemDocument) => {
            if (item.offer instanceof Types.ObjectId) {
                return !item.offer.equals(offerObjectId);
            }
            return !item.offer._id.equals(offerObjectId);
        });
    }
  } else if (quantity > 0) {
    this.items.push({
      _id: new Types.ObjectId(),
      offer: offerObjectId,
      productModel: productModelNumericId,
      quantity: quantity,
      price: price,
      addedAt: new Date(),
    } as ICartItemDocument);
  }
  return this.save();
};

// Méthode pour mettre à jour la quantité d'un article
CartSchema.methods.updateItemQuantity = async function (cartItemId: string | Types.ObjectId, newQuantity: number) {
  const idToUpdate = typeof cartItemId === 'string' ? new Types.ObjectId(cartItemId) : cartItemId;
  const itemToUpdate = this.items.find((item: ICartItemDocument) => item._id.equals(idToUpdate));

  if (itemToUpdate) {
    if (newQuantity > 0) {
      itemToUpdate.quantity = newQuantity;
    } else {
      // Si la nouvelle quantité est 0 ou moins, on retire l'item
      this.items = this.items.filter((item: ICartItemDocument) => !item._id.equals(idToUpdate));
    }
  } else {
    throw new Error("L'article n'a pas été trouvé dans le panier.");
  }

  return this.save();
};

// Méthode pour supprimer un article
CartSchema.methods.removeItem = async function (cartItemId: string | Types.ObjectId) {
  const idToRemove = typeof cartItemId === 'string' ? new Types.ObjectId(cartItemId) : cartItemId;
  this.items = this.items.filter((item: ICartItemDocument) => !item._id.equals(idToRemove));
  return this.save();
};

// Méthode pour vider le panier
CartSchema.methods.clearCart = async function () {
  this.items = [];
  return this.save();
};

const CartModel = (models.Cart as MongooseModel<ICart>) || model<ICart>('Cart', CartSchema);

export default CartModel; 