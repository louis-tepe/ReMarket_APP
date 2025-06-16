import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';

export interface IMotherboardOffer extends IProductBase {
  socket: string; // Ex: LGA1200, AM4, LGA1700
  chipset: string; // Ex: Z590, B550, Z690
  formFactor: 'ATX' | 'Micro-ATX' | 'Mini-ITX' | 'E-ATX';
  memoryType: 'DDR4' | 'DDR5';
  maxMemory_gb?: number;
  memorySlots?: number;
  pcieSlots?: string; // Ex: "2x PCIe 4.0 x16, 1x PCIe 3.0 x1"
  sataPorts?: number;
  m2Slots?: number;
}

const MotherboardSchema = new Schema<IMotherboardOffer>(
  {
    socket: {
      type: String,
      required: [true, "Le socket CPU est obligatoire."],
      trim: true,
    },
    chipset: {
      type: String,
      required: [true, "Le chipset est obligatoire."],
      trim: true,
    },
    formFactor: {
      type: String,
      required: [true, "Le format de la carte mère est obligatoire."],
      enum: ['ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX'],
    },
    memoryType: {
      type: String,
      required: [true, "Le type de mémoire (RAM) est obligatoire."],
      enum: ['DDR4', 'DDR5'],
    },
    maxMemory_gb: {
      type: Number,
      min: [0, "La mémoire maximale doit être positive."],
    },
    memorySlots: {
      type: Number,
      min: [1, "Il doit y avoir au moins un slot mémoire."],
    },
    pcieSlots: {
      type: String,
      trim: true,
    },
    sataPorts: {
      type: Number,
      min: [0, "Le nombre de ports SATA doit être positif ou nul."],
    },
    m2Slots: {
      type: Number,
      min: [0, "Le nombre de slots M.2 doit être positif ou nul."],
    },
  }
);

let MotherboardOfferModel;
const discriminatorKey = 'motherboards'; // Correspond au KINDS.MOTHERBOARD

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  MotherboardOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  MotherboardOfferModel = ProductOfferModel.discriminator<IMotherboardOffer>(discriminatorKey, MotherboardSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default MotherboardOfferModel as Model<IMotherboardOffer> | undefined; 