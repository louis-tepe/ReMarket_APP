import { Schema, model, models, Document, Types } from 'mongoose';

interface ICartItem extends Document {
  _id: Types.ObjectId; // Ajout explicite de l'identifiant unique de l'item
  offer: Types.ObjectId; // Référence à OfferModel
  quantity: number;
  productModel: Types.ObjectId; // Référence à ProductModel (pour faciliter l'affichage du produit dans le panier)
  addedAt: Date;
}

export interface ICart extends Document {
  user: Types.ObjectId; // Référence à UserModel
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  offer: {
    type: Schema.Types.ObjectId,
    ref: 'Offer',
    required: true,
  },
  productModel: { // Dénormalisation pour un accès plus facile aux détails du produit depuis le panier
    type: Schema.Types.ObjectId,
    ref: 'ProductModel',
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
}, { _id: true }); // _id: true pour que chaque item ait son propre ID, utile pour la suppression/modification

const CartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // Chaque utilisateur a un seul panier
      index: true,
    },
    items: [CartItemSchema],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Méthode pour ajouter ou mettre à jour un article dans le panier
CartSchema.methods.addItem = async function ({ offerId, productModelId, quantity = 1 }: { offerId: string | Types.ObjectId, productModelId: string | Types.ObjectId, quantity?: number }) {
  const cart = this as ICart;
  const offerObjectId = typeof offerId === 'string' ? new Types.ObjectId(offerId) : offerId;
  const productModelObjectId = typeof productModelId === 'string' ? new Types.ObjectId(productModelId) : productModelId;

  const existingItemIndex = cart.items.findIndex(
    (item) => item.offer.equals(offerObjectId)
  );

  if (existingItemIndex > -1) {
    // L'offre est déjà dans le panier, met à jour la quantité
    cart.items[existingItemIndex].quantity += quantity;
    if (cart.items[existingItemIndex].quantity <= 0) {
      // Si la quantité devient 0 ou moins, supprimer l'article
      cart.items.splice(existingItemIndex, 1);
    }
  } else {
    // Nouvelle offre, l'ajouter au panier
    if (quantity > 0) {
      cart.items.push({
        offer: offerObjectId,
        productModel: productModelObjectId,
        quantity: quantity,
        addedAt: new Date(),
      } as ICartItem); // Assertion de type
    }
  }
  await cart.save();
  return cart;
};

// Méthode pour supprimer un article du panier
CartSchema.methods.removeItem = async function (cartItemId: string | Types.ObjectId) {
  const cart = this as ICart;
  const cartItemIdAsObject = typeof cartItemId === 'string' ? new Types.ObjectId(cartItemId) : cartItemId;
  cart.items = cart.items.filter(
    (item: ICartItem) => !item._id.equals(cartItemIdAsObject)
  );
  await cart.save();
  return cart;
};

// Méthode pour vider le panier
CartSchema.methods.clearCart = async function () {
  const cart = this as ICart;
  cart.items = [];
  await cart.save();
  return cart;
};


const CartModel = models.Cart || model<ICart>('Cart', CartSchema);

export default CartModel; 