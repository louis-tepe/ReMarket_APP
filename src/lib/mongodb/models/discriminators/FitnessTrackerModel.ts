import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';

export interface IFitnessTrackerOffer extends IProductBase {
  bandMaterial?: string;
  color: string;
  hasGPS?: boolean;
  hasHeartRateMonitor?: boolean;
  waterResistance_atm?: number;
  batteryLife_days?: number;
}

const FitnessTrackerSchema = new Schema<IFitnessTrackerOffer>(
  {
    bandMaterial: {
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
    batteryLife_days: {
      type: Number,
      min: [0, "L'autonomie de la batterie doit être positive ou nulle."],
    },
  }
);

let FitnessTrackerOfferModel;
const discriminatorKey = 'fitness-trackers'; // Correspond au KINDS.FITNESS_TRACKER

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  FitnessTrackerOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  FitnessTrackerOfferModel = ProductOfferModel.discriminator<IFitnessTrackerOffer>(discriminatorKey, FitnessTrackerSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default FitnessTrackerOfferModel as Model<IFitnessTrackerOffer> | undefined; 