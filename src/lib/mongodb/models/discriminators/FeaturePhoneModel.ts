import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface IFeaturePhoneOffer extends IProductBase {
  color: string;
  screenSize_in?: number;
  storage_mb?: number;
  features?: ('Dual-SIM' | 'Bluetooth' | 'FM-Radio' | 'Camera')[];
}

const FeaturePhoneSchema = new Schema<IFeaturePhoneOffer>({
  color: {
    type: String,
    required: [true, "La couleur est obligatoire."],
    trim: true,
  },
  screenSize_in: {
    type: Number,
    min: [0, "La taille de l'écran doit être positive."],
  },
  storage_mb: {
    type: Number,
    min: [0, "Le stockage doit être positif."],
  },
  features: {
    type: [String],
    enum: ['Dual-SIM', 'Bluetooth', 'FM-Radio', 'Camera'],
  },
});

const FeaturePhoneOfferModel = (models[KINDS.FEATURE_PHONES] as Model<IFeaturePhoneOffer>) ||
  ProductOfferModel.discriminator<IFeaturePhoneOffer>(
    KINDS.FEATURE_PHONES,
    FeaturePhoneSchema
  );

export default FeaturePhoneOfferModel; 