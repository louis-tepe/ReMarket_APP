import '../loadEnv'; // Importe et exécute loadEnv.ts
import dbConnect from '../db.Connect';
import BrandModel from '../../models/BrandModel';
import CategoryModel from '../../models/CategoryModel'; // Pour récupérer les IDs des catégories
import { Types } from 'mongoose';
import slugify from 'slugify'; // Assurez-vous que slugify est installé ou utilisez une fonction similaire

// Interface pour les données de seed des marques
interface SeedBrandData {
  name: string;
  description?: string;
  logoUrl?: string;
  categorySlugs?: string[]; // Slugs des catégories de PLUS BAS NIVEAU associées
}

// Fonction pour générer un slug simple
const generateSlug = (name: string) => {
  return slugify(name, { lower: true, strict: true, replacement: '-' });
};

// Liste des marques à seeder avec leurs catégories associées (slugs)
// IMPORTANT: Les categorySlugs doivent correspondre aux slugs des catégories de plus bas niveau
// définies dans votre seedCategories.ts et transformées par le script de seed.
const BRANDS_TO_SEED_WITH_CATEGORIES: SeedBrandData[] = [
  // Electronics & Computers
  {
    name: 'Apple',
    description: 'Designer and manufacturer of consumer electronics, software, and online services.',
    logoUrl: 'https://example.com/logos/apple.png',
    categorySlugs: [
      'smartphones',
      'tablets',
      'laptops',
      'desktop-computers',
      'smartwatches',
      'headphones--earbuds',
      'streaming-devices', // Apple TV
      // 'monitors' // Example: Apple Studio Display
    ],
  },
  {
    name: 'Samsung',
    categorySlugs: [
      'smartphones',
      'tablets',
      'laptops',
      'smartwatches',
      'fitness-trackers',
      'televisions-tvs',
      'monitors',
      'soundbars',
      'home-theater-systems',
      'storage-ssd-hdd',
      'refrigerators',
      'dishwashers',
      'microwaves'
    ],
  },
  {
    name: 'Google',
    categorySlugs: [
      'smartphones', // Pixel
      'smartwatches', // Pixel Watch
      'headphones--earbuds',
      'smart-speakers', // Google Nest Audio
      'streaming-devices', // Chromecast
      'routers', // Google Nest Wifi
      // 'webcams', // Google Meet Hardware (if applicable as a product category)
    ],
  },
  {
    name: 'Xiaomi',
    categorySlugs: [
      'smartphones',
      'tablets',
      'smartwatches',
      'fitness-trackers',
      'headphones--earbuds',
      'portable-speakers',
      'televisions-tvs',
      'projectors',
      // 'electric-scooters', // Catégorie non existante
    ],
  },
  { name: 'Dell', categorySlugs: ['laptops', 'desktop-computers', 'monitors', 'gaming-desktops', 'gaming-laptops' ] },
  { name: 'HP', categorySlugs: ['laptops', 'desktop-computers', 'monitors', 'printers--scanners', 'gaming-laptops' ] },
  { name: 'Lenovo', categorySlugs: ['laptops', 'desktop-computers', 'monitors', 'tablets', 'gaming-laptops' ] },
  {
    name: 'Sony Playstation',
    description: 'Gaming console brand by Sony Interactive Entertainment.',
    categorySlugs: ['game-consoles', 'video-games', 'gaming-headsets', 'gaming-accessories-general'],
  },
  {
    name: 'Microsoft Xbox',
    description: 'Gaming console brand by Microsoft.',
    categorySlugs: ['game-consoles', 'video-games', 'gaming-headsets', 'gaming-accessories-general'],
  },
  { name: 'Nintendo', categorySlugs: ['game-consoles', 'video-games', 'gaming-accessories-general'] },
  { name: 'Garmin', categorySlugs: ['smartwatches', 'fitness-trackers', /* 'gps-navigation-devices' */] },
  {
    name: 'Sony',
    description: 'Multinational conglomerate corporation.',
    categorySlugs: [
      'televisions-tvs',
      'headphones--earbuds',
      'soundbars',
      'home-theater-systems',
      'portable-speakers',
      'bookshelf-speakers',
      'dslr-cameras',
      'mirrorless-cameras',
      'camcorders',
      'dslr-lenses',
      'mirrorless-lenses',
      'point-and-shoot-cameras',
      'action-cameras',
      'smartphones' // Sony Xperia
    ],
  },
  { name: 'Bose', categorySlugs: ['headphones--earbuds', 'soundbars', 'portable-speakers', 'smart-speakers', 'home-theater-systems'] },
  { name: 'LG', categorySlugs: ['televisions-tvs', 'monitors', 'soundbars', 'home-theater-systems', 'laptops', 'smartphones', 'refrigerators', 'dishwashers' ] },
  { name: 'Philips', categorySlugs: ['televisions-tvs', 'monitors', 'headphones--earbuds', 'soundbars', 'lighting', 'small-kitchen-appliances', /* 'personal-care' */] },
  { name: 'Canon', categorySlugs: ['dslr-cameras', 'mirrorless-cameras', 'camcorders', 'printers--scanners', 'dslr-lenses', 'mirrorless-lenses', 'point-and-shoot-cameras'] },
  { name: 'Nikon', categorySlugs: ['dslr-cameras', 'mirrorless-cameras', 'dslr-lenses', 'mirrorless-lenses', 'point-and-shoot-cameras'] },
  { name: 'Asus', categorySlugs: ['laptops', 'desktop-computers', 'monitors', 'motherboards', 'gpus-graphics-cards', 'gaming-laptops', 'gaming-desktops', 'gaming-monitors', 'routers', 'smartphones' ] }, // ROG (Republic of Gamers) is a sub-brand
  { name: 'Acer', categorySlugs: ['laptops', 'desktop-computers', 'monitors', 'projectors', 'gaming-laptops', 'gaming-desktops'] },
  { name: 'Microsoft', categorySlugs: ['laptops', 'tablets', 'desktop-computers', 'gaming-keyboards', 'gaming-mice', 'webcams', /* 'operating-systems' (if you sell software as category) */] }, // For Surface, PC accessories
  { name: 'Intel', categorySlugs: ['cpus-processors', 'storage-ssd-hdd', 'networking-devices' ] },
  { name: 'AMD', categorySlugs: ['cpus-processors', 'gpus-graphics-cards'] },
  { name: 'Nvidia', categorySlugs: ['gpus-graphics-cards', 'streaming-devices' /* (Shield) */] },
  { name: 'Logitech', categorySlugs: ['keyboards', 'mice', 'webcams', 'gaming-keyboards', 'gaming-mice', 'gaming-headsets', 'portable-speakers', 'usb-hubs--adapters'] },
  { name: 'Corsair', categorySlugs: ['ram-memory', 'storage-ssd-hdd', 'power-supplies-psu', 'pc-cases', 'gaming-keyboards', 'gaming-mice', 'gaming-headsets'] },
  { name: 'Razer', categorySlugs: ['laptops', 'gaming-laptops', 'gaming-keyboards', 'gaming-mice', 'gaming-headsets', 'monitors', 'gaming-monitors'] },
  { name: 'JBL', categorySlugs: ['headphones--earbuds', 'portable-speakers', 'soundbars', 'smart-speakers'] },
  { name: 'Sennheiser', categorySlugs: ['headphones--earbuds', 'microphones', 'gaming-headsets'] },
  { name: 'GoPro', categorySlugs: ['action-cameras', 'tripods--mounts', 'camera-batteries--chargers'] },
  { name: 'DJI', categorySlugs: ['drones-with-cameras', 'action-cameras', /* 'camera-gimbals' */] },
  { name: 'Fitbit', categorySlugs: ['smartwatches', 'fitness-trackers'] }, // Now part of Google
  { name: 'OnePlus', categorySlugs: ['smartphones', 'headphones--earbuds', 'smartwatches'] }, // Corrigé // Also makes TVs in some regions

  // Fashion & Apparel (Examples)
  {
    name: 'Nike',
    categorySlugs: [
      'mens-shoes', 'womens-shoes', 'kids-shoes',
      'mens-clothing', 'womens-clothing', 'kids-clothing',
      'mens-accessories', 'womens-accessories' // sport-bags et sports-accessories n'existent pas
    ],
  },
  {
    name: "Levi's",
    categorySlugs: [
      'mens-clothing', // Specifically Jeans, Jackets
      'womens-clothing', // Specifically Jeans, Jackets
      'mens-accessories', 'womens-accessories' // fashion-accessories -> belts
    ],
  },
  { name: 'Zara', categorySlugs: ['mens-clothing', 'womens-clothing', 'kids-clothing', 'mens-shoes', 'womens-shoes', 'mens-accessories', 'womens-accessories'] },
  { name: 'Adidas', categorySlugs: ['mens-shoes', 'womens-shoes', 'kids-shoes', 'mens-clothing', 'womens-clothing', 'kids-clothing', 'mens-accessories', 'womens-accessories'] }, // Similar to Nike

  // Home Appliances & Tools (Examples)
  {
    name: 'Dyson',
    categorySlugs: [
      'cleaning-supplies--vacuums',
      // 'hair-dryers', 'air-purifiers' (if these categories exist)
    ],
  },
  { name: 'Bosch', categorySlugs: [
      'dishwashers',
      'ovens--stoves',
      // 'washing-machines', 
      // 'power-tools-drills', 
      // 'power-tools-saws'
    ] 
  },
  { name: 'KitchenAid', categorySlugs: [
      'small-kitchen-appliances',
      'blenders',
      'coffee-makers',
      'toasters--ovens'
    ] 
  },
  { name: 'DeWalt', categorySlugs: [
      // 'power-tools-drills', 
      // 'power-tools-saws', 
      // 'hand-tools'
    ] 
  },

  { name: 'Fairphone', categorySlugs: ['smartphones'] },
  { name: 'Nothing', categorySlugs: ['smartphones', 'headphones--earbuds'] },
  { name: 'Puma', categorySlugs: ['mens-shoes', 'womens-shoes', 'kids-shoes', 'mens-clothing', 'womens-clothing', 'kids-clothing', 'mens-accessories', 'womens-accessories'] },
  { name: 'Reebok', categorySlugs: ['mens-shoes', 'womens-shoes', 'kids-shoes', 'mens-clothing', 'womens-clothing', 'kids-clothing', 'mens-accessories', 'womens-accessories'] },
  { name: 'Under Armour', categorySlugs: ['mens-shoes', 'womens-shoes', 'kids-shoes', 'mens-clothing', 'womens-clothing', 'kids-clothing', 'mens-accessories', 'womens-accessories'] },
  { name: 'Gap', categorySlugs: ['mens-clothing', 'womens-clothing', 'kids-clothing'] },
  { name: 'H&M', categorySlugs: ['mens-clothing', 'womens-clothing', 'kids-clothing', 'mens-shoes', 'womens-shoes', 'mens-accessories', 'womens-accessories'] },
  { name: 'Uniqlo', categorySlugs: ['mens-clothing', 'womens-clothing', 'kids-clothing'] },
  { name: 'The North Face', categorySlugs: ['mens-clothing', 'womens-clothing', 'kids-clothing', 'bags--luggage'] },
  { name: 'Patagonia', categorySlugs: ['mens-clothing', 'womens-clothing', 'kids-clothing', 'bags--luggage'] },
  { name: 'Lululemon Athletica', categorySlugs: ['womens-clothing', 'mens-clothing', 'womens-accessories', 'mens-accessories'] },
];

