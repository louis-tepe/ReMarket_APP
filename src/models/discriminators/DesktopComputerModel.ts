import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../ProductBaseModel';

export interface IDesktopComputerOffer extends IProductBase {
  processor: string;
  ram_gb: number;
  storageType: 'SSD' | 'HDD' | 'SSD+HDD';
  storageCapacity_gb: number; // Capacité principale (SSD si mixte)
  secondStorageCapacity_gb?: number; // Capacité du HDD si mixte
  graphicsCard?: string;
  operatingSystem: string;
  formFactor: 'Tower' | 'Mini-PC' | 'All-in-One' | 'Stick-PC';
  color?: string;
}

const DesktopComputerSchema = new Schema<IDesktopComputerOffer>(
  {
    processor: {
      type: String,
      required: [true, "Le type de processeur est obligatoire."],
      trim: true,
    },
    ram_gb: {
      type: Number,
      required: [true, "La RAM est obligatoire."],
      min: [0, "La RAM doit être positive."],
    },
    storageType: {
      type: String,
      required: [true, "Le type de stockage est obligatoire."],
      enum: ['SSD', 'HDD', 'SSD+HDD'],
    },
    storageCapacity_gb: {
      type: Number,
      required: [true, "La capacité de stockage principale est obligatoire."],
      min: [0, "La capacité de stockage doit être positive"],
    },
    secondStorageCapacity_gb: {
      type: Number,
      min: [0, "La capacité du second stockage doit être positive"],
    },
    graphicsCard: {
      type: String,
      trim: true,
    },
    operatingSystem: {
      type: String,
      required: [true, "Le système d'exploitation est obligatoire."],
      trim: true,
    },
    formFactor: {
      type: String,
      required: [true, "Le format (Tower, Mini-PC, etc.) est obligatoire."],
      enum: ['Tower', 'Mini-PC', 'All-in-One', 'Stick-PC'],
    },
    color: {
      type: String,
      trim: true,
    },
  }
);

let DesktopComputerOfferModel;
const discriminatorKey = 'desktop-computers'; // Correspond au KINDS.DESKTOP_COMPUTER

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  DesktopComputerOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  DesktopComputerOfferModel = ProductOfferModel.discriminator<IDesktopComputerOffer>(discriminatorKey, DesktopComputerSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default DesktopComputerOfferModel as Model<IDesktopComputerOffer> | undefined; 