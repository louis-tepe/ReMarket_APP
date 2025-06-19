import '../loadEnv'; // Importe et exécute loadEnv.ts
import dbConnect from '../mongodb/dbConnect';
import BrandModel from '../mongodb/models/BrandModel';
import CategoryModel from '../mongodb/models/CategoryModel'; // Pour récupérer les IDs des catégories
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
// IMPORTANT: Ces slugs doivent correspondre EXACTEMENT à ceux générés par seedCategories.ts
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
      'headphones-and-earbuds', // Corrigé pour correspondre au slug réel
      'streaming-devices',
      'monitors'
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
      'televisions',
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
      'headphones-and-earbuds', // Corrigé
      'smart-speakers', // Google Nest Audio
      'streaming-devices', // Chromecast
      'routers', // Google Nest Wifi
    ],
  },
  {
    name: 'Xiaomi',
    categorySlugs: [
      'smartphones',
      'tablets',
      'smartwatches',
      'fitness-trackers',
      'headphones-and-earbuds', // Corrigé
      'portable-speakers',
      'televisions',
      'projectors',
    ],
  },
  { name: 'Dell', categorySlugs: ['laptops', 'desktop-computers', 'monitors', 'gaming-desktops', 'gaming-laptops' ] },
  { name: 'HP', categorySlugs: ['laptops', 'desktop-computers', 'monitors', 'printers-and-scanners', 'gaming-laptops' ] },
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
  { name: 'Garmin', categorySlugs: ['smartwatches', 'fitness-trackers'] },
  {
    name: 'Sony',
    description: 'Multinational conglomerate corporation.',
    categorySlugs: [
      'televisions',
      'headphones-and-earbuds', // Corrigé
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
      'smartphones'
    ],
  },
  { name: 'Bose', categorySlugs: ['headphones-and-earbuds', 'soundbars', 'portable-speakers', 'smart-speakers', 'home-theater-systems'] },
  { name: 'LG', categorySlugs: ['televisions', 'monitors', 'soundbars', 'home-theater-systems', 'laptops', 'smartphones', 'refrigerators', 'dishwashers' ] },
  { name: 'Philips', categorySlugs: ['televisions', 'monitors', 'headphones-and-earbuds', 'soundbars', 'lighting', 'small-kitchen-appliances'] },
  { name: 'Canon', categorySlugs: ['dslr-cameras', 'mirrorless-cameras', 'camcorders', 'printers-and-scanners', 'dslr-lenses', 'mirrorless-lenses', 'point-and-shoot-cameras'] },
  { name: 'Nikon', categorySlugs: ['dslr-cameras', 'mirrorless-cameras', 'dslr-lenses', 'mirrorless-lenses', 'point-and-shoot-cameras'] },
  { name: 'Asus', categorySlugs: ['laptops', 'desktop-computers', 'monitors', 'motherboards', 'gpus-graphics-cards', 'gaming-laptops', 'gaming-desktops', 'gaming-monitors', 'routers', 'smartphones' ] },
  { name: 'Acer', categorySlugs: ['laptops', 'desktop-computers', 'monitors', 'projectors', 'gaming-laptops', 'gaming-desktops'] },
  { name: 'Microsoft', categorySlugs: ['laptops', 'tablets', 'desktop-computers', 'gaming-keyboards', 'gaming-mice', 'webcams'] },
  { name: 'Intel', categorySlugs: ['cpus-processors', 'storage-ssd-hdd'] }, // 'networking-devices' is not leaf
  { name: 'AMD', categorySlugs: ['cpus-processors', 'gpus-graphics-cards'] },
  { name: 'Nvidia', categorySlugs: ['gpus-graphics-cards', 'streaming-devices'] },
  { name: 'Logitech', categorySlugs: ['keyboards', 'mice', 'webcams', 'gaming-keyboards', 'gaming-mice', 'gaming-headsets', 'portable-speakers', 'usb-hubs-and-adapters'] },
  { name: 'Corsair', categorySlugs: ['ram-memory', 'storage-ssd-hdd', 'power-supplies-psu', 'pc-cases', 'gaming-keyboards', 'gaming-mice', 'gaming-headsets'] },
  { name: 'Razer', categorySlugs: ['laptops', 'gaming-laptops', 'gaming-keyboards', 'gaming-mice', 'gaming-headsets', 'monitors', 'gaming-monitors'] },
  { name: 'JBL', categorySlugs: ['headphones-and-earbuds', 'portable-speakers', 'soundbars', 'smart-speakers'] },
  { name: 'Sennheiser', categorySlugs: ['headphones-and-earbuds', 'microphones', 'gaming-headsets'] },
  { name: 'GoPro', categorySlugs: ['action-cameras', 'camera-tripods-mounts', 'camera-batteries-and-chargers'] },
  { name: 'DJI', categorySlugs: ['drones-with-cameras', 'action-cameras'] },
  { name: 'Fitbit', categorySlugs: ['smartwatches', 'fitness-trackers'] },
  { name: 'OnePlus', categorySlugs: ['smartphones', 'headphones-and-earbuds', 'smartwatches'] },
  {
    name: 'Nike',
    categorySlugs: [
      'mens-shoes', 'womens-shoes', 'kids-shoes',
      'mens-clothing', 'womens-clothing', 'kids-clothing',
      'mens-accessories', 'womens-accessories'
    ],
  },
  {
    name: "Levi's",
    categorySlugs: [
      'mens-clothing',
      'womens-clothing',
      'mens-accessories', 'womens-accessories'
    ],
  },
  { name: 'Zara', categorySlugs: ['mens-clothing', 'womens-clothing', 'kids-clothing', 'mens-shoes', 'womens-shoes', 'mens-accessories', 'womens-accessories'] },
  { name: 'Adidas', categorySlugs: ['mens-shoes', 'womens-shoes', 'kids-shoes', 'mens-clothing', 'womens-clothing', 'kids-clothing', 'mens-accessories', 'womens-accessories'] },
  {
    name: 'Dyson',
    categorySlugs: ['cleaning-supplies-and-vacuums'],
  },
  { name: 'Bosch', categorySlugs: [
      'dishwashers',
      'ovens-and-stoves',
    ]
  },
  { name: 'KitchenAid', categorySlugs: [
      'blenders',
      'coffee-makers',
      'toasters-and-ovens'
    ]
  },
  { name: 'DeWalt', categorySlugs: [] },
  { name: 'Fairphone', categorySlugs: ['smartphones'] },
  { name: 'Nothing', categorySlugs: ['smartphones', 'headphones-and-earbuds'] },
  { name: 'Puma', categorySlugs: ['mens-shoes', 'womens-shoes', 'kids-shoes', 'mens-clothing', 'womens-clothing', 'kids-clothing', 'mens-accessories', 'womens-accessories'] },
  { name: 'Reebok', categorySlugs: ['mens-shoes', 'womens-shoes', 'kids-shoes', 'mens-clothing', 'womens-clothing', 'kids-clothing', 'mens-accessories', 'womens-accessories'] },
  { name: 'Under Armour', categorySlugs: ['mens-shoes', 'womens-shoes', 'kids-shoes', 'mens-clothing', 'womens-clothing', 'kids-clothing', 'mens-accessories', 'womens-accessories'] },
  { name: 'Gap', categorySlugs: ['mens-clothing', 'womens-clothing', 'kids-clothing'] },
  { name: 'H&M', categorySlugs: ['mens-clothing', 'womens-clothing', 'kids-clothing', 'mens-shoes', 'womens-shoes', 'mens-accessories', 'womens-accessories'] },
  { name: 'Uniqlo', categorySlugs: ['mens-clothing', 'womens-clothing', 'kids-clothing'] },
  { name: 'The North Face', categorySlugs: ['mens-clothing', 'womens-clothing', 'kids-clothing', 'bags-and-luggage'] },
  { name: 'Patagonia', categorySlugs: ['mens-clothing', 'womens-clothing', 'kids-clothing', 'bags-and-luggage'] },
  { name: 'Lululemon Athletica', categorySlugs: ['womens-clothing', 'mens-clothing', 'womens-accessories', 'mens-accessories'] },
];

