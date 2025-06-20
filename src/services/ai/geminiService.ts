import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerationConfig,
  Part,
  Content, // Added for correct request structure
} from "@google/generative-ai";

/**
 * Définit la structure pour une partie d'image dans le prompt.
 * Les données de l'image doivent être encodées en base64.
 */
export interface ImagePart {
  mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/heic" | "image/heif";
  data: string; // Chaîne de caractères encodée en base64
}

/**
 * Options pour la génération de contenu avec Gemini.
 */
export interface GeminiOptions {
  modelName?: string;         // Nom spécifique du modèle à utiliser (ex: "gemini-1.5-pro-latest")
  apiKey?: string;            // Clé API Gemini (peut aussi être fournie via les variables d'environnement)
  temperature?: number;       // Contrôle le caractère aléatoire de la sortie.
  maxOutputTokens?: number;   // Nombre maximum de tokens à générer.
  topP?: number;              // Probabilité cumulée pour le filtrage des tokens.
  topK?: number;              // Nombre de tokens les plus probables à considérer.
  responseMimeType?: "text/plain" | "application/json";
  systemInstruction?: string; // Ajout de l'instruction système (simplifié à string)
}

/**
 * Un élément du prompt, qui peut être une chaîne de texte ou une ImagePart.
 */
export type PromptItem = string | ImagePart;

/**
 * Récupère la clé API Gemini depuis les options ou les variables d'environnement.
 * @param apiKey Clé API fournie dans les options (optionnel).
 * @returns La clé API Gemini.
 * @throws Error si la clé API n'est pas trouvée.
 */
function getApiKey(apiKey?: string): string {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Clé API Gemini non fournie.");
  }
  return key;
}

/**
 * Détermine le nom du modèle Gemini à utiliser en fonction des options fournies.
 * @param options Options de configuration Gemini.
 * @returns Le nom du modèle Gemini à utiliser.
 */
function determineModelName(options: GeminiOptions): string {
  if (options.modelName) {
    return options.modelName;
  }
  return "gemini-1.5-flash-latest"; // Modèle par défaut rapide et économique
}

/**
 * Génère du contenu en utilisant l'API Gemini.
 * Peut prendre du texte et/ou des images en entrée.
 *
 * @param promptItems Un simple texte, une ImagePart, ou un tableau de PromptItem pour les requêtes multimodales.
 * @param history Historique de conversation.
 * @param options Options de configuration pour la génération.
 * @returns Une promesse qui se résout avec le texte généré.
 * @throws Error en cas d'échec de la génération ou de configuration invalide.
 */
export async function generateGeminiContent(
  promptItems: (string | ImagePart)[],
  history: Content[],
  options: GeminiOptions = {}
): Promise<string> {
  try {
    const apiKey = getApiKey(options.apiKey);
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = options.modelName || 'gemini-1.5-flash-latest';

    const model = genAI.getGenerativeModel({
      model: modelName,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
      systemInstruction: options.systemInstruction, // Passer l'instruction système ici
    });

    const generationConfig: GenerationConfig = {
      temperature: options.temperature ?? 0.2,
      topK: options.topK,
      topP: options.topP,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      responseMimeType: options.responseMimeType,
    };

    const parts: Part[] = promptItems.map(item => {
      if (typeof item === 'string') {
        return { text: item };
      }
      return { inlineData: { mimeType: item.mimeType, data: item.data } };
    });

    const chat = model.startChat({
      history,
      generationConfig,
    });

    const result = await chat.sendMessageStream(parts);

    let text = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      // En production, vous voudriez peut-être streamer cela directement vers le client.
      // Pour cette fonction, nous accumulons le texte.
      text += chunkText;
    }

    if (!text) {
      // Vérification si la réponse est vide après le streaming
      throw new Error("La réponse de l'API Gemini est vide.");
    }
    
    return text;

  } catch (error) {
    console.error("Erreur lors de la génération de contenu avec Gemini:", error);
    throw error;
  }
}

/**
 * Extrait un score numérique (0-4) de la réponse textuelle de Gemini.
 * @param text La réponse textuelle de Gemini.
 * @returns Le score trouvé, ou null si aucun score valide n'est trouvé.
 */
function extractScoreFromGeminiResponse(text: string): number | null {
  // Cherche un nombre simple (0, 1, 2, 3, 4) entouré potentiellement d'autres caractères non numériques
  // ou des phrases comme "Score: 3", "Note: 4/4"
  const scoreRegex = /(?:score|note|évaluation|état)[^0-9]*([0-4])(?:[^0-9]|$)|\b([0-4])\b/i;
  const match = text.match(scoreRegex);

  if (match) {
    // match[1] correspond au premier groupe capturant (après le mot-clé), match[2] au nombre seul
    const scoreStr = match[1] || match[2];
    if (scoreStr) {
      const score = parseInt(scoreStr, 10);
      if (!isNaN(score) && score >= 0 && score <= 4) {
        return score;
      }
    }
  }
  
  // Tentative plus simple si la réponse est JUSTE le nombre
  const simpleNumberMatch = text.trim().match(/^([0-4])$/);
  if (simpleNumberMatch && simpleNumberMatch[1]) {
    const score = parseInt(simpleNumberMatch[1], 10);
    if (!isNaN(score) && score >= 0 && score <= 4) {
        return score;
    }
  }

  console.warn(`Impossible d'extraire un score valide (0-4) de la réponse Gemini: "${text}"`);
  return null;
}

