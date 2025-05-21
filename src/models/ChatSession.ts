import mongoose, { Document, Model, Schema } from "mongoose";
import { UserDoc } from "./User"; // Assurez-vous que le chemin vers votre modèle User est correct

// Interface pour une partie de message (similaire à l'API Gemini)
export interface MessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // Base64 encoded data
  };
}

// Interface pour un message dans l'historique de chat
export interface ChatMessage {
  role: "user" | "model";
  parts: MessagePart[];
  timestamp: Date;
}

// Interface pour le document ChatSession
export interface ChatSessionDoc extends Document {
  userId?: UserDoc['_id']; // Optionnel si on autorise des chats anonymes sauvegardés localement plus tard
  clientSessionId: string; // Un ID généré côté client pour identifier la session avant la sauvegarde initiale
  title?: string; // Titre optionnel pour la session de chat
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const messagePartSchema = new Schema<MessagePart>(
  {
    text: { type: String },
    inlineData: {
      mimeType: { type: String },
      data: { type: String },
    },
  },
  { _id: false }
);

const chatMessageSchema = new Schema<ChatMessage>(
  {
    role: { type: String, enum: ["user", "model"], required: true },
    parts: { type: [messagePartSchema], required: true },
    timestamp: { type: Date, default: Date.now }, 
  },
  { _id: false }
);

const chatSessionSchema = new Schema<ChatSessionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true }, // Index pour recherche rapide par utilisateur
    clientSessionId: { type: String, unique: true, required: true, index: true }, // Assurer l'unicité et recherche rapide
    title: { type: String },
    messages: { type: [chatMessageSchema], default: [] },
  },
  { timestamps: true } // Ajoute createdAt et updatedAt automatiquement
);

// Nettoyage pour éviter la recréation du modèle lors du hot-reloading en développement
const ChatSession =
  (mongoose.models.ChatSession as Model<ChatSessionDoc>) ||
  mongoose.model<ChatSessionDoc>("ChatSession", chatSessionSchema);

export default ChatSession; 