async function seedBrands() {
  try {
    await dbConnect();
    console.log('INFO: Connexion à la base de données réussie.');

    const allCategories = await CategoryModel.find().select('_id name slug depth isLeafNode').lean();
    const categoryMap = new Map<string, { id: Types.ObjectId; name: string; slug: string; depth: number, isLeafNode: boolean }>();
    allCategories.forEach(cat => {
      categoryMap.set(cat.slug, { id: new Types.ObjectId(String(cat._id)), name: cat.name, slug: cat.slug, depth: cat.depth, isLeafNode: cat.isLeafNode });
    });
    console.log(`INFO: ${allCategories.length} catégories chargées et mappées.`);

    let brandsCreatedCount = 0;
    let brandsUpdatedCount = 0;
    let brandsSkippedCount = 0;

    for (const brandData of BRANDS_TO_SEED_WITH_CATEGORIES) {
      try {
        const categoryIds: Types.ObjectId[] = [];
        if (brandData.categorySlugs && brandData.categorySlugs.length > 0) {
          brandData.categorySlugs.forEach(slug => {
            const catInfo = categoryMap.get(slug);
            if (catInfo) {
              if (catInfo.isLeafNode) { // On ne lie les marques qu'aux catégories feuilles
                categoryIds.push(catInfo.id);
              } else {
                console.warn(`WARN: La catégorie "${catInfo.name}" (slug: ${slug}) pour la marque "${brandData.name}" n'est pas une catégorie feuille et sera ignorée.`);
              }
            } else {
              console.warn(`WARN: Slug de catégorie "${slug}" non trouvé pour la marque "${brandData.name}". Il sera ignoré.`);
            }
          });
        }

        const brandSlug = generateSlug(brandData.name);
        const existingBrand = await BrandModel.findOne({ slug: brandSlug });

        if (existingBrand) {
          let needsUpdate = false;
          if (brandData.description && existingBrand.description !== brandData.description) {
            existingBrand.description = brandData.description;
            needsUpdate = true;
          }
          if (brandData.logoUrl && existingBrand.logoUrl !== brandData.logoUrl) {
            existingBrand.logoUrl = brandData.logoUrl;
            needsUpdate = true;
          }
          
          // Mettre à jour les catégories si elles sont différentes
          const existingCategoryIds = existingBrand.categories.map((id: Types.ObjectId) => id.toString());
          const newCategoryIds = categoryIds.map((id: Types.ObjectId) => id.toString());
          const categoriesChanged = !(existingCategoryIds.length === newCategoryIds.length && existingCategoryIds.every((id: string) => newCategoryIds.includes(id)));

          if (categoriesChanged) {
            existingBrand.categories = categoryIds;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await existingBrand.save();
            console.log(`INFO: Marque "${existingBrand.name}" (ID: ${existingBrand._id}, slug: ${existingBrand.slug}) mise à jour.`);
            brandsUpdatedCount++;
          } else {
            console.log(`INFO: Marque "${brandData.name}" (slug: ${brandSlug}) existe déjà. Aucune nouvelle information à mettre à jour. Skip.`);
            brandsSkippedCount++;
          }
        } else {
          await BrandModel.create({
            name: brandData.name,
            slug: brandSlug, // Ajout du slug généré
            description: brandData.description,
            logoUrl: brandData.logoUrl,
            categories: categoryIds,
          });
          console.log(`SUCCESS: Marque "${brandData.name}" (slug: ${brandSlug}) créée avec ${categoryIds.length} catégories (feuilles).`);
          brandsCreatedCount++;
        }
      } catch (error: unknown) {
        const typedError = error as { code?: number; message?: string, keyValue?: Record<string, string> };
        if (typedError.code === 11000) {
          console.warn(`WARN: Conflit de clé dupliquée pour la marque "${brandData.name}" (valeur dupliquée: ${JSON.stringify(typedError.keyValue)}). Elle existe probablement déjà.`);
          brandsSkippedCount++; // Compter comme skipped en cas de conflit de duplicata aussi
        } else {
          console.error(`ERROR: Erreur lors du traitement de la marque "${brandData.name}":`, typedError.message || error);
        }
      }
    }

    console.log(`
--- Seed des marques terminé ---
${brandsCreatedCount} marque(s) créée(s).
${brandsUpdatedCount} marque(s) mise(s) à jour.
${brandsSkippedCount} marque(s) existante(s) et ignorée(s).
Total des marques dans BRANDS_TO_SEED_WITH_CATEGORIES: ${BRANDS_TO_SEED_WITH_CATEGORIES.length}.
Consultez les logs ci-dessus pour les détails.
`);

  } catch (error) {
    const castedError = error as Error;
    console.error('FATAL: Erreur majeure durant le processus de seed des marques:', castedError.message, castedError.stack);
  } finally {
    process.exit(0);
  }
}

seedBrands(); 