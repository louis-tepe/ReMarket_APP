import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';

export interface IRamOffer extends IProductBase {
  type: 'DDR3' | 'DDR4' | 'DDR5';
  capacity_gb: number; // Capacité d'une barrette individuelle ou du kit
  speed_mhz: number;
  modules?: number; // Nombre de barrettes (ex: 1 pour une seule, 2 pour un kit de 2)
  casLatency?: string; // Ex: CL16, CL18
  color?: string;
}

const RamSchema = new Schema<IRamOffer>(
  {
    type: {
      type: String,
      required: [true, "Le type de RAM est obligatoire."],
      enum: ['DDR3', 'DDR4', 'DDR5'],
    },
    capacity_gb: {
      type: Number,
      required: [true, "La capacité est obligatoire."],
      min: [0, "La capacité doit être positive."],
    },
    speed_mhz: {
      type: Number,
      required: [true, "La vitesse est obligatoire."],
      min: [0, "La vitesse doit être positive."],
    },
    modules: {
      type: Number,
      min: [1, "Il doit y avoir au moins une barrette."],
      default: 1,
    },
    casLatency: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
  }
);

let RamOfferModel;
const discriminatorKey = 'ram-memory'; // Correspond au KINDS.RAM

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  RamOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  RamOfferModel = ProductOfferModel.discriminator<IRamOffer>(discriminatorKey, RamSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default RamOfferModel as Model<IRamOffer> | undefined; 