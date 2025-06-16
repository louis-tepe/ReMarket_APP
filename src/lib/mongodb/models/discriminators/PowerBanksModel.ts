import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';

export interface IPowerBankOffer extends IProductBase {
  capacity_mah: number;
  outputPorts?: number; // Nombre de ports de sortie
  inputPorts?: string; // Type de port d'entrée (ex: USB-C, Micro-USB)
  weight_g?: number;
  color?: string;
}

const PowerBankSchema = new Schema<IPowerBankOffer>(
  {
    capacity_mah: {
      type: Number,
      required: [true, "La capacité de la batterie externe est obligatoire."],
      min: [0, "La capacité doit être positive."],
    },
    outputPorts: {
      type: Number,
      min: [1, "Il doit y avoir au moins un port de sortie."],
    },
    inputPorts: {
      type: String,
      trim: true,
    },
    weight_g: {
      type: Number,
      min: [0, "Le poids doit être positif."],
    },
    color: {
      type: String,
      trim: true,
    },
  }
);

let PowerBankOfferModel;
const discriminatorKey = 'power-banks'; // Correspond au KINDS.POWER_BANKS

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  PowerBankOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  PowerBankOfferModel = ProductOfferModel.discriminator<IPowerBankOffer>(discriminatorKey, PowerBankSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default PowerBankOfferModel as Model<IPowerBankOffer> | undefined; 