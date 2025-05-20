import mongoose from 'mongoose';
import CategoryModel from '../src/models/CategoryModel'; // Ajustez le chemin si nécessaire
import { categorySlugToKindMap } from '../src/config/discriminatorMapping'; // ProductKind retiré
import dotenv from 'dotenv';

// Charger les variables d'environnement (ex: MONGO_URI)
dotenv.config({ path: '.env.local' }); // Ajustez le chemin vers votre .env si différent

interface LeanCategory { // Interface pour typer les objets catégorie de .lean()
    slug: string;
    name: string;
    // Ajoutez d'autres champs si nécessaire pour la validation
}

async function validateMap() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error('Erreur: MONGODB_URI n\'est pas défini dans les variables d\'environnement.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURI);
    console.log('Connecté à MongoDB pour la validation...');

    const leafCategories = await CategoryModel.find({ isLeafNode: true }).select('slug name').lean<LeanCategory[]>();
    const mapKeys = Object.keys(categorySlugToKindMap);
    const dbSlugs = leafCategories.map((cat) => cat.slug);

    let issuesFound = false;
    console.log("\nValidation du mapping Slug de Catégorie vers Kind de Discriminateur...");

    // Validation 1: Les slugs des catégories feuilles de la DB sont-ils dans la map ?
    console.log("\n--- Vérification des slugs de la DB vers la Map ---");
    for (const category of leafCategories) {
      if (!categorySlugToKindMap[category.slug]) {
        console.warn(
          `AVERTISSEMENT: Le slug de catégorie feuille "${category.slug}" (pour la catégorie "${category.name}") ` +
          `n'est pas trouvé comme clé dans categorySlugToKindMap.`
        );
        issuesFound = true;
      }
    }
    if (!leafCategories.length) {
        console.log("Aucune catégorie feuille trouvée dans la DB pour validation.");
    }

    // Validation 2: Les clés de la map sont-elles dans les slugs de catégories feuilles de la DB ?
    console.log("\n--- Vérification des clés de la Map vers la DB ---");
    for (const mapKey of mapKeys) {
      if (!dbSlugs.includes(mapKey)) {
        console.warn(
          `AVERTISSEMENT: La clé "${mapKey}" dans categorySlugToKindMap (valeur: "${categorySlugToKindMap[mapKey]}") ` +
          `ne correspond à aucun slug de catégorie feuille active dans la base de données.`
        );
        issuesFound = true;
      }
    }
    if (!mapKeys.length) {
        console.log("Aucune clé trouvée dans categorySlugToKindMap pour validation.");
    }

    if (!issuesFound) {
      console.log("\nValidation terminée : Aucune incohérence directe trouvée entre les slugs des catégories feuilles et categorySlugToKindMap.");
    } else {
      console.error("\nValidation terminée : Des incohérences ont été trouvées. Veuillez vérifier les avertissements ci-dessus.");
    }

  } catch (error) {
    console.error("Erreur lors de l'exécution du script de validation:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB.');
  }
}

validateMap(); 