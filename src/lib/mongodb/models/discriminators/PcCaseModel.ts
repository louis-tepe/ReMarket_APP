import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface IPcCaseOffer extends IProductBase {
  type: 'ATX' | 'Micro-ATX' | 'Mini-ITX'; // Correspond au format de la carte mère
  color?: string;
  materials?: string; // Ex: "Steel, Tempered Glass"
  includesPowerSupply?: boolean;
}

const PcCaseSchema = new Schema<IPcCaseOffer>({
  type: {
    type: String,
    required: [true, "Le type de boîtier (format) est obligatoire."],
    enum: ['ATX', 'Micro-ATX', 'Mini-ITX'],
  },
  color: {
    type: String,
    trim: true,
  },
  materials: {
    type: String,
    trim: true,
  },
  includesPowerSupply: {
    type: Boolean,
    default: false,
  },
});

const PcCaseOfferModel = (models[KINDS.PC_CASE] as Model<IPcCaseOffer>) ||
  ProductOfferModel.discriminator<IPcCaseOffer>(
    KINDS.PC_CASE,
    PcCaseSchema
  );

export default PcCaseOfferModel; 