import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';

export interface IStorageOffer extends IProductBase {
  type: 'SSD' | 'HDD' | 'NVMe SSD';
  capacity_gb: number;
  formFactor?: string; // Ex: "2.5 inch", "M.2 2280", "3.5 inch"
  interface?: string; // Ex: SATA III, PCIe 3.0 x4, PCIe 4.0 x4
  readSpeed_mbps?: number;
  writeSpeed_mbps?: number;
}

const StorageSchema = new Schema<IStorageOffer>(
  {
    type: {
      type: String,
      required: [true, "Le type de stockage est obligatoire."],
      enum: ['SSD', 'HDD', 'NVMe SSD'],
    },
    capacity_gb: {
      type: Number,
      required: [true, "La capacité est obligatoire."],
      min: [0, "La capacité doit être positive."],
    },
    formFactor: {
      type: String,
      trim: true,
    },
    interface: {
      type: String,
      trim: true,
    },
    readSpeed_mbps: {
      type: Number,
      min: [0, "La vitesse de lecture doit être positive."],
    },
    writeSpeed_mbps: {
      type: Number,
      min: [0, "La vitesse d'écriture doit être positive."],
    },
  }
);

let StorageOfferModel;
const discriminatorKey = 'storage-ssd-hdd'; // Correspond au KINDS.STORAGE

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  StorageOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  StorageOfferModel = ProductOfferModel.discriminator<IStorageOffer>(discriminatorKey, StorageSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default StorageOfferModel as Model<IStorageOffer> | undefined; 