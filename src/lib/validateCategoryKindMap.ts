import mongoose from 'mongoose';
import CategoryModel from './mongodb/models/CategoryModel'; // Ajustez le chemin si nécessaire
import { categorySlugToKindMap } from '@/config/discriminatorMapping'; // ProductKind retiré
import dotenv from 'dotenv';

// Charger les variables d'environnement (ex: MONGO_URI)
dotenv.config({ path: '.env.local' });

interface LeanCategory { // Interface pour typer les objets catégorie de .lean()
    slug: string;
    name: string;
    // Ajoutez d'autres champs si nécessaire pour la validation
}

async function connectDB(mongoURI: string) {
  await mongoose.connect(mongoURI);
  console.log('Connecté à MongoDB pour la validation...');
}

async function disconnectDB() {
  await mongoose.disconnect();
  console.log('Déconnecté de MongoDB.');
}

async function getLeafCategoriesFromDB(): Promise<LeanCategory[]> {
  return CategoryModel.find({ isLeafNode: true }).select('slug name').lean<LeanCategory[]>();
}

function validateSlugsFromDBToMap(leafCategories: LeanCategory[], slugToKindMap: Record<string, string>): boolean {
  let issuesFound = false;
  console.log("\n--- Vérification des slugs de la DB vers la Map ---");
  if (!leafCategories.length) {
    console.log("Aucune catégorie feuille trouvée dans la DB pour validation.");
    return issuesFound; // Retourne false car aucune issue si pas de catégorie
  }
  for (const category of leafCategories) {
    if (!slugToKindMap[category.slug]) {
      console.warn(
        `AVERTISSEMENT: Le slug de catégorie feuille "${category.slug}" (catégorie "${category.name}") ` +
        `n'est pas dans categorySlugToKindMap.`
      );
      issuesFound = true;
    }
  }
  return issuesFound;
}

function validateKeysFromMapToDB(mapKeys: string[], dbSlugs: string[], slugToKindMap: Record<string, string>): boolean {
  let issuesFound = false;
  console.log("\n--- Vérification des clés de la Map vers la DB ---");
  if (!mapKeys.length) {
    console.log("Aucune clé trouvée dans categorySlugToKindMap pour validation.");
    return issuesFound; // Retourne false car aucune issue si pas de clés
  }
  for (const mapKey of mapKeys) {
    if (!dbSlugs.includes(mapKey)) {
      console.warn(
        `AVERTISSEMENT: La clé "${mapKey}" dans categorySlugToKindMap (valeur: "${slugToKindMap[mapKey]}") ` +
        `ne correspond à aucun slug de catégorie feuille en DB.`
      );
      issuesFound = true;
    }
  }
  return issuesFound;
}

async function validateMap() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error('Erreur: MONGODB_URI non défini.');
    process.exit(1);
  }

  let overallIssuesFound = false;

  try {
    await connectDB(mongoURI);

    const leafCategories = await getLeafCategoriesFromDB();
    const mapKeys = Object.keys(categorySlugToKindMap);
    const dbSlugs = leafCategories.map((cat) => cat.slug);

    console.log("\nValidation du mapping Slug de Catégorie vers Kind de Discriminateur...");

    const issuesInDBToMap = validateSlugsFromDBToMap(leafCategories, categorySlugToKindMap);
    const issuesInMapToDB = validateKeysFromMapToDB(mapKeys, dbSlugs, categorySlugToKindMap);

    overallIssuesFound = issuesInDBToMap || issuesInMapToDB;

    if (!overallIssuesFound) {
      console.log("\nValidation terminée : Aucune incohérence directe trouvée.");
    } else {
      console.error("\nValidation terminée : Des incohérences ont été trouvées.");
    }

  } catch (error) {
    console.error("Erreur lors de la validation:", error);
    overallIssuesFound = true; // Marquer comme ayant des problèmes en cas d'erreur d'exécution
    // process.exit(1) est déjà dans le bloc finally, mais on s'assure que le statut est correct
  } finally {
    await disconnectDB();
    if (overallIssuesFound) {
        // Quitter avec un code d'erreur si des problèmes ont été détectés ou si une erreur s'est produite
        process.exit(1);
    }
  }
}

validateMap(); 