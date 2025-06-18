import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface IDesktopComputerOffer extends IProductBase {
  processor?: string; // Ex: "Intel Core i7-11700K"
  graphicsCard?: string; // Ex: "NVIDIA GeForce RTX 3080"
  ram_gb: number;
  storage_gb: number;
  storageType: 'SSD' | 'HDD';
  formFactor: 'Tower' | 'Small Form Factor' | 'All-in-One';
}

const DesktopComputerSchema = new Schema<IDesktopComputerOffer>({
  processor: {
    type: String,
    trim: true,
  },
  graphicsCard: {
    type: String,
    trim: true,
  },
  ram_gb: {
    type: Number,
    required: [true, "La quantité de RAM est obligatoire."],
    min: [1, "La RAM doit être d'au moins 1 Go."],
  },
  storage_gb: {
    type: Number,
    required: [true, "La capacité de stockage est obligatoire."],
    min: [1, "Le stockage doit être d'au moins 1 Go."],
  },
  storageType: {
    type: String,
    required: [true, "Le type de stockage est obligatoire."],
    enum: ['SSD', 'HDD'],
  },
  formFactor: {
    type: String,
    required: [true, "Le format (tour, etc.) est obligatoire."],
    enum: ['Tower', 'Small Form Factor', 'All-in-One'],
  },
});

const DesktopComputerOfferModel = (models[KINDS.DESKTOP_COMPUTER] as Model<IDesktopComputerOffer>) ||
  ProductOfferModel.discriminator<IDesktopComputerOffer>(
    KINDS.DESKTOP_COMPUTER,
    DesktopComputerSchema
  );

export default DesktopComputerOfferModel; 