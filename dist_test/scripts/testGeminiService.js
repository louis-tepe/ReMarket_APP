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
var geminiService_1 = require("../services/geminiService");
// Simule une image encodée en base64 (remplacez par une vraie image pour un test complet)
// Ceci est une représentation très simplifiée et petite d'un pixel transparent en PNG.
var fakePngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
var testGeminiFunctionality = function () { return __awaiter(void 0, void 0, void 0, function () {
    var promptTextSimple, responseTextSimple, error_1, imagePart, promptTextImage, responseTextImage, error_2, promptTextFlash, responseTextFlash, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("Début du test du service Gemini...");
                console.log("Valeur de GEMINI_API_KEY au d\u00E9but du test: ".concat(process.env.GEMINI_API_KEY ? ('Définie: ' + process.env.GEMINI_API_KEY.substring(0, 10) + '...') : 'Non définie ou vide'));
                // Test 1: Texte simple avec useThinkingMode
                console.log("\n--- Test 1: Texte simple avec useThinkingMode ---");
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                promptTextSimple = "Décris brièvement le concept de trou noir en termes simples pour un enfant de 10 ans.";
                return [4 /*yield*/, (0, geminiService_1.generateGeminiContent)(promptTextSimple, { useThinkingMode: true })];
            case 2:
                responseTextSimple = _a.sent();
                console.log("Prompt:", promptTextSimple);
                console.log("Réponse Gemini:", responseTextSimple);
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error("Erreur lors du test texte simple:", error_1);
                return [3 /*break*/, 4];
            case 4:
                // Test 2: Image factice et texte avec useThinkingMode
                console.log("\n--- Test 2: Image factice et texte avec useThinkingMode ---");
                _a.label = 5;
            case 5:
                _a.trys.push([5, 7, , 8]);
                imagePart = {
                    mimeType: "image/png",
                    data: fakePngBase64,
                };
                promptTextImage = [
                    "Cette image est très petite et simple. Peux-tu spéculer sur ce qu'elle pourrait représenter si elle était beaucoup plus grande et détaillée, tout en gardant à l'esprit qu'il s'agit d'un test ?",
                    imagePart,
                ];
                return [4 /*yield*/, (0, geminiService_1.generateGeminiContent)(promptTextImage, {
                        useThinkingMode: true,
                        // Si vous avez accès à un modèle spécifique pour le "thinking" comme gemini-2.5-flash-preview:thinking,
                        // vous pouvez le spécifier ici pour un test plus ciblé :
                        // modelName: "gemini-2.5-flash-preview:thinking"
                    })];
            case 6:
                responseTextImage = _a.sent();
                console.log("Prompt:", promptTextImage[0]);
                console.log("Réponse Gemini (image factice):", responseTextImage);
                return [3 /*break*/, 8];
            case 7:
                error_2 = _a.sent();
                console.error("Erreur lors du test image factice et texte:", error_2);
                return [3 /*break*/, 8];
            case 8:
                // Test 3: Texte simple avec un modèle spécifique (flash)
                console.log("\n--- Test 3: Texte simple avec modèle flash ---");
                _a.label = 9;
            case 9:
                _a.trys.push([9, 11, , 12]);
                promptTextFlash = "Quelle est la vitesse de la lumière ?";
                return [4 /*yield*/, (0, geminiService_1.generateGeminiContent)(promptTextFlash, { modelName: "gemini-1.5-flash-latest" })];
            case 10:
                responseTextFlash = _a.sent();
                console.log("Prompt:", promptTextFlash);
                console.log("Réponse Gemini:", responseTextFlash);
                return [3 /*break*/, 12];
            case 11:
                error_3 = _a.sent();
                console.error("Erreur lors du test texte simple avec flash:", error_3);
                return [3 /*break*/, 12];
            case 12:
                console.log("\nFin du test du service Gemini.");
                return [2 /*return*/];
        }
    });
}); };
// Exécution du script de test
if (require.main === module) {
    try {
        var dotenv = require("dotenv");
        var path = require("path");
        // Corrigé: ../../ pour remonter de dist_test/scripts/ à la racine du projet remarket-app
        var envPath = path.resolve(__dirname, "../../.env.local");
        console.log("Tentative de chargement de .env depuis: ".concat(envPath));
        var dotenvResult = dotenv.config({ path: envPath });
        if (dotenvResult.error) {
            console.warn("Erreur lors du chargement de .env.local:", dotenvResult.error);
        }
        if (dotenvResult.parsed) {
            console.log("Variables chargées depuis .env.local:", Object.keys(dotenvResult.parsed));
            // Affiche les premiers caractères de la clé pour confirmer qu'elle est chargée sans l'exposer entièrement
            if (process.env.GEMINI_API_KEY) {
                console.log("GEMINI_API_KEY charg\u00E9e commence par: ".concat(process.env.GEMINI_API_KEY.substring(0, 10), "..."));
            }
        }
        console.log("GEMINI_API_KEY apr\u00E8s dotenv.config: ".concat(process.env.GEMINI_API_KEY ? 'Définie' : 'Non définie ou vide'));
    }
    catch (e) {
        console.warn("dotenv n'est pas installé ou une erreur est survenue lors de son initialisation. Assurez-vous que GEMINI_API_KEY est défini dans l'environnement.", e);
    }
    testGeminiFunctionality().catch(function (err) {
        console.error("Une erreur non gérée est survenue lors de l'exécution des tests:", err);
    });
}
// Pour exécuter ce script:
// 1. Assurez-vous d'avoir ts-node et dotenv installés globalement ou dans vos devDependencies:
//    npm install -g ts-node 
//    npm install --save-dev dotenv
// 2. Depuis la racine de votre projet, exécutez:
//    ts-node src/scripts/testGeminiService.ts
// 3. N'oubliez pas votre GEMINI_API_KEY dans .env.local 
