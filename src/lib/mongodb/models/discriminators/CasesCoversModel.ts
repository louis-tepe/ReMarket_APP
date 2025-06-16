import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';

// Pour les accessoires comme coques, housses, chargeurs etc.,
// les champs spécifiques peuvent être moins nombreux ou plus génériques.

export interface ICasesCoversOffer extends IProductBase {
  material?: string;
  color: string;
  compatibleDevice?: string; // Ex: "iPhone 13 Pro", "Samsung Galaxy S22 Ultra"
  type?: 'case' | 'cover' | 'sleeve' | 'skin'; // Type de protection
}

const CasesCoversSchema = new Schema<ICasesCoversOffer>(
  {
    material: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      required: [true, "La couleur est obligatoire."],
      trim: true,
    },
    compatibleDevice: {
      type: String,
      trim: true,
      // required: [true, "L'appareil compatible est obligatoire."] // Peut-être optionnel si le ProductModel le gère
    },
    type: {
      type: String,
      enum: ['case', 'cover', 'sleeve', 'skin'],
    },
  }
);

let CasesCoversOfferModel;
const discriminatorKey = 'cases-covers'; // Correspond au KINDS.CASES_COVERS

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  CasesCoversOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  CasesCoversOfferModel = ProductOfferModel.discriminator<ICasesCoversOffer>(discriminatorKey, CasesCoversSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default CasesCoversOfferModel as Model<ICasesCoversOffer> | undefined; 