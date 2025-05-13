import '../loadEnv'; // Importe et exécute loadEnv.ts

import dbConnect from '../db.Connect'; // <--- VÉRIFIEZ ET AJOUTEZ CETTE LIGNE SI MANQUANTE
import BrandModel from '../../models/BrandModel'; // Ajustez le chemin si celui-ci est incorrect

// Les marques sont souvent globales, mais pour la simulation, on les liste ici.
// Dans un vrai scénario, vous pourriez les ajouter au fur et à mesure ou avoir une liste plus exhaustive.
const BRANDS_TO_SEED = [
  { name: 'Apple', slug: 'apple' },
  { name: 'Samsung', slug: 'samsung' },
  { name: 'Google', slug: 'google' },
  { name: 'Xiaomi', slug: 'xiaomi' },
  { name: 'Dell', slug: 'dell' },
  { name: 'HP', slug: 'hp' },
  { name: 'Lenovo', slug: 'lenovo' },
  { name: 'Sony Playstation', slug: 'sony-playstation' }, // Slug plus spécifique
  { name: 'Microsoft Xbox', slug: 'microsoft-xbox' },
  { name: 'Nintendo', slug: 'nintendo' },
  { name: 'Garmin', slug: 'garmin' },
  { name: 'Sony', slug: 'sony' }, // Pour l'audio par exemple, ou TV
  { name: 'Bose', slug: 'bose' },
  { name: 'LG', slug: 'lg' },
  { name: 'Philips', slug: 'philips' },
  { name: 'Canon', slug: 'canon' },
  { name: 'Nikon', slug: 'nikon' },
  { name: 'Bosch', slug: 'bosch' },
  { name: 'Siemens', slug: 'siemens' },
  // Ajoutez d'autres marques globales ici
];

async function seedBrands() {
  try {
    await dbConnect();
    console.log('Connexion à la base de données réussie.');

    // Optionnel: Supprimer les marques existantes pour éviter les doublons lors de re-seed
    // await BrandModel.deleteMany({});
    // console.log('Anciennes marques supprimées.');

    let brandsCreatedCount = 0;
    for (const brandData of BRANDS_TO_SEED) {
      try {
        const existingBrand = await BrandModel.findOne({ slug: brandData.slug });
        if (existingBrand) {
          console.log(`La marque "${brandData.name}" (slug: ${brandData.slug}) existe déjà. Skip.`);
          continue;
        }
        await BrandModel.create(brandData);
        console.log(`Marque "${brandData.name}" créée.`);
        brandsCreatedCount++;
      } catch (error: unknown) {
        const typedError = error as { code?: number; message?: string }; // Basic type assertion
        if (typedError.code === 11000) {
          console.warn(`Conflit de duplicité pour la marque "${brandData.name}". Elle existe probablement déjà.`);
        } else {
          console.error(`Erreur lors de la création de la marque "${brandData.name}":`, typedError.message || error);
        }
      }
    }
    
    console.log(`
--- Seed des marques terminé ---
${brandsCreatedCount} marque(s) potentiellement créée(s).
Total des marques dans BRANDS_TO_SEED: ${BRANDS_TO_SEED.length}.
Consultez les logs ci-dessus pour les détails sur les marques existantes ou les erreurs.
`);

  } catch (error) {
    console.error('Erreur lors du processus de seed des marques:', error);
  } finally {
    // mongoose.connection.close();
    // console.log('Connexion à la base de données fermée.');
    process.exit(0);
  }
}

seedBrands(); 