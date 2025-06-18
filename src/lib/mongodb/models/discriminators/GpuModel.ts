import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface IGpuOffer extends IProductBase {
  brand: 'NVIDIA' | 'AMD' | 'Intel';
  chipset: string; // Ex: GeForce RTX 3080, Radeon RX 6800 XT
  vram_gb: number;
  vramType: 'GDDR6' | 'GDDR6X' | 'GDDR5' | 'HBM2';
}

const GpuSchema = new Schema<IGpuOffer>({
  brand: {
    type: String,
    required: [true, "La marque de la carte graphique est obligatoire."],
    enum: ['NVIDIA', 'AMD', 'Intel'],
  },
  chipset: {
    type: String,
    required: [true, "Le chipset est obligatoire."],
    trim: true,
  },
  vram_gb: {
    type: Number,
    required: [true, "La mémoire VRAM est obligatoire."],
    min: [1, "La VRAM doit être d'au moins 1 Go."],
  },
  vramType: {
    type: String,
    required: [true, "Le type de VRAM est obligatoire."],
    enum: ['GDDR6', 'GDDR6X', 'GDDR5', 'HBM2'],
  },
});

const GpuOfferModel = (models[KINDS.GPU] as Model<IGpuOffer>) ||
  ProductOfferModel.discriminator<IGpuOffer>(
    KINDS.GPU,
    GpuSchema
  );

export default GpuOfferModel; 