import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface IMotherboardOffer extends IProductBase {
  socket: string; // Ex: AM4, LGA1200
  formFactor: 'ATX' | 'Micro-ATX' | 'Mini-ITX';
  chipset: string; // Ex: B550, Z590
  ramSlots: number;
  ramType: 'DDR4' | 'DDR5';
}

const MotherboardSchema = new Schema<IMotherboardOffer>({
  socket: {
    type: String,
    required: [true, "Le socket du CPU est obligatoire."],
    trim: true,
  },
  formFactor: {
    type: String,
    required: [true, "Le format (ATX, etc.) est obligatoire."],
    enum: ['ATX', 'Micro-ATX', 'Mini-ITX'],
  },
  chipset: {
    type: String,
    required: [true, "Le chipset est obligatoire."],
    trim: true,
  },
  ramSlots: {
    type: Number,
    required: [true, "Le nombre d'emplacements RAM est obligatoire."],
    min: [1, "Il doit y avoir au moins 1 emplacement RAM."],
  },
  ramType: {
    type: String,
    required: [true, "Le type de RAM (DDR4, etc.) est obligatoire."],
    enum: ['DDR4', 'DDR5'],
  },
});

const MotherboardOfferModel = (models[KINDS.MOTHERBOARD] as Model<IMotherboardOffer>) ||
  ProductOfferModel.discriminator<IMotherboardOffer>(
    KINDS.MOTHERBOARD,
    MotherboardSchema
  );

export default MotherboardOfferModel; 