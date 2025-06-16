import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';

export interface IGpuOffer extends IProductBase {
  brand: 'NVIDIA' | 'AMD' | 'Intel';
  series?: string; // Ex: GeForce RTX, Radeon RX, Arc
  modelName: string; // Ex: 3080, RX 6800XT, A770
  memory_gb: number;
  memoryType?: string; // Ex: GDDR6, GDDR6X
  interface?: string; // Ex: PCIe 4.0
  ports?: string[]; // Ex: ["HDMI 2.1", "DisplayPort 1.4a"]
}

const GpuSchema = new Schema<IGpuOffer>(
  {
    brand: {
      type: String,
      required: [true, "La marque de la GPU est obligatoire."],
      enum: ['NVIDIA', 'AMD', 'Intel'],
    },
    series: {
      type: String,
      trim: true,
    },
    modelName: {
      type: String,
      required: [true, "Le nom du modèle de GPU est obligatoire."],
      trim: true,
    },
    memory_gb: {
      type: Number,
      required: [true, "La quantité de mémoire est obligatoire."],
      min: [0, "La mémoire doit être positive."],
    },
    memoryType: {
      type: String,
      trim: true,
    },
    interface: {
      type: String,
      trim: true,
    },
    ports: {
      type: [String],
    },
  }
);

let GpuOfferModel;
const discriminatorKey = 'gpus-graphics-cards'; // Correspond au KINDS.GPU

if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators[discriminatorKey]) {
  GpuOfferModel = models.ProductOffer.discriminators[discriminatorKey];
} else if (models.ProductOffer) {
  GpuOfferModel = ProductOfferModel.discriminator<IGpuOffer>(discriminatorKey, GpuSchema);
} else {
  console.error(`ProductOfferModel base model not found when defining ${discriminatorKey} discriminator.`);
}

export default GpuOfferModel as Model<IGpuOffer> | undefined; 