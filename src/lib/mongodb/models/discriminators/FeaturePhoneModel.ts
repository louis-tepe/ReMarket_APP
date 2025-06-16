import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';

export interface IFeaturePhoneOffer extends IProductBase {
  screenSize_in?: number;
  storageCapacity_gb?: number;
  ram_gb?: number; // Peut être en MB pour les feature phones, mais GB pour la cohérence
  cameraResolution_mp?: number;
  batteryCapacity_mah?: number;
  color: string;
  imei?: string;
}

const FeaturePhoneSchema = new Schema<IFeaturePhoneOffer>(
  {
    screenSize_in: {
      type: Number,
      min: [0, "La taille de l'écran doit être positive."],
    },
    storageCapacity_gb: {
      type: Number,
      min: [0, "La capacité de stockage doit être positive."],
    },
    ram_gb: {
      type: Number,
      min: [0, "La RAM doit être positive."],
    },
    cameraResolution_mp: {
      type: Number,
      min: [0, "La résolution de la caméra doit être positive."],
    },
    batteryCapacity_mah: {
      type: Number,
      min: [0, "La capacité de la batterie doit être positive."],
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
      required: false,
      sparse: true,
    },
  }
);

let FeaturePhoneOfferModel;
const discriminatorKey = 'feature-phones'; // Correspond au KIND

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  FeaturePhoneOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  FeaturePhoneOfferModel = ProductOfferModel.discriminator<IFeaturePhoneOffer>(discriminatorKey, FeaturePhoneSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default FeaturePhoneOfferModel as Model<IFeaturePhoneOffer> | undefined; 