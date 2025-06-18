import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

// Interface pour les champs spécifiques aux ordinateurs portables
export interface ILaptopOffer extends IProductBase {
  processor?: string;
  ram_gb: number;
  storage_gb: number;
  storageType: 'SSD' | 'HDD';
  screenSize_in: number;
  screenResolution?: string;
  graphicsCard?: string;
  color?: string;
}

const LaptopSchema = new Schema<ILaptopOffer>({
  processor: {
    type: String,
    trim: true,
  },
  ram_gb: {
    type: Number,
    required: [true, "La RAM est obligatoire."],
    min: [1, "La RAM doit être d'au moins 1 Go."],
  },
  storage_gb: {
    type: Number,
    required: [true, "La capacité de stockage est obligatoire."],
    min: [1, "Le stockage doit être d'au moins 1 Go."],
  },
  storageType: {
    type: String,
    required: [true, "Le type de stockage (SSD/HDD) est obligatoire."],
    enum: ['SSD', 'HDD'],
  },
  screenSize_in: {
    type: Number,
    required: [true, "La taille de l'écran est obligatoire."],
    min: [0, "La taille de l'écran doit être positive."],
  },
  screenResolution: {
    type: String,
    trim: true,
  },
  graphicsCard: {
    type: String,
    trim: true,
  },
  color: {
    type: String,
    trim: true,
  },
});

const LaptopOfferModel = (models[KINDS.LAPTOP] as Model<ILaptopOffer>) ||
  ProductOfferModel.discriminator<ILaptopOffer>(
    KINDS.LAPTOP,
    LaptopSchema
  );

export default LaptopOfferModel; 