async function seedBrands() {
  try {
    await dbConnect();
    console.log('INFO: Connexion à la base de données réussie.');

    // Vider la collection des marques avant de seeder
    console.log('INFO: Suppression des marques existantes...');
    await BrandModel.deleteMany({});
    console.log('INFO: Anciennes marques supprimées.');

    const allCategories = await CategoryModel.find().select('_id name slug depth isLeafNode').lean();
    const categoryMap = new Map<string, { id: Types.ObjectId; name: string; slug: string; depth: number, isLeafNode: boolean }>();
    allCategories.forEach(cat => {
      categoryMap.set(cat.slug, { id: new Types.ObjectId(String(cat._id)), name: cat.name, slug: cat.slug, depth: cat.depth, isLeafNode: cat.isLeafNode });
    });
    console.log(`INFO: ${allCategories.length} catégories chargées et mappées.`);

    let brandsCreatedCount = 0;
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
          // This logic is for updating, but we are deleting first, so it won't be used.
          // Kept for reference if you change the delete behavior.
        } else {
          await BrandModel.create({
            name: brandData.name,
            slug: brandSlug,
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
          console.warn(`WARN: Conflit de clé dupliquée pour la marque "${brandData.name}" (valeur dupliquée: ${JSON.stringify(typedError.keyValue)}).`);
          brandsSkippedCount++;
        } else {
          console.error(`ERROR: Erreur lors du traitement de la marque "${brandData.name}":`, typedError.message || error);
        }
      }
    }

    console.log(`
--- Seed des marques terminé ---
${brandsCreatedCount} marque(s) créée(s).
${brandsSkippedCount} marque(s) ignorée(s) (conflit).
Total des marques traitées: ${BRANDS_TO_SEED_WITH_CATEGORIES.length}.
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