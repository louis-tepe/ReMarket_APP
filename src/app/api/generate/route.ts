import { NextResponse } from "next/server";
import {
  generateGeminiContent,
  PromptItem,
  ImagePart,
} from "@/services/geminiService"; // Assurez-vous que le chemin d'importation est correct
import type { Content } from "@google/generative-ai"; // Importer le type Content

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, imageBase64, mimeType, useThinking, history } = body as {
      prompt?: string;
      imageBase64?: string;
      mimeType?: string;
      useThinking?: boolean;
      history?: Content[]; // Spécifier le type de l'historique
    };

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

    const result = await generateGeminiContent(promptItems, {
      useThinkingMode: !!useThinking, // Convertit en booléen
      history: history, // Passer l'historique au service
        // Vous pouvez ajouter d'autres options ici si nécessaire
        // modelName: useThinking ? "gemini-1.5-pro-latest" : "gemini-1.5-flash-latest",
    });

    return NextResponse.json({ response: result });

  } catch (error) {
    console.error("[API_GENERATE_ERROR]", error);
    const errorMessage =
      error instanceof Error ? error.message : "Une erreur inconnue est survenue";
    // Évitez de propager des messages d'erreur trop techniques au client en production
    if (errorMessage.includes("API key") || errorMessage.includes("billing") || errorMessage.includes("quota") || errorMessage.includes("Access denied")) {
        return NextResponse.json({ error: "Erreur de configuration ou de service. Veuillez contacter l'administrateur." }, { status: 500 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 