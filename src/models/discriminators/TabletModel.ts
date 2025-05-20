import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../ProductBaseModel';

export interface ITabletOffer extends IProductBase {
  screenSize_in: number;
  storageCapacity_gb: number;
  ram_gb: number;
  operatingSystem: string;
  color: string;
  hasCellular?: boolean;
  processor?: string;
  cameraResolution_mp?: number;
}

const TabletSchema = new Schema<ITabletOffer>(
  {
    screenSize_in: {
      type: Number,
      required: [true, "La taille de l'écran est obligatoire pour une tablette."],
      min: [0, "La taille de l'écran doit être positive."],
    },
    storageCapacity_gb: {
      type: Number,
      required: [true, "La capacité de stockage est obligatoire."],
      min: [0, "La capacité de stockage doit être positive."],
    },
    ram_gb: {
      type: Number,
      required: [true, "La RAM est obligatoire."],
      min: [0, "La RAM doit être positive."],
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
    hasCellular: {
      type: Boolean,
      default: false,
    },
    processor: {
      type: String,
      trim: true,
    },
    cameraResolution_mp: {
      type: Number,
      min: [0, "La résolution de la caméra doit être positive."],
    },
  }
);

let TabletOfferModel;
const discriminatorKey = 'tablets'; // Correspond au KIND KINDS.TABLET

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  TabletOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  TabletOfferModel = ProductOfferModel.discriminator<ITabletOffer>(discriminatorKey, TabletSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default TabletOfferModel as Model<ITabletOffer> | undefined; 