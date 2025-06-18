import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface IPowerBanksOffer extends IProductBase {
  capacity_mah: number;
  outputPorts: string[]; // Ex: ["USB-A", "USB-C"]
  features?: ('Fast-Charging' | 'Wireless-Charging')[];
  color?: string;
}

const PowerBanksSchema = new Schema<IPowerBanksOffer>({
  capacity_mah: {
    type: Number,
    required: [true, "La capacité est obligatoire."],
    min: [0, "La capacité doit être une valeur positive."],
  },
  outputPorts: {
    type: [String],
    required: [true, "Au moins un port de sortie est requis."],
  },
  features: {
    type: [String],
    enum: ['Fast-Charging', 'Wireless-Charging'],
  },
  color: {
    type: String,
    trim: true,
  },
});

const PowerBanksOfferModel = (models[KINDS.POWER_BANKS] as Model<IPowerBanksOffer>) ||
  ProductOfferModel.discriminator<IPowerBanksOffer>(
    KINDS.POWER_BANKS,
    PowerBanksSchema
  );

export default PowerBanksOfferModel; 