import '../loadEnv'; // Importe et exécute loadEnv.ts

import dbConnect from '../db.Connect'; // Ajustez le chemin si nécessaire
import CategoryModel from '../../models/CategoryModel'; // Ajustez le chemin

const CATEGORIES_TO_SEED = [
  { name: 'Téléphones Mobiles', slug: 'telephones-mobiles' },
  { name: 'Ordinateurs Portables', slug: 'ordinateurs-portables' },
  { name: 'Tablettes', slug: 'tablettes' },
  { name: 'Consoles de Jeux', slug: 'consoles-de-jeux' },
  { name: 'Objets Connectés (Montres, etc.)', slug: 'objets-connectes' },
  { name: 'Audio (Casques, Écouteurs)', slug: 'audio' },
  { name: 'Appareils Photo', slug: 'appareils-photo' },
  { name: 'Télévisions', slug: 'televisions' },
  { name: 'Petit Électroménager', slug: 'petit-electromenager' },
  { name: 'Gros Électroménager', slug: 'gros-electromenager' },
];

async function seedCategories() {
  try {
    await dbConnect();
    console.log('Connexion à la base de données réussie.');

    // Optionnel: Supprimer les catégories existantes pour éviter les doublons lors de re-seed
    // await CategoryModel.deleteMany({});
    // console.log('Anciennes catégories supprimées.');

    let categoriesCreatedCount = 0;
    for (const catData of CATEGORIES_TO_SEED) {
      try {
        const existingCategory = await CategoryModel.findOne({ slug: catData.slug });
        if (existingCategory) {
          console.log(`La catégorie "${catData.name}" (slug: ${catData.slug}) existe déjà. Skip.`);
          continue;
        }
        await CategoryModel.create(catData);
        console.log(`Catégorie "${catData.name}" créée.`);
        categoriesCreatedCount++;
      } catch (error: unknown) {
        // Typage pour l'erreur MongoDB
        interface MongoError extends Error {
            code?: number;
        }
        const typedError = error as MongoError;
        if (typedError.code === 11000) { // Erreur de duplicité (unique index)
          console.warn(`Conflit de duplicité pour la catégorie "${catData.name}". Elle existe probablement déjà.`);
        } else {
          console.error(`Erreur lors de la création de la catégorie "${catData.name}":`, typedError);
        }
      }
    }

    console.log(`
--- Seed des catégories terminé ---
${categoriesCreatedCount} catégorie(s) potentiellement créée(s).
Total des catégories dans CATEGORIES_TO_SEED: ${CATEGORIES_TO_SEED.length}.
Consultez les logs ci-dessus pour les détails sur les catégories existantes ou les erreurs.
`);

  } catch (error) {
    console.error('Erreur lors du processus de seed des catégories:', error);
  } finally {
    // mongoose.connection.close(); // Décommentez si vous voulez fermer la connexion après le script
    // console.log('Connexion à la base de données fermée.');
    process.exit(0); // Important pour terminer le script en mode CLI
  }
}

seedCategories(); 