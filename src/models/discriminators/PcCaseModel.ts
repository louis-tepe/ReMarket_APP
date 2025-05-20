import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../ProductBaseModel';

export interface IPcCaseOffer extends IProductBase {
  type: 'Tower (Mid, Full, Mini)' | 'SFF (Small Form Factor)' | 'Cube' | 'Desktop (Horizontal)';
  motherboardSupport?: string[]; // Ex: ['ATX', 'Micro-ATX', 'Mini-ITX']
  material?: string; // Ex: Steel, Aluminum, Tempered Glass
  color?: string;
  psuSupport?: string; // Ex: ATX, SFX
  includedFans?: string; // Ex: "2x 120mm Front, 1x 120mm Rear"
  maxGpuLength_mm?: number;
  maxCpuCoolerHeight_mm?: number;
}

const PcCaseSchema = new Schema<IPcCaseOffer>(
  {
    type: {
      type: String,
      required: [true, "Le type de boîtier est obligatoire."],
      enum: ['Tower (Mid, Full, Mini)', 'SFF (Small Form Factor)', 'Cube', 'Desktop (Horizontal)'],
    },
    motherboardSupport: {
      type: [String],
    },
    material: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    psuSupport: {
      type: String,
      trim: true,
    },
    includedFans: {
      type: String,
      trim: true,
    },
    maxGpuLength_mm: {
      type: Number,
      min: [0, "La longueur maximale GPU doit être positive."],
    },
    maxCpuCoolerHeight_mm: {
      type: Number,
      min: [0, "La hauteur maximale du refroidisseur CPU doit être positive."],
    },
  }
);

let PcCaseOfferModel;
const discriminatorKey = 'pc-cases'; // Correspond au KINDS.PC_CASE

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  PcCaseOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  PcCaseOfferModel = ProductOfferModel.discriminator<IPcCaseOffer>(discriminatorKey, PcCaseSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default PcCaseOfferModel as Model<IPcCaseOffer> | undefined; 