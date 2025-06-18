import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

export interface IMonitorOffer extends IProductBase {
  screenSize_in: number;
  resolution: string; // Ex: 1920x1080, 2560x1440, 3840x2160
  panelType: 'IPS' | 'TN' | 'VA' | 'OLED';
  refreshRate_hz: number;
  hasSpeakers?: boolean;
}

const MonitorSchema = new Schema<IMonitorOffer>({
  screenSize_in: {
    type: Number,
    required: [true, "La taille de l'écran est obligatoire."],
    min: [0, "La taille de l'écran doit être positive."],
  },
  resolution: {
    type: String,
    required: [true, "La résolution est obligatoire."],
    trim: true,
  },
  panelType: {
    type: String,
    required: [true, "Le type de dalle est obligatoire."],
    enum: ['IPS', 'TN', 'VA', 'OLED'],
  },
  refreshRate_hz: {
    type: Number,
    required: [true, "Le taux de rafraîchissement est obligatoire."],
    min: [0, "Le taux de rafraîchissement doit être positif."],
  },
  hasSpeakers: {
    type: Boolean,
    default: false,
  },
});

const MonitorOfferModel = (models[KINDS.MONITOR] as Model<IMonitorOffer>) ||
  ProductOfferModel.discriminator<IMonitorOffer>(
    KINDS.MONITOR,
    MonitorSchema
  );

export default MonitorOfferModel; 