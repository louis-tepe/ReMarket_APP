import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

// Interface pour les champs spécifiques aux smartphones
export interface ISmartphoneOffer extends IProductBase {
  screenSize_in: number; // Taille de l'écran en pouces
  storageCapacity_gb: number; // Capacité de stockage en GB
  ram_gb: number; // RAM en GB
  cameraResolution_mp?: number; // Résolution de la caméra principale en MP (optionnel)
  batteryCapacity_mah?: number; // Capacité de la batterie en mAh (optionnel)
  operatingSystem: string; // Ex: Android 13, iOS 16
  color: string;
  imei?: string; // IMEI (optionnel, mais important pour les téléphones)
}

const SmartphoneSchema = new Schema<ISmartphoneOffer>(
  {
    screenSize_in: {
      type: Number,
      required: [true, "La taille de l'écran est obligatoire pour un smartphone."],
      min: [0, "La taille de l'écran doit être positive."],
    },
    storageCapacity_gb: {
      type: Number,
      required: [true, "La capacité de stockage est obligatoire pour un smartphone."],
      min: [0, "La capacité de stockage doit être positive."],
    },
    ram_gb: {
      type: Number,
      required: [true, "La RAM est obligatoire pour un smartphone."],
      min: [1, "La RAM doit être d'au moins 1 Go."],
    },
    cameraResolution_mp: {
      type: Number,
      min: [0, "La résolution de la caméra doit être positive."],
    },
    batteryCapacity_mah: {
      type: Number,
      min: [0, "La capacité de la batterie doit être positive."],
    },
    operatingSystem: {
      type: String,
      required: [true, "Le système d'exploitation est obligatoire."],
      trim: true,
    },
    color: {
      type: String,
      required: [true, "La couleur est obligatoire."],
      trim: true,
    },
    imei: {
      type: String,
      trim: true,
      match: [/^\d{15}$/, "L'IMEI doit être composé de 15 chiffres."],
      unique: true,
      sparse: true,
      required: false,
    }
  },
  {
    // Les options de schéma comme timestamps et versionKey sont héritées du ProductBaseSchema
    // Pas besoin de redéfinir discriminatorKey ici, il est déjà sur le parent
  }
);

const SmartphoneOfferModel = (models[KINDS.SMARTPHONE] as Model<ISmartphoneOffer>) ||
  ProductOfferModel.discriminator<ISmartphoneOffer>(
    KINDS.SMARTPHONE,
    SmartphoneSchema
  );

export default SmartphoneOfferModel; 