import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface IKeyboardOffer extends IProductBase {
  layout: 'AZERTY' | 'QWERTY' | 'Other';
  format: 'Full-size' | 'TKL' | '75%' | '60%' | 'Other';
  switchType?: 'Mechanical' | 'Membrane' | 'Optical'; // Type de touches
  connectivity: ('Wired' | 'Bluetooth' | '2.4GHz-Wireless')[];
  isBacklit: boolean;
}

const KeyboardSchema = new Schema<IKeyboardOffer>({
  layout: {
    type: String,
    required: [true, "La disposition (AZERTY, etc.) est obligatoire."],
    enum: ['AZERTY', 'QWERTY', 'Other'],
  },
  format: {
    type: String,
    required: [true, "Le format (Full-size, etc.) est obligatoire."],
    enum: ['Full-size', 'TKL', '75%', '60%', 'Other'],
  },
  switchType: {
    type: String,
    enum: ['Mechanical', 'Membrane', 'Optical'],
  },
  connectivity: {
    type: [String],
    required: [true, "Le type de connectivité est obligatoire."],
    enum: ['Wired', 'Bluetooth', '2.4GHz-Wireless'],
  },
  isBacklit: {
    type: Boolean,
    default: false,
  },
});

const KeyboardOfferModel = (models[KINDS.KEYBOARD] as Model<IKeyboardOffer>) ||
  ProductOfferModel.discriminator<IKeyboardOffer>(
    KINDS.KEYBOARD,
    KeyboardSchema
  );

export default KeyboardOfferModel; 