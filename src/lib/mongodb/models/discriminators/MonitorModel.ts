import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../ProductBaseModel';

export interface IMonitorOffer extends IProductBase {
  screenSize_in: number;
  resolution: string; // Ex: "1920x1080", "2560x1440", "4K UHD (3840x2160)"
  panelType?: 'IPS' | 'TN' | 'VA' | 'OLED';
  refreshRate_hz?: number;
  responseTime_ms?: number;
  aspectRatio?: string; // Ex: "16:9", "21:9"
  hasSpeakers?: boolean;
  ports?: string[]; // Ex: ["HDMI", "DisplayPort", "USB-C"]
}

const MonitorSchema = new Schema<IMonitorOffer>(
  {
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
      enum: ['IPS', 'TN', 'VA', 'OLED'],
    },
    refreshRate_hz: {
      type: Number,
      min: [0, "Le taux de rafraîchissement doit être positif."],
    },
    responseTime_ms: {
      type: Number,
      min: [0, "Le temps de réponse doit être positif."],
    },
    aspectRatio: {
      type: String,
      trim: true,
    },
    hasSpeakers: {
      type: Boolean,
      default: false,
    },
    ports: {
      type: [String],
    },
  }
);

let MonitorOfferModel;
const discriminatorKey = 'monitors'; // Correspond au KINDS.MONITOR

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  MonitorOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  MonitorOfferModel = ProductOfferModel.discriminator<IMonitorOffer>(discriminatorKey, MonitorSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default MonitorOfferModel as Model<IMonitorOffer> | undefined; 