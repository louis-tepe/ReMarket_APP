import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

// Pour les accessoires comme coques, housses, chargeurs etc.,
// les champs spécifiques peuvent être moins nombreux ou plus génériques.

export interface ICasesCoversOffer extends IProductBase {
  compatibleWith?: string[]; // Ex: ["iPhone 13", "iPhone 13 Pro"]
  material?: string; // Ex: Silicone, Cuir, Plastique
  color?: string;
  features?: ('Magsafe' | 'CardHolder' | 'Kickstand')[];
}

const CasesCoversSchema = new Schema<ICasesCoversOffer>({
  compatibleWith: [String],
  material: {
    type: String,
    trim: true,
  },
  color: {
    type: String,
    trim: true,
  },
  features: {
    type: [String],
    enum: ['Magsafe', 'CardHolder', 'Kickstand'],
  },
});

const CasesCoversOfferModel = (models[KINDS.CASES_COVERS] as Model<ICasesCoversOffer>) ||
  ProductOfferModel.discriminator<ICasesCoversOffer>(
    KINDS.CASES_COVERS,
    CasesCoversSchema
  );

export default CasesCoversOfferModel; 