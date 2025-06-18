import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface IChargersCablesOffer extends IProductBase {
  type: 'Charger' | 'Cable' | 'Adapter';
  connectorType?: string; // Ex: USB-C, Lightning, Micro-USB
  wattage?: number; // Pour les chargeurs
  length_cm?: number; // Pour les câbles
  color?: string;
}

const ChargersCablesSchema = new Schema<IChargersCablesOffer>({
  type: {
    type: String,
    required: [true, "Le type (chargeur, câble, etc.) est obligatoire."],
    enum: ['Charger', 'Cable', 'Adapter'],
  },
  connectorType: {
    type: String,
    trim: true,
  },
  wattage: {
    type: Number,
    min: [0, "La puissance doit être une valeur positive."],
  },
  length_cm: {
    type: Number,
    min: [0, "La longueur doit être une valeur positive."],
  },
  color: {
    type: String,
    trim: true,
  },
});

const ChargersCablesOfferModel = (models[KINDS.CHARGERS_CABLES] as Model<IChargersCablesOffer>) ||
  ProductOfferModel.discriminator<IChargersCablesOffer>(
    KINDS.CHARGERS_CABLES,
    ChargersCablesSchema
  );

export default ChargersCablesOfferModel; 