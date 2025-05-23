import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { IUser } from "./User"; // Correction: IUser au lieu de UserDoc

// Interface pour une partie d'un message (inspirée de l'API Gemini)
export interface IMessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // Données encodées en Base64
  };
}

// Interface pour un message dans l'historique du chat
export interface IChatMessage {
  role: "user" | "model"; // Rôle de l'émetteur du message
  parts: IMessagePart[]; // Contenu du message
  timestamp: Date; // Horodatage du message
}

// Interface pour le document ChatSession
export interface IChatSession extends Document {
  userId?: Types.ObjectId | IUser; // Optionnel, pour chats anonymes ultérieurs
  clientSessionId: string; // ID client unique pour la session (avant sauvegarde DB)
  title?: string; // Titre optionnel de la session
  messages: IChatMessage[]; // Historique des messages
  createdAt: Date;
  updatedAt: Date;
}

const MessagePartSchema = new Schema<IMessagePart>(
  {
    text: { type: String },
    inlineData: {
      mimeType: { type: String },
      data: { type: String }, // Données encodées en Base64
    },
  },
  { _id: false } // Pas d'ID propre pour les sous-documents de parties de message
);

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, enum: ["user", "model"], required: true },
    parts: { type: [MessagePartSchema], required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false } // Pas d'ID propre pour les sous-documents de messages
);

const ChatSessionSchema = new Schema<IChatSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    clientSessionId: { type: String, unique: true, required: true, index: true },
    title: { type: String, trim: true }, // Ajout de trim
    messages: { type: [ChatMessageSchema], default: [] },
  },
  { timestamps: true } // Ajoute createdAt et updatedAt
);

const ChatSession: Model<IChatSession> =
  mongoose.models.ChatSession ||
  mongoose.model<IChatSession>("ChatSession", ChatSessionSchema);

export default ChatSession; 