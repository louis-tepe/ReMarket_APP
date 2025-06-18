import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface IRamOffer extends IProductBase {
  type: 'DDR4' | 'DDR5' | 'DDR3';
  capacity_gb: number; // Capacité d'une barrette
  modules: number; // Nombre de barrettes
  speed_mhz: number;
}

const RamSchema = new Schema<IRamOffer>({
  type: {
    type: String,
    required: [true, "Le type de RAM est obligatoire."],
    enum: ['DDR4', 'DDR5', 'DDR3'],
  },
  capacity_gb: {
    type: Number,
    required: [true, "La capacité par module est obligatoire."],
    min: [1, "La capacité doit être d'au moins 1 Go."],
  },
  modules: {
    type: Number,
    required: [true, "Le nombre de modules est obligatoire."],
    min: [1, "Il doit y avoir au moins 1 module."],
  },
  speed_mhz: {
    type: Number,
    required: [true, "La vitesse est obligatoire."],
    min: [100, "La vitesse semble trop basse."],
  },
});

const RamOfferModel = (models[KINDS.RAM] as Model<IRamOffer>) ||
  ProductOfferModel.discriminator<IRamOffer>(
    KINDS.RAM,
    RamSchema
  );

export default RamOfferModel;