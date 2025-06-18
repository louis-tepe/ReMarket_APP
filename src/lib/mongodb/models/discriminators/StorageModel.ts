import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface IStorageOffer extends IProductBase {
  type: 'SSD' | 'HDD' | 'NVMe SSD';
  capacity_gb: number;
  formFactor: '2.5"' | '3.5"' | 'M.2';
}

const StorageSchema = new Schema<IStorageOffer>({
  type: {
    type: String,
    required: [true, "Le type de stockage est obligatoire."],
    enum: ['SSD', 'HDD', 'NVMe SSD'],
  },
  capacity_gb: {
    type: Number,
    required: [true, "La capacité est obligatoire."],
    min: [1, "La capacité doit être d'au moins 1 Go."],
  },
  formFactor: {
    type: String,
    required: [true, "Le format est obligatoire."],
    enum: ['2.5"', '3.5"', 'M.2'],
  },
});

const StorageOfferModel = (models[KINDS.STORAGE] as Model<IStorageOffer>) ||
  ProductOfferModel.discriminator<IStorageOffer>(
    KINDS.STORAGE,
    StorageSchema
  );

export default StorageOfferModel; 