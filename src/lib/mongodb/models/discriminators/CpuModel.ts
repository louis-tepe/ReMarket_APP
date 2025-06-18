import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface ICpuOffer extends IProductBase {
  brand: 'Intel' | 'AMD';
  series?: string; // Ex: Core i7, Ryzen 5
  modelName: string; // Ex: 11700K, 5600X
  cores: number;
  threads: number;
  baseClock_ghz: number;
  boostClock_ghz?: number;
  socket?: string; // Ex: LGA1200, AM4
  integratedGraphics?: string;
}

const CpuSchema = new Schema<ICpuOffer>(
  {
    brand: {
      type: String,
      required: [true, "La marque du CPU est obligatoire."],
      enum: ['Intel', 'AMD'],
    },
    series: {
      type: String,
      trim: true,
    },
    modelName: {
      type: String,
      required: [true, "Le nom du modèle de CPU est obligatoire."],
      trim: true,
    },
    cores: {
      type: Number,
      required: [true, "Le nombre de coeurs est obligatoire."],
      min: [1, "Le nombre de coeurs doit être au moins 1."],
    },
    threads: {
      type: Number,
      required: [true, "Le nombre de threads est obligatoire."],
      min: [1, "Le nombre de threads doit être au moins 1."],
    },
    baseClock_ghz: {
      type: Number,
      required: [true, "La fréquence de base est obligatoire."],
      min: [0, "La fréquence de base doit être positive."],
    },
    boostClock_ghz: {
      type: Number,
      min: [0, "La fréquence boost doit être positive."],
    },
    socket: {
      type: String,
      trim: true,
    },
    integratedGraphics: {
      type: String,
      trim: true,
    },
  }
);

const CpuOfferModel = (models[KINDS.CPU] as Model<ICpuOffer>) ||
  ProductOfferModel.discriminator<ICpuOffer>(
    KINDS.CPU,
    CpuSchema
  );

export default CpuOfferModel; 