/**
 * Prépare le prompt pour l'analyse d'image, en s'assurant qu'il demande un score numérique.
 * @param categorySpecificPrompt Le prompt spécifique à la catégorie.
 * @returns Le prompt complet pour l'analyse.
 * @throws Error si le prompt spécifique à la catégorie est vide.
 */
function prepareImageAnalysisPrompt(categorySpecificPrompt: string): string {
  if (!categorySpecificPrompt || !categorySpecificPrompt.trim()) {
    throw new Error("Le prompt spécifique à la catégorie est requis et ne peut pas être vide.");
  }
  // S'assurer que le prompt demande bien un score entre 0 et 4
  return `${categorySpecificPrompt}. Répondez uniquement avec un chiffre entre 0 (très mauvais état / inutilisable) et 4 (excellent état / comme neuf). Votre réponse doit être uniquement ce chiffre.`;
}

/**
 * Analyse l'état visuel d'une image en utilisant l'API Gemini.
 * @param image Une ImagePart (contenant les données base64 et le mimeType).
 * @param categorySpecificPrompt Le prompt spécifique à la catégorie pour guider l'analyse.
 * @param options Options de configuration pour Gemini (ex: apiKey, modelName).
 * @returns Une promesse qui se résout avec le score (0-4) et la réponse brute, ou une structure d'erreur.
 */
export async function analyzeImageCondition(
  image: ImagePart,
  categorySpecificPrompt: string,
  options: GeminiOptions = {}
): Promise<{ score: number | null; rawResponse: string }> {
  try {
    const fullPrompt = prepareImageAnalysisPrompt(categorySpecificPrompt);
    
    const promptItems: PromptItem[] = [
      fullPrompt,
      image,
    ];

    const geminiOptions: GeminiOptions = {
      ...options,
      modelName: options.modelName || 'gemini-1.5-flash-latest',
      maxOutputTokens: options.maxOutputTokens ?? 10,
      temperature: options.temperature ?? 0.2,
    };

    const rawResponse = await generateGeminiContent(promptItems, [], geminiOptions);
    const score = extractScoreFromGeminiResponse(rawResponse);

    return { score, rawResponse };

  } catch (error) {
    console.error("Erreur lors de l'analyse de l'état de l'image avec Gemini:", error);
    let errorMessage = "Erreur inconnue lors de l'analyse Gemini.";
    if (error instanceof Error) {
      errorMessage = `Erreur Gemini: ${error.message}`;
    }
    // Retourne toujours la structure attendue, même en cas d'erreur.
    return { score: null, rawResponse: errorMessage };
  }
}

/*
// ------------- EXEMPLES D'UTILISATION (à placer dans vos composants ou routes API) -------------

// 1. Requête texte simple
async function exempleTexteSimple() {
  try {
    const reponse = await generateGeminiContent(["Explique la relativité générale en une phrase."], []);
    console.log("Réponse (texte simple):", reponse);
  } catch (e) {
    console.error("Erreur exempleTexteSimple:", e);
  }
}

// 2. Requête multimodale (texte et image)
async function exempleMultimodal(imageBase64: string) {
  if (!imageBase64) {
    console.warn("Veuillez fournir une image encodée en base64 pour l'exemple multimodal.");
    return;
  }
  try {
    const prompt: PromptItem[] = [
      "Décris cette image en quelques mots.",
      { mimeType: "image/jpeg", data: imageBase64 } // Assurez-vous que le mimeType correspond à votre image
    ];
    // Pour les requêtes multimodales, assurez-vous d'utiliser un modèle compatible "vision"
    // Gemini 1.5 Flash est multimodal par défaut. Gemini 1.0 Pro nécessitait 'gemini-pro-vision'.
    const reponse = await generateGeminiContent(prompt, [], { modelName: "gemini-1.5-flash-latest" });
    console.log("Réponse (multimodal):", reponse);
  } catch (e) {
    console.error("Erreur exempleMultimodal:", e);
  }
}

// Pour exécuter cet exemple, vous auriez besoin d'une image en base64.
// Par exemple, dans un contexte Node.js:
// import fs from 'fs';
// const imageEnBase64 = fs.readFileSync('chemin/vers/votre/image.jpg', { encoding: 'base64' });
// exempleMultimodal(imageEnBase64);


// 3. Utilisation de 'useThinkingMode' (suggère un modèle plus puissant)
async function exempleThinkingMode() {
  try {
    const reponse = await generateGeminiContent(
      "Écris un court poème sur l'exploration spatiale.",
      { useThinkingMode: true } // Ceci utilisera gemini-1.5-pro-latest par défaut
    );
    console.log("Réponse (useThinkingMode):", reponse);
  } catch (e) {
    console.error("Erreur exempleThinkingMode:", e);
  }
}

// 4. Spécifier un modèle et des paramètres de génération
async function exempleAvecOptionsCompletes() {
  try {
    const reponse = await generateGeminiContent(
      "Quelle est la capitale de l'Australie ?",
      {
        modelName: "gemini-1.5-flash-latest", // ou "gemini-1.5-pro-latest"
        temperature: 0.5,
        maxOutputTokens: 50
      }
    );
    console.log("Réponse (options complètes):", reponse);
  } catch (e) {
    console.error("Erreur exempleAvecOptionsCompletes:", e);
  }
}

// Appels d'exemples (décommentez pour tester dans un environnement approprié)
// exempleTexteSimple();
// exempleThinkingMode();
// exempleAvecOptionsCompletes();
// Pour tester exempleMultimodal, assurez-vous d'avoir une image en base64.
*/ 