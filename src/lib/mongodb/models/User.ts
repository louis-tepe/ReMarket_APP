import mongoose, { Schema, Document, models, Model as MongooseModel, Types } from 'mongoose';

// Interface pour l'adresse de livraison/expédition
export interface IShippingAddress {
  _id: Types.ObjectId; // Ajout de l'ID pour chaque adresse
  companyName?: string;
  name: string;
  address: string;
  houseNumber: string;
  city: string;
  postalCode: string;
  country: string; // ISO 2 Code, e.g., 'FR'
  telephone?: string;
}

// Interface pour le document User
export interface IUser extends Document {
  _id: Types.ObjectId; // ID unique de l'utilisateur
  email: string; // Email unique et requis
  name?: string; // Nom d'utilisateur (optionnel)
  password?: string; // Mot de passe haché (non sélectionné par défaut)
  image?: string; // URL de l'image de profil (via OAuth ou upload)
  emailVerified?: Date | null; // Date de vérification de l'email
  role: 'user' | 'seller' | 'admin'; // Rôle de l'utilisateur sur la plateforme
  favorites: number[]; // IDs des ProductModels favoris (maintenant numériques)
  shippingAddresses: IShippingAddress[]; // Changé pour un tableau
  sendcloudSenderId?: number; // ID de l'adresse d'expéditeur chez Sendcloud
  createdAt: Date;
  updatedAt: Date;
}

const ShippingAddressSchema: Schema<IShippingAddress> = new Schema({
  companyName: { type: String, trim: true },
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  houseNumber: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  telephone: { type: String, trim: true },
}, { _id: true }); // Mongoose ajoutera un _id

const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      trim: true, // Ajout de trim
    },
    email: {
      type: String,
      required: [true, "L'adresse email est obligatoire."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "Veuillez utiliser une adresse email valide."], // Regex améliorée
    },
    password: {
      type: String,
      // Mot de passe non requis si authentification OAuth.
      // Hachage géré avant la sauvegarde.
      select: false, // Ne pas retourner le mot de passe par défaut.
    },
    image: {
      type: String, 
      trim: true, // Ajout de trim pour l'URL
    },
    emailVerified: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      enum: { // Utilisation de l'objet enum pour message personnalisé
        values: ['user', 'seller', 'admin'],
        message: "Le rôle '{VALUE}' n'est pas supporté."
      },
      default: 'user',
      required: [true, "Le rôle de l'utilisateur est obligatoire."],
    },
    favorites: [
      {
        type: Number,
        ref: 'ScrapingProduct', // Réf. à ScrapingProduct
      },
    ],
    shippingAddresses: {
      type: [ShippingAddressSchema], // Utilisation d'un tableau de schémas
      default: [],
    },
    sendcloudSenderId: {
      type: Number,
      required: false,
    }
  },
  {
    timestamps: true, 
  }
);

// Index sur 'email' pour assurer l'unicité et optimiser les recherches.
// Mongoose crée automatiquement cet index à cause de `unique: true` sur `email`.

const User: MongooseModel<IUser> = models.User || mongoose.model<IUser>('User', UserSchema);

export default User; 