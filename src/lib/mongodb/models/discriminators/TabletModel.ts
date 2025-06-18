import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface ITabletOffer extends IProductBase {
  screenSize_in: number;
  storage_gb: number;
  color: string;
  connectivity: ('Wi-Fi' | 'Wi-Fi + Cellular')[];
}

const TabletSchema = new Schema<ITabletOffer>({
  screenSize_in: {
    type: Number,
    required: [true, "La taille de l'écran est obligatoire."],
    min: [0, "La taille de l'écran doit être positive."],
  },
  storage_gb: {
    type: Number,
    required: [true, "La capacité de stockage est obligatoire."],
    min: [1, "Le stockage doit être d'au moins 1 Go."],
  },
  color: {
    type: String,
    required: [true, "La couleur est obligatoire."],
    trim: true,
  },
  connectivity: {
    type: [String],
    required: [true, "Le type de connectivité est obligatoire."],
    enum: ['Wi-Fi', 'Wi-Fi + Cellular'],
  },
});

const TabletOfferModel = (models[KINDS.TABLET] as Model<ITabletOffer>) ||
  ProductOfferModel.discriminator<ITabletOffer>(
    KINDS.TABLET,
    TabletSchema
  );

export default TabletOfferModel; 