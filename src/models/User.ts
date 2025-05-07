import mongoose, { Schema, Document, models, Model } from 'mongoose';

// Interface pour typer les documents User (pour TypeScript)
export interface IUser extends Document {
  email: string;
  name?: string; // Nom optionnel pour l'instant
  password?: string; // Le mot de passe est requis mais peut ne pas être sélectionné par défaut
  image?: string; // Pour une éventuelle image de profil (par exemple via OAuth)
  emailVerified?: Date | null;
  // Ajoutez d'autres champs selon les besoins de ReMarket
  // par exemple : role, adresses, etc.
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      required: [true, "L'email est requis"],
      unique: true,
      lowercase: true,
      trim: true,
      // Regex simple pour la validation de l'email
      match: [/^\S+@\S+\.\S+$/, "Veuillez utiliser une adresse email valide."],
    },
    password: {
      type: String,
      // Le mot de passe n'est pas requis si l'utilisateur s'inscrit via OAuth
      // Vous gérerez la logique de hachage avant de sauvegarder
      select: false, // Par défaut, ne pas retourner le mot de passe lors des requêtes
    },
    image: {
      type: String, // URL de l'image de profil
    },
    emailVerified: {
      type: Date,
      default: null,
    },
    // Ajoutez ici d'autres champs spécifiques à ReMarket
    // role: {
    //   type: String,
    //   enum: ['user', 'seller', 'admin'], // Exemple de rôles
    //   default: 'user',
    // },
  },
  {
    timestamps: true, // Ajoute createdAt et updatedAt automatiquement
  }
);

// Évite la recompilation du modèle si déjà existant (important pour Next.js avec HMR)
const User: Model<IUser> = models.User || mongoose.model<IUser>('User', UserSchema);

export default User; 