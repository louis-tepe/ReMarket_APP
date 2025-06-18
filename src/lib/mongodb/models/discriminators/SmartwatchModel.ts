import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface ISmartwatchOffer extends IProductBase {
  caseSize_mm: number;
  caseMaterial?: 'Aluminum' | 'Stainless Steel' | 'Titanium' | 'Plastic';
  color: string;
  connectivity?: ('GPS' | 'Cellular')[];
}

const SmartwatchSchema = new Schema<ISmartwatchOffer>({
  caseSize_mm: {
    type: Number,
    required: [true, "La taille du boîtier est obligatoire."],
    min: [0, "La taille du boîtier doit être positive."],
  },
  caseMaterial: {
    type: String,
    enum: ['Aluminum', 'Stainless Steel', 'Titanium', 'Plastic'],
  },
  color: {
    type: String,
    required: [true, "La couleur est obligatoire."],
    trim: true,
  },
  connectivity: {
    type: [String],
    enum: ['GPS', 'Cellular'],
  },
});

const SmartwatchOfferModel = (models[KINDS.SMARTWATCH] as Model<ISmartwatchOffer>) ||
  ProductOfferModel.discriminator<ISmartwatchOffer>(
    KINDS.SMARTWATCH,
    SmartwatchSchema
  );

export default SmartwatchOfferModel; 