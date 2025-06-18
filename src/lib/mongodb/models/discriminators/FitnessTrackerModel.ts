import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface IFitnessTrackerOffer extends IProductBase {
  size?: 'S' | 'M' | 'L' | 'S/M' | 'M/L';
  color: string;
  heartRateMonitor: boolean;
  gps: boolean;
  waterResistance_m?: number;
}

const FitnessTrackerSchema = new Schema<IFitnessTrackerOffer>({
  size: {
    type: String,
    enum: ['S', 'M', 'L', 'S/M', 'M/L'],
  },
  color: {
    type: String,
    required: [true, "La couleur est obligatoire."],
    trim: true,
  },
  heartRateMonitor: {
    type: Boolean,
    default: false,
  },
  gps: {
    type: Boolean,
    default: false,
  },
  waterResistance_m: {
    type: Number,
    min: [0, "La résistance à l'eau doit être une valeur positive."],
  },
});

const FitnessTrackerOfferModel = (models[KINDS.FITNESS_TRACKER] as Model<IFitnessTrackerOffer>) ||
  ProductOfferModel.discriminator<IFitnessTrackerOffer>(
    KINDS.FITNESS_TRACKER,
    FitnessTrackerSchema
  );

export default FitnessTrackerOfferModel; 