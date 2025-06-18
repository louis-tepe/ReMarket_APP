import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface IScreenProtectorsOffer extends IProductBase {
  compatibleWith: string[];
  material: 'Tempered Glass' | 'Film' | 'Hybrid';
  finish?: 'Glossy' | 'Matte';
  quantityInPack?: number;
}

const ScreenProtectorsSchema = new Schema<IScreenProtectorsOffer>({
  compatibleWith: {
    type: [String],
    required: [true, "L'appareil compatible est obligatoire."],
  },
  material: {
    type: String,
    required: [true, "Le matériau est obligatoire."],
    enum: ['Tempered Glass', 'Film', 'Hybrid'],
  },
  finish: {
    type: String,
    enum: ['Glossy', 'Matte'],
  },
  quantityInPack: {
    type: Number,
    default: 1,
  },
});

const ScreenProtectorsOfferModel = (models[KINDS.SCREEN_PROTECTORS] as Model<IScreenProtectorsOffer>) ||
  ProductOfferModel.discriminator<IScreenProtectorsOffer>(
    KINDS.SCREEN_PROTECTORS,
    ScreenProtectorsSchema
  );

export default ScreenProtectorsOfferModel; 