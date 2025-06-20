import {
  generateGeminiContent,
  ImagePart,
  GeminiOptions,
  PromptItem,
} from './geminiService';

export interface ImageAnalysisResult {
    score: number | null;
    rawResponse: string;
    reasoning?: string;
}

function extractAnalysisFromJsonResponse(text: string): { score: number | null, reasoning: string | undefined } {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`No JSON object found in Gemini response: "${text}"`);
        return { score: null, reasoning: undefined };
      }
  
      const parsed = JSON.parse(jsonMatch[0]);
      const score = parsed.score;
      const reasoning = parsed.reasoning;
  
      if (typeof score !== 'number') {
        console.warn(`'score' key is missing or not a number in JSON:`, parsed);
        return { score: null, reasoning };
      }
  
      return { score, reasoning };
    } catch (error) {
      console.error(`Error parsing Gemini JSON response: "${text}"`, error);
      return { score: null, reasoning: undefined };
    }
}

export async function analyzeImageCondition(
  image: ImagePart,
  analysisPrompt: string,
  productTitle: string,
  options: GeminiOptions = {}
): Promise<ImageAnalysisResult> {
  const fullPrompt = `Titre du produit de référence: "${productTitle}".
  
  **Tâche Principale :** Évaluer l'état esthétique d'un produit d'occasion à partir d'une photo.

  **Instructions spécifiques à la catégorie :** ${analysisPrompt}

  **Règles de conformité :**
  1.  **Vérification de pertinence :** L'objet sur l'image est-il bien un(e) "${productTitle}" ou un produit très similaire de la même catégorie (par exemple, une autre console de jeu si le produit est une PS5) ?
      -   **Si NON (produit totalement différent)**, le score DOIT être -1. Votre "reasoning" doit expliquer pourquoi l'image n'est pas pertinente (ex: "L'image montre une tasse de café, pas une console de jeu.").
      -   **Si OUI**, passez à l'évaluation.

  2.  **Évaluation et format de sortie :**
      -   Évaluez l'état en vous basant sur les instructions de la catégorie.
      -   Votre réponse DOIT être un objet JSON valide avec la structure exacte : \`{"score": <number|null>, "reasoning": "<string>"}\`. N'ajoutez aucun texte ou explication en dehors de cet objet JSON.
  `;

  try {
    const promptItems: PromptItem[] = [
        fullPrompt,
        image
    ];

    const resultJsonString = await generateGeminiContent(
      promptItems,
      [],
      { ...options }
    );

    if (!resultJsonString || resultJsonString.trim() === '') {
        console.warn("Empty response from Gemini API during image analysis.");
        return { score: null, rawResponse: "Empty response from AI." };
    }
    
    const { score, reasoning } = extractAnalysisFromJsonResponse(resultJsonString);

    return {
        score,
        reasoning,
        rawResponse: resultJsonString,
    };

  } catch (error) {
    console.error("Error during image state analysis with Gemini:", error);
    throw error; 
  }
} 