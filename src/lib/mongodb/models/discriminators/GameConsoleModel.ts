import { Schema, models, Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../SellerProduct';
import { KINDS } from '@/config/discriminatorMapping';

// Interface spécifique si des champs supplémentaires sont nécessaires
export interface IGameConsoleOffer extends IProductBase {
  modelName: string; // Ex: PlayStation 5, Xbox Series X, Nintendo Switch
  storage_gb: number;
  color?: string;
  includesControllers: number; // Nombre de manettes incluses
  isDiscVersion?: boolean; // Pour les consoles avec/sans lecteur de disque
}

// Schéma spécifique
const gameConsoleOfferSchema = new Schema<IGameConsoleOffer>({
  modelName: {
    type: String,
    required: [true, "Le nom du modèle de console est obligatoire."],
    trim: true,
  },
  storage_gb: {
    type: Number,
    required: [true, "La capacité de stockage est obligatoire."],
    min: 1,
  },
  color: {
    type: String,
    trim: true,
  },
  includesControllers: {
    type: Number,
    default: 1,
    min: 0,
  },
  isDiscVersion: {
    type: Boolean
  }
});

const GameConsoleOfferModel = (models[KINDS.GAME_CONSOLE] as Model<IGameConsoleOffer>) ||
  ProductOfferModel.discriminator<IGameConsoleOffer>(
    KINDS.GAME_CONSOLE,
    gameConsoleOfferSchema
  );

export default GameConsoleOfferModel; 