"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGeminiContent = generateGeminiContent;
var generative_ai_1 = require("@google/generative-ai");
/**
 * Récupère la clé API Gemini depuis les options ou les variables d'environnement.
 * @param optionsApiKey Clé API fournie dans les options (optionnel).
 * @returns La clé API Gemini.
 * @throws Error si la clé API n'est pas trouvée.
 */
var getApiKey = function (optionsApiKey) {
    // Priorité : clé dans les options, puis NEXT_PUBLIC_GEMINI_API_KEY, puis GEMINI_API_KEY
    var apiKey = optionsApiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Clé API Gemini non trouvée. Veuillez la définir dans vos variables d'environnement (GEMINI_API_KEY ou NEXT_PUBLIC_GEMINI_API_KEY) ou la passer en option.");
    }
    return apiKey;
};
/**
 * Génère du contenu en utilisant l'API Gemini.
 * Peut prendre du texte et/ou des images en entrée.
 *
 * @param promptItems Un simple texte, une ImagePart, ou un tableau de PromptItem pour les requêtes multimodales.
 * @param options Options de configuration pour la génération.
 * @returns Une promesse qui se résout avec le texte généré.
 * @throws Error en cas d'échec de la génération ou de configuration invalide.
 */
function generateGeminiContent(promptItems_1) {
    return __awaiter(this, arguments, void 0, function (promptItems, options) {
        var apiKey, genAI, activeModelName, model, generationConfig, sdkParts, itemsArray, _i, itemsArray_1, item, contents, result, response, text, error_1;
        var _a, _b;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    apiKey = getApiKey(options.apiKey);
                    genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
                    activeModelName = options.modelName;
                    if (options.useThinkingMode && !activeModelName) {
                        // Par défaut, utilise un modèle plus capable si useThinkingMode est vrai.
                        // Pour les capacités spécifiques de "thinking" de Gemini 2.5 Flash (ou modèles futurs),
                        // l'utilisateur devra spécifier le nom exact du modèle via options.modelName
                        // lorsque ce nom sera officiellement disponible et qu'ils y auront accès.
                        activeModelName = "gemini-1.5-pro-latest";
                        console.warn("L'option 'useThinkingMode' est activ\u00E9e. Utilisation du mod\u00E8le : ".concat(activeModelName, ". ") +
                            "Pour les fonctionnalit\u00E9s sp\u00E9cifiques de 'thinking' de Gemini 2.5 Flash (ou \u00E9quivalent), " +
                            "veuillez fournir le nom exact du mod\u00E8le via 'options.modelName'.");
                    }
                    else if (!activeModelName) {
                        activeModelName = "gemini-1.5-flash-latest"; // Modèle par défaut rapide et économique
                    }
                    model = genAI.getGenerativeModel({
                        model: activeModelName,
                        safetySettings: [
                            { category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                            { category: generative_ai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                            { category: generative_ai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                            { category: generative_ai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                        ],
                    });
                    generationConfig = {
                        temperature: (_a = options.temperature) !== null && _a !== void 0 ? _a : 0.7, // Température par défaut équilibrée
                        topK: options.topK,
                        topP: options.topP,
                        maxOutputTokens: (_b = options.maxOutputTokens) !== null && _b !== void 0 ? _b : 2048, // Limite de tokens par défaut
                    };
                    sdkParts = [];
                    itemsArray = Array.isArray(promptItems) ? promptItems : [promptItems];
                    for (_i = 0, itemsArray_1 = itemsArray; _i < itemsArray_1.length; _i++) {
                        item = itemsArray_1[_i];
                        if (typeof item === "string") {
                            sdkParts.push({ text: item });
                        }
                        else { // C'est une ImagePart
                            sdkParts.push({
                                inlineData: {
                                    mimeType: item.mimeType,
                                    data: item.data, // Doit être une chaîne encodée en base64
                                },
                            });
                        }
                    }
                    if (sdkParts.length === 0) {
                        throw new Error("Le prompt ne peut pas être vide.");
                    }
                    contents = [{ role: "user", parts: sdkParts }];
                    return [4 /*yield*/, model.generateContent({
                            contents: contents,
                            generationConfig: generationConfig,
                        })];
                case 1:
                    result = _c.sent();
                    response = result.response;
                    text = response.text();
                    return [2 /*return*/, text];
                case 2:
                    error_1 = _c.sent();
                    console.error("Erreur lors de la génération de contenu avec Gemini:", error_1);
                    if (error_1 instanceof Error) {
                        if (error_1.message.includes("API key not valid") || error_1.message.includes("provide an API key")) {
                            throw new Error("Clé API Gemini invalide ou non fournie. Veuillez vérifier votre configuration.");
                        }
                        if (error_1.message.toLowerCase().includes("permission denied") || error_1.message.includes("access to model")) {
                            throw new Error("Acc\u00E8s refus\u00E9. V\u00E9rifiez que votre cl\u00E9 API a la permission d'utiliser le mod\u00E8le sp\u00E9cifi\u00E9 (".concat(options.modelName || "par défaut", ")."));
                        }
                        if (error_1.message.includes("billing account")) {
                            throw new Error("Problème de facturation lié à votre projet Google Cloud. Veuillez vérifier votre compte de facturation.");
                        }
                        if (error_1.message.includes("quota")) {
                            throw new Error("Quota d'utilisation de l'API Gemini dépassé. Veuillez vérifier vos limites de quota.");
                        }
                    }
                    // Propager l'erreur pour que l'appelant puisse la gérer
                    throw error_1;
                case 3: return [2 /*return*/];
            }
        });
    });
}
/*
// ------------- EXEMPLES D'UTILISATION (à placer dans vos composants ou routes API) -------------

// 1. Requête texte simple
async function exempleTexteSimple() {
  try {
    const reponse = await generateGeminiContent("Explique la relativité générale en une phrase.");
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
    const reponse = await generateGeminiContent(prompt, { modelName: "gemini-1.5-flash-latest" });
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
