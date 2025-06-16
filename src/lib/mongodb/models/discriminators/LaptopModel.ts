import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct'; // Chemin vers le modèle de base

// Interface pour les champs spécifiques aux ordinateurs portables
export interface ILaptopOffer extends IProductBase {
  screenSize_in: number; // Taille de l'écran en pouces
  processor: string; // Type de processeur (ex: Intel Core i7 11th Gen, AMD Ryzen 7 5800H)
  ram_gb: number; // RAM en GB
  storageType: 'SSD' | 'HDD' | 'eMMC'; // Type de stockage
  storageCapacity_gb: number; // Capacité de stockage en GB
  graphicsCard?: string; // Carte graphique (optionnel, ex: NVIDIA GeForce RTX 3060, AMD Radeon RX 6700M)
  operatingSystem: string; // Ex: Windows 11 Pro, macOS Monterey
  hasWebcam?: boolean;
  color: string;
}

const LaptopSchema = new Schema<ILaptopOffer>(
  {
    screenSize_in: {
      type: Number,
      required: [true, "La taille de l'écran est obligatoire pour un ordinateur portable."],
      min: [0, "La taille de l'écran doit être positive."],
    },
    processor: {
      type: String,
      required: [true, "Le type de processeur est obligatoire."],
      trim: true,
    },
    ram_gb: {
      type: Number,
      required: [true, "La RAM est obligatoire."],
      min: [0, "La RAM doit être positive."],
    },
    storageType: {
      type: String,
      required: [true, "Le type de stockage est obligatoire."],
      enum: ['SSD', 'HDD', 'eMMC'],
    },
    storageCapacity_gb: {
      type: Number,
      required: [true, "La capacité de stockage est obligatoire."],
      min: [0, "La capacité de stockage doit être positive"],
    },
    graphicsCard: {
      type: String,
      trim: true,
    },
    operatingSystem: {
      type: String,
      required: [true, "Le système d'exploitation est obligatoire."],
      trim: true,
    },
    hasWebcam: {
        type: Boolean,
        default: true,
    },
    color: {
      type: String,
      required: [true, "La couleur est obligatoire."],
      trim: true,
    },
  },
  {
    // Les options de schéma comme timestamps et versionKey sont héritées du ProductBaseSchema
  }
);

// Création du discriminateur pour les ordinateurs portables
// Le nom 'LaptopOffer' correspondra à la valeur du champ 'kind'.
let LaptopOfferModel;
if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators.laptops) {
  LaptopOfferModel = models.ProductOffer.discriminators.laptops;
} else if (models.ProductOffer) {
  LaptopOfferModel = ProductOfferModel.discriminator<ILaptopOffer>('laptops', LaptopSchema);
} else {
  console.error("ProductOfferModel base model not found when defining LaptopOffer discriminator. This might lead to critical issues if not resolved.");
}

export default LaptopOfferModel as Model<ILaptopOffer> | undefined; 