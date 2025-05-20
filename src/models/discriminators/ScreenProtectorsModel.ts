import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../ProductBaseModel';

export interface IScreenProtectorOffer extends IProductBase {
  material?: 'tempered_glass' | 'film' | 'liquid';
  compatibleDevice?: string; // Ex: "iPhone 13 Pro", "Samsung Galaxy Tab S8"
  features?: string[]; // Ex: ["anti-glare", "privacy", "anti-fingerprint"]
  hardness?: string; // Ex: "9H"
}

const ScreenProtectorSchema = new Schema<IScreenProtectorOffer>(
  {
    material: {
      type: String,
      enum: ['tempered_glass', 'film', 'liquid'],
    },
    compatibleDevice: {
      type: String,
      trim: true,
      // required: [true, "L'appareil compatible est obligatoire."]
    },
    features: {
      type: [String],
    },
    hardness: {
      type: String,
      trim: true,
    },
  }
);

let ScreenProtectorOfferModel;
const discriminatorKey = 'screen-protectors'; // Correspond au KINDS.SCREEN_PROTECTORS

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  ScreenProtectorOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  ScreenProtectorOfferModel = ProductOfferModel.discriminator<IScreenProtectorOffer>(discriminatorKey, ScreenProtectorSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default ScreenProtectorOfferModel as Model<IScreenProtectorOffer> | undefined; 