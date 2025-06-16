import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';

export interface IKeyboardOffer extends IProductBase {
  layout: 'QWERTY' | 'AZERTY' | 'QWERTZ' | string; // string pour d'autres layouts spécifiques
  keySwitchType?: 'Mechanical' | 'Membrane' | 'Optical' | 'Scissor';
  connectivity: 'Wired' | 'Wireless' | 'Wired/Wireless';
  size?: 'Full-size' | 'Tenkeyless (TKL)' | '75%' | '65%' | '60%' | 'Numeric Keypad';
  backlight?: string; // Ex: RGB, White, None
  color?: string;
}

const KeyboardSchema = new Schema<IKeyboardOffer>(
  {
    layout: {
      type: String,
      required: [true, "La disposition (layout) du clavier est obligatoire."],
      trim: true,
    },
    keySwitchType: {
      type: String,
      enum: ['Mechanical', 'Membrane', 'Optical', 'Scissor'],
    },
    connectivity: {
      type: String,
      required: [true, "Le type de connectivité est obligatoire."],
      enum: ['Wired', 'Wireless', 'Wired/Wireless'],
    },
    size: {
      type: String,
      enum: ['Full-size', 'Tenkeyless (TKL)', '75%', '65%', '60%', 'Numeric Keypad'],
    },
    backlight: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
  }
);

let KeyboardOfferModel;
const discriminatorKey = 'keyboards'; // Correspond au KINDS.KEYBOARD

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  KeyboardOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  KeyboardOfferModel = ProductOfferModel.discriminator<IKeyboardOffer>(discriminatorKey, KeyboardSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default KeyboardOfferModel as Model<IKeyboardOffer> | undefined; 