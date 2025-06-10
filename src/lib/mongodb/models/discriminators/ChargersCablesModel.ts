import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../ProductBaseModel';

export interface IChargersCablesOffer extends IProductBase {
  type: 'charger' | 'cable' | 'adapter';
  connectorType?: string; // Ex: USB-C, Lightning, Micro-USB
  cableLength_m?: number;
  wattage_w?: number; // Pour les chargeurs
  color?: string;
}

const ChargersCablesSchema = new Schema<IChargersCablesOffer>(
  {
    type: {
      type: String,
      required: [true, "Le type (chargeur, câble, adaptateur) est obligatoire."],
      enum: ['charger', 'cable', 'adapter'],
    },
    connectorType: {
      type: String,
      trim: true,
    },
    cableLength_m: {
      type: Number,
      min: [0, "La longueur du câble doit être positive."],
    },
    wattage_w: {
      type: Number,
      min: [0, "La puissance doit être positive."],
    },
    color: {
      type: String,
      trim: true,
    },
  }
);

let ChargersCablesOfferModel;
const discriminatorKey = 'chargers-cables'; // Correspond au KINDS.CHARGERS_CABLES

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  ChargersCablesOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  ChargersCablesOfferModel = ProductOfferModel.discriminator<IChargersCablesOffer>(discriminatorKey, ChargersCablesSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default ChargersCablesOfferModel as Model<IChargersCablesOffer> | undefined; 