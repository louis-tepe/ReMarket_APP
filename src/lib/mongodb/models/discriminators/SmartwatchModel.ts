import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../ProductBaseModel';

export interface ISmartwatchOffer extends IProductBase {
  screenSize_in?: number;
  caseMaterial?: string;
  bandMaterial?: string;
  operatingSystem?: string;
  color: string;
  hasGPS?: boolean;
  hasHeartRateMonitor?: boolean;
  waterResistance_atm?: number;
}

const SmartwatchSchema = new Schema<ISmartwatchOffer>(
  {
    screenSize_in: {
      type: Number,
      min: [0, "La taille de l'écran doit être positive."],
    },
    caseMaterial: {
      type: String,
      trim: true,
    },
    bandMaterial: {
      type: String,
      trim: true,
    },
    operatingSystem: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      required: [true, "La couleur est obligatoire."],
      trim: true,
    },
    hasGPS: {
      type: Boolean,
      default: false,
    },
    hasHeartRateMonitor: {
      type: Boolean,
      default: false,
    },
    waterResistance_atm: {
      type: Number,
      min: [0, "La résistance à l'eau doit être positive ou nulle."],
    },
  }
);

let SmartwatchOfferModel;
const discriminatorKey = 'smartwatches'; // Correspond au KINDS.SMARTWATCH

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  SmartwatchOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  SmartwatchOfferModel = ProductOfferModel.discriminator<ISmartwatchOffer>(discriminatorKey, SmartwatchSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default SmartwatchOfferModel as Model<ISmartwatchOffer> | undefined; 