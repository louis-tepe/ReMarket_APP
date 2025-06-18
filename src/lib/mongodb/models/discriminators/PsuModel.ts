import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface IPsuOffer extends IProductBase {
  wattage: number;
  efficiencyRating: '80+ Bronze' | '80+ Silver' | '80+ Gold' | '80+ Platinum' | '80+ Titanium';
  formFactor: 'ATX' | 'SFX' | 'SFX-L';
  isModular: boolean;
}

const PsuSchema = new Schema<IPsuOffer>({
  wattage: {
    type: Number,
    required: [true, "La puissance (wattage) est obligatoire."],
    min: [0, "La puissance doit être positive."],
  },
  efficiencyRating: {
    type: String,
    required: [true, "La certification d'efficacité est obligatoire."],
    enum: ['80+ Bronze', '80+ Silver', '80+ Gold', '80+ Platinum', '80+ Titanium'],
  },
  formFactor: {
    type: String,
    required: [true, "Le format (ATX, etc.) est obligatoire."],
    enum: ['ATX', 'SFX', 'SFX-L'],
  },
  isModular: {
    type: Boolean,
    default: false,
  },
});

const PsuOfferModel = (models[KINDS.PSU] as Model<IPsuOffer>) ||
  ProductOfferModel.discriminator<IPsuOffer>(
    KINDS.PSU,
    PsuSchema
  );

export default PsuOfferModel; 