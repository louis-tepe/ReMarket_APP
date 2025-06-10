import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../ProductBaseModel';

export interface IPsuOffer extends IProductBase {
  wattage_w: number;
  efficiencyRating?: '80+ Bronze' | '80+ Silver' | '80+ Gold' | '80+ Platinum' | '80+ Titanium' | '80+ Standard';
  formFactor?: 'ATX' | 'SFX' | 'SFX-L';
  modular?: 'Full' | 'Semi' | 'Non-Modular';
  connectors?: string[]; // Ex: ["1x ATX 24-pin", "2x EPS 8-pin", "4x PCIe 6+2 pin"]
}

const PsuSchema = new Schema<IPsuOffer>(
  {
    wattage_w: {
      type: Number,
      required: [true, "La puissance (wattage) est obligatoire."],
      min: [0, "La puissance doit être positive."],
    },
    efficiencyRating: {
      type: String,
      enum: ['80+ Bronze', '80+ Silver', '80+ Gold', '80+ Platinum', '80+ Titanium', '80+ Standard'],
    },
    formFactor: {
      type: String,
      enum: ['ATX', 'SFX', 'SFX-L'],
    },
    modular: {
      type: String,
      enum: ['Full', 'Semi', 'Non-Modular'],
    },
    connectors: {
      type: [String],
    },
  }
);

let PsuOfferModel;
const discriminatorKey = 'power-supplies-psu'; // Correspond au KINDS.PSU

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  PsuOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  PsuOfferModel = ProductOfferModel.discriminator<IPsuOffer>(discriminatorKey, PsuSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default PsuOfferModel as Model<IPsuOffer> | undefined; 