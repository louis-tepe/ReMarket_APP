import { NextResponse } from "next/server";
import {
  generateGeminiContent,
  PromptItem,
  ImagePart,
} from "@/services/ai/geminiService"; // Assurez-vous que le chemin d'importation est correct
import type { Content } from "@google/generative-ai"; // Importer le type Content

// Suggestion: Définir une interface pour le corps de la requête
interface GenerateApiRequestBody {
  prompt?: string;
  imageBase64?: string;
  mimeType?: string; // Pourrait être requis si imageBase64 est présent
  history?: Content[];
}

const systemInstruction = "Vous êtes un conseiller expert pour ReMarket. Votre objectif est d'aider les utilisateurs à trouver le produit d'occasion idéal. Allez droit au but avec des réponses concises, simples et efficaces. Restez objectif et factuel en vous basant sur les besoins de l'utilisateur sans donner d'opinion subjective. Si nécessaire, posez des questions pour clarifier. Guidez les utilisateurs dans le catalogue et aidez-les à comparer les offres de manière objective.";

export async function POST(request: Request) {
  try {
    const body = await request.json() as GenerateApiRequestBody; // Utilisation de l'interface
    const { prompt, imageBase64, mimeType, history = [] } = body;

    if (!prompt && !imageBase64) {
      return NextResponse.json(
        { error: "Un prompt textuel ou une image est requis." },
        { status: 400 }
      );
    }

    const promptItems: PromptItem[] = [];

    if (prompt && typeof prompt === "string") {
      promptItems.push(prompt);
    }

    if (imageBase64 && typeof imageBase64 === "string" && mimeType && typeof mimeType === "string") {
      // Vérification simple du préfixe base64 pour les types d'images courants
      const validMimeTypes: ImagePart["mimeType"][] = [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/heic",
        "image/heif",
      ];
      if (!validMimeTypes.includes(mimeType as ImagePart["mimeType"])) {
        return NextResponse.json(
          { error: "Type MIME de l'image non supporté." },
          { status: 400 }
        );
      }

      // Important: L'API Gemini attend les données base64 SANS le préfixe "data:image/jpeg;base64,"
      const pureBase64Data = imageBase64.startsWith("data:")
        ? imageBase64.substring(imageBase64.indexOf(",") + 1)
        : imageBase64;

      promptItems.push({
        mimeType: mimeType as ImagePart["mimeType"],
        data: pureBase64Data,
      });
    }

    if (promptItems.length === 0) {
      return NextResponse.json(
        { error: "Impossible de construire un prompt valide." },
        { status: 400 }
      );
    }

    const result = await generateGeminiContent(promptItems, history, {
      modelName: "gemini-2.5-flash-lite-preview-06-17",
      systemInstruction: systemInstruction,
    });

    return NextResponse.json({ response: result });

  } catch (error) {
    // Le console.error a été supprimé pour la concision.
    const errorMessage =
      error instanceof Error ? error.message : "Une erreur inconnue est survenue";
    // Évitez de propager des messages d'erreur trop techniques au client en production
    if (errorMessage.includes("API key") || errorMessage.includes("billing") || errorMessage.includes("quota") || errorMessage.includes("Access denied")) {
        return NextResponse.json({ error: "Erreur de configuration ou de service. Veuillez contacter l'administrateur." }, { status: 500 });
    }
    // Message d'erreur générique pour les autres cas
    return NextResponse.json({ error: "Erreur lors de la génération du contenu." }, { status: 500 });
  }
} 