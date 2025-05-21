import '../loadEnv'; // Importe et exécute loadEnv.ts
import dbConnect from '../db.Connect';
import CategoryModel, { ICategory } from '../../models/CategoryModel';
import { Types } from 'mongoose';

// Interface pour définir la structure d'une catégorie à créer, y compris ses enfants potentiels
interface SeedCategoryDefinition {
  name: string;
  slug: string; // Les slugs doivent être uniques globalement
  description?: string;
  children?: SeedCategoryDefinition[];
  // formFieldDefinitions?: any[]; // Décommentez et typez si vous ajoutez des formFieldDefinitions spécifiques
  imageAnalysisPrompt?: string;
}

// Compteurs pour le résumé du seeding
let categoriesCreatedCount = 0;
let categoriesSkippedCount = 0;

/**
 * Crée une catégorie et ses enfants de manière récursive.
 * @param categoryData Les données de la catégorie à créer.
 * @param parentId L'ID de la catégorie parente (null si c'est une catégorie racine).
 * @param currentDepth La profondeur actuelle de la catégorie dans l'arbre.
 * @returns L'ID de la catégorie créée ou trouvée, ou null en cas d'erreur.
 */
async function createCategoryRecursive(
  categoryData: SeedCategoryDefinition,
  parentId: Types.ObjectId | null,
  currentDepth: number
): Promise<Types.ObjectId | null> {
  let categoryIdToReturn: Types.ObjectId | null = null;

  try {
    const existingCategory = await CategoryModel.findOne({ slug: categoryData.slug });

    if (existingCategory) {
      console.log(`INFO: La catégorie "${existingCategory.name}" (slug: ${categoryData.slug}, depth: ${existingCategory.depth}) existe déjà. ID: ${existingCategory._id}.`);
      categoriesSkippedCount++;
      categoryIdToReturn = existingCategory._id;

      // Vérifier si cette catégorie existante, anciennement feuille, a maintenant des enfants dans le seed
      const hasChildrenInSeedForExisting = categoryData.children && categoryData.children.length > 0;
      if (hasChildrenInSeedForExisting && existingCategory.isLeafNode) {
        existingCategory.isLeafNode = false;
        await existingCategory.save();
        console.log(`INFO: Catégorie existante "${existingCategory.name}" (ID: ${existingCategory._id}) mise à jour: isLeafNode à false (car des enfants sont définis dans le seed).`);
      }
    } else {
      // La catégorie n'existe pas, on la crée
      const isActuallyLeaf = !(categoryData.children && categoryData.children.length > 0);
      const newCategoryObject: Partial<ICategory> = {
        name: categoryData.name,
        slug: categoryData.slug,
        depth: currentDepth,
        description: categoryData.description || '',
        isLeafNode: isActuallyLeaf, // Défini en fonction des enfants dans les données de seed
        // formFieldDefinitions: categoryData.formFieldDefinitions, // Si utilisé
        imageAnalysisPrompt: categoryData.imageAnalysisPrompt,
      };

      if (parentId) {
        newCategoryObject.parent = parentId;
      }

      const createdCategory = await CategoryModel.create(newCategoryObject);
      console.log(`SUCCESS: Catégorie "${createdCategory.name}" (slug: ${createdCategory.slug}, depth: ${createdCategory.depth}, isLeaf: ${createdCategory.isLeafNode}) créée. ID: ${createdCategory._id}${parentId ? ` (Parent ID: ${parentId})` : ''}.`);
      categoriesCreatedCount++;
      categoryIdToReturn = createdCategory._id;

      // Si une nouvelle catégorie est créée et qu'elle a un parent,
      // ce parent n'est plus une feuille.
      if (parentId) {
        const parentCategoryToUpdate = await CategoryModel.findById(parentId);
        if (parentCategoryToUpdate && parentCategoryToUpdate.isLeafNode) {
          parentCategoryToUpdate.isLeafNode = false;
          await parentCategoryToUpdate.save();
          console.log(`INFO: Catégorie parente "${parentCategoryToUpdate.name}" (ID: ${parentCategoryToUpdate._id}) mise à jour: isLeafNode à false.`);
        }
      }
    }

    // Traiter les enfants pour la catégorie actuelle (qu'elle ait été trouvée ou nouvellement créée)
    if (categoryData.children && categoryData.children.length > 0) {
      if (!categoryIdToReturn) {
        console.error(`ERROR: Impossible de traiter les enfants pour "${categoryData.name}" car son propre ID n'a pas été déterminé.`);
        return null; // Arrêter le traitement pour cette branche
      }
      // La catégorie actuelle (identifiée par categoryIdToReturn) est le parent de ces enfants.
      // Son propre statut isLeafNode devrait avoir été défini à false (soit à la création, soit dans le bloc de mise à jour pour les existantes).
      for (const child of categoryData.children) {
        await createCategoryRecursive(child, categoryIdToReturn, currentDepth + 1);
      }
    }
    return categoryIdToReturn;

  } catch (error: unknown) {
    const mongoError = error as { code?: number; message?: string; keyValue?: Record<string, string> };
    if (mongoError.code === 11000 && categoryData.name) {
      console.warn(`WARN: Conflit de clé dupliquée pour la catégorie "${categoryData.name}" (slug: ${categoryData.slug}). Valeur dupliquée: ${JSON.stringify(mongoError.keyValue)}. Elle existe probablement déjà.`);
      categoriesSkippedCount++;
      // Essayer de retrouver la catégorie pour traiter ses enfants si une erreur de duplicata se produit lors de la création
      const conflictingCategory = await CategoryModel.findOne({ slug: categoryData.slug });
      if (conflictingCategory) {
        categoryIdToReturn = conflictingCategory._id;
        // Si on la trouve suite à un conflit, son isLeafNode pourrait avoir besoin d'une mise à jour basée sur les enfants du seed
        const hasChildrenInSeed = categoryData.children && categoryData.children.length > 0;
         if (conflictingCategory.isLeafNode === hasChildrenInSeed) { // si isLeafNode est true et a des enfants, ou false et pas d'enfants
            conflictingCategory.isLeafNode = !hasChildrenInSeed;
            await conflictingCategory.save();
            console.log(`INFO: Catégorie (conflit) "${conflictingCategory.name}" (ID: ${conflictingCategory._id}) mise à jour: isLeafNode à ${conflictingCategory.isLeafNode}.`);
        }

        // Et son parent (s'il y en a un) pourrait avoir besoin d'une mise à jour
        // Cela suppose que `parentId` est le parent attendu selon la structure du seed.
        if (parentId) { 
            const parentCategoryToUpdate = await CategoryModel.findById(parentId);
            if (parentCategoryToUpdate && parentCategoryToUpdate.isLeafNode) {
                parentCategoryToUpdate.isLeafNode = false;
                await parentCategoryToUpdate.save();
                console.log(`INFO: Catégorie parente (conflit pour l'enfant "${conflictingCategory.name}") "${parentCategoryToUpdate.name}" (ID: ${parentCategoryToUpdate._id}) mise à jour: isLeafNode à false.`);
            }
        }

        // Puis traiter les enfants
        if (categoryData.children && categoryData.children.length > 0) {
            console.log(`INFO: Traitement des enfants pour la catégorie existante (conflit) "${conflictingCategory.name}".`);
            for (const child of categoryData.children) {
                await createCategoryRecursive(child, conflictingCategory._id, conflictingCategory.depth + 1);
            }
        }
        return conflictingCategory._id; // Retourner l'ID de la catégorie conflictuelle
      }
    } else if (categoryData.name) { 
      console.error(`ERROR: Erreur lors de la création/recherche de la catégorie "${categoryData.name}":`, mongoError.message || error);
    } else {
      console.error(`ERROR: Erreur lors de la création/recherche d'une catégorie (données manquantes pour le nom):`, mongoError.message || error);
    }
    return null; // Retourner null en cas d'erreur
  }
}

// Fonction pour générer un prompt d'analyse d'image générique pour une catégorie
function generateCategoryAnalysisPrompt(categoryName: string): string {
  // Échapper les apostrophes pour l'utilisation dans une chaîne de caractères JavaScript
  const escapedCategoryName = categoryName.replace(/'/g, "\'");
  return (
    `Évalue l'état cosmétique de cet objet (catégorie: ${escapedCategoryName}) sur une échelle de 0 à 4. ` +
    `Inspecte attentivement les signes d'usure, les rayures, les bosses, la propreté, et l'intégrité générale. ` +
    `0 = très mauvais état/inutilisable/pièces ; 1 = défauts majeurs/fortement usé ; ` +
    `2 = usure notable/plusieurs défauts mineurs ; 3 = usure légère/quelques défauts mineurs ; ` +
    `4 = excellent état/comme neuf/aucun défaut visible. Réponds uniquement avec le chiffre.`
  );
}

// Fonction pour ajouter/mettre à jour les prompts d'analyse d'image pour les catégories feuilles
function addAnalysisPromptsToSeedData(categories: SeedCategoryDefinition[]): SeedCategoryDefinition[] {
  return categories.map(category => {
    let updatedCategory = { ...category };
    if (!category.children || category.children.length === 0) {
      // C'est une catégorie feuille
      if (!updatedCategory.imageAnalysisPrompt) { // N'écrase pas un prompt déjà défini manuellement
        updatedCategory.imageAnalysisPrompt = generateCategoryAnalysisPrompt(category.name);
      }
    } else {
      // Ce n'est pas une feuille, traiter les enfants récursivement
      updatedCategory.children = addAnalysisPromptsToSeedData(category.children);
    }
    return updatedCategory;
  });
}

// Définition hiérarchique des catégories
const HIERARCHICAL_CATEGORIES_TO_SEED: SeedCategoryDefinition[] = [
  {
    name: 'Electronics',
    slug: 'electronics',
    children: [
      {
        name: 'Mobile Devices & Accessories',
        slug: 'mobile-devices-accessories',
        children: [
          {
            name: 'Mobile Phones',
            slug: 'mobile-phones',
            children: [
              {
                name: 'Smartphones',
                slug: 'smartphones',
                imageAnalysisPrompt: "Évalue l'état cosmétique de ce smartphone sur une échelle de 0 à 4. Regarde attentivement l'écran pour les rayures ou fissures, le châssis pour les bosses ou éraflures, et l'objectif de la caméra. 0 = très endommagé, 1 = nombreuses rayures/bosses visibles, 2 = rayures/usure légères, 3 = très peu de signes d'usure, 4 = comme neuf. Réponds uniquement avec le chiffre."
              },
              { name: 'Feature Phones', slug: 'feature-phones' },
            ],
          },
          { name: 'Tablets', slug: 'tablets' },
          { name: 'Smartwatches', slug: 'smartwatches' },
          { name: 'Fitness Trackers', slug: 'fitness-trackers' },
          {
            name: 'Mobile Accessories',
            slug: 'mobile-accessories',
            children: [
              { name: 'Cases & Covers', slug: 'mobile-cases-covers' },
              { name: 'Chargers & Cables', slug: 'mobile-chargers-cables' },
              { name: 'Power Banks', slug: 'mobile-power-banks' },
              { name: 'Screen Protectors', slug: 'mobile-screen-protectors'},
            ],
          },
        ],
      },
      {
        name: 'Computers, Components & Office',
        slug: 'computers-components-office',
        children: [
          { name: 'Laptops', slug: 'laptops' },
          { name: 'Desktop Computers', slug: 'desktop-computers' },
          { name: 'Monitors', slug: 'monitors' },
          {
            name: 'PC Components',
            slug: 'pc-components',
            children: [
              { name: 'CPUs (Processors)', slug: 'cpus-processors' },
              { name: 'GPUs (Graphics Cards)', slug: 'gpus-graphics-cards' },
              { name: 'Motherboards', slug: 'motherboards' },
              { name: 'RAM (Memory)', slug: 'ram-memory' },
              { name: 'Storage (SSD, HDD)', slug: 'storage-ssd-hdd' },
              { name: 'Power Supplies (PSU)', slug: 'power-supplies-psu'},
              { name: 'PC Cases', slug: 'pc-cases'},
            ],
          },
          {
            name: 'Computer Accessories',
            slug: 'computer-accessories',
            children: [
                { name: 'Keyboards', slug: 'keyboards' },
                { name: 'Mice', slug: 'mice' },
                { name: 'Webcams', slug: 'webcams' },
                { name: 'USB Hubs & Adapters', slug: 'usb-hubs-adapters' },
            ]
          },
          { name: 'Printers & Scanners', slug: 'printers-scanners' },
          { name: 'Networking Devices', slug: 'networking-devices', children: [
            { name: 'Routers', slug: 'routers'},
            { name: 'Modems', slug: 'modems'},
            { name: 'Network Switches', slug: 'network-switches'},
          ]},
          { name: 'Office Electronics', slug: 'office-electronics-other' }, // Distinct from general office supplies
        ],
      },
      {
        name: 'TV, Audio, Photo & Video',
        slug: 'tv-audio-photo-video',
        children: [
          {
            name: 'Televisions & Home Theater',
            slug: 'televisions-home-theater',
            children: [
              { name: 'Televisions (TVs)', slug: 'televisions' },
              { name: 'Home Theater Systems', slug: 'home-theater-systems' },
              { name: 'Soundbars', slug: 'soundbars' },
              { name: 'Streaming Devices', slug: 'streaming-devices' }, // e.g., Apple TV, Chromecast
              { name: 'Projectors', slug: 'projectors' },
            ],
          },
          {
            name: 'Audio Equipment',
            slug: 'audio-equipment',
            children: [
              { name: 'Headphones & Earbuds', slug: 'headphones-earbuds' },
              { name: 'Speakers', slug: 'speakers' , children: [
                { name: 'Portable Speakers', slug: 'portable-speakers'},
                { name: 'Bookshelf Speakers', slug: 'bookshelf-speakers'},
                { name: 'Smart Speakers', slug: 'smart-speakers'},
              ]},
              { name: 'Turntables & Accessories', slug: 'turntables-accessories' },
              { name: 'Microphones', slug: 'microphones' },
            ],
          },
          {
            name: 'Cameras, Camcorders & Drones',
            slug: 'cameras-camcorders-drones',
            children: [
              {
                name: 'Digital Cameras',
                slug: 'digital-cameras',
                children: [
                  { name: 'DSLR Cameras', slug: 'dslr-cameras' },
                  { name: 'Mirrorless Cameras', slug: 'mirrorless-cameras' },
                  { name: 'Point-and-Shoot Cameras', slug: 'point-and-shoot-cameras' },
                ],
              },
              { name: 'Camcorders', slug: 'camcorders' },
              { name: 'Action Cameras', slug: 'action-cameras' },
              { name: 'Drones with Cameras', slug: 'drones-with-cameras' }, // Merged from 'Drones'
              {
                name: 'Camera Accessories',
                slug: 'camera-accessories',
                children: [
                  {
                    name: 'Lenses',
                    slug: 'camera-lenses', // Making slug more specific
                    children: [
                      { name: 'DSLR Lenses', slug: 'dslr-lenses' }, // Depth 5
                      { name: 'Mirrorless Lenses', slug: 'mirrorless-lenses' }, // Depth 5
                      { name: 'Other Camera Lenses', slug: 'other-camera-lenses' }, // Depth 5
                    ],
                  },
                  { name: 'Tripods & Mounts', slug: 'camera-tripods-mounts' },
                  { name: 'Camera Bags & Cases', slug: 'camera-bags-cases' },
                  { name: 'Flashes & Lighting', slug: 'camera-flashes-lighting' },
                  { name: 'Camera Batteries & Chargers', slug: 'camera-batteries-chargers'},
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'Gaming Consoles & Accessories',
        slug: 'gaming-consoles-accessories',
        children: [
          { name: 'Game Consoles', slug: 'game-consoles' }, // e.g., PlayStation, Xbox, Nintendo
          { name: 'Video Games', slug: 'video-games' }, // Physical & Digital
          {
            name: 'PC Gaming', // Sub-category for PC specific gaming gear
            slug: 'pc-gaming',
            children: [
              { name: 'Gaming Laptops', slug: 'gaming-laptops' }, // Potentially duplicate of laptops, but context is gaming
              { name: 'Gaming Desktops', slug: 'gaming-desktops' },
              { name: 'Gaming Monitors', slug: 'gaming-monitors' },
              { name: 'PC Gaming Accessories', slug: 'pc-gaming-accessories', children: [
                  { name: 'Gaming Keyboards', slug: 'gaming-keyboards'},
                  { name: 'Gaming Mice', slug: 'gaming-mice'},
                  { name: 'Gaming Headsets', slug: 'gaming-headsets'},
              ]},
            ],
          },
          { name: 'VR Headsets & Accessories', slug: 'vr-headsets-accessories' }, // Merged from 'VR Headsets'
          { name: 'Gaming Accessories General', slug: 'gaming-accessories-general' }, // Controllers, etc.
        ],
      },
      {
        name: 'General Electronics & Utilities',
        slug: 'general-electronics-utilities',
        children: [
            { name: 'Batteries & General Chargers', slug: 'batteries-general-chargers' },
            { name: 'Cables & Adapters General', slug: 'cables-adapters-general' },
        ]
      }
    ],
  },
  {
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    children: [
      {
        name: 'Kitchen Appliances',
        slug: 'kitchen-appliances',
        children: [
          { name: 'Small Kitchen Appliances', slug: 'small-kitchen-appliances', children: [
            { name: 'Coffee Makers', slug: 'coffee-makers'},
            { name: 'Blenders', slug: 'blenders'},
            { name: 'Toasters & Ovens', slug: 'toasters-ovens'},
            { name: 'Microwaves', slug: 'microwaves-small'}, // if small category exists
          ]},
          { name: 'Large Kitchen Appliances', slug: 'large-kitchen-appliances', children: [
            { name: 'Refrigerators', slug: 'refrigerators'},
            { name: 'Dishwashers', slug: 'dishwashers'},
            { name: 'Ovens & Stoves', slug: 'ovens-stoves-large'},
          ]},
        ],
      },
      { name: 'Cookware & Bakeware', slug: 'cookware-bakeware' },
      { name: 'Tableware & Cutlery', slug: 'tableware-cutlery' },
      { name: 'Home Decor', slug: 'home-decor', children: [
        { name: 'Rugs & Carpets', slug: 'rugs-carpets'},
        { name: 'Curtains & Blinds', slug: 'curtains-blinds'},
        { name: 'Vases & Decorative Bowls', slug: 'vases-decorative-bowls'},
      ]},
      { name: 'Furniture', slug: 'furniture', children: [
        { name: 'Living Room Furniture', slug: 'living-room-furniture'},
        { name: 'Bedroom Furniture', slug: 'bedroom-furniture'},
        { name: 'Office Furniture', slug: 'office-furniture-home'}, // For home office
        { name: 'Outdoor Furniture', slug: 'outdoor-furniture' },
      ]},
      { name: 'Lighting', slug: 'lighting' },
      { name: 'Bedding & Linens', slug: 'bedding-linens' },
      { name: 'Bath Accessories', slug: 'bath-accessories' },
      { name: 'Home Storage & Organization', slug: 'home-storage-organization' },
      { name: 'Cleaning Supplies & Vacuums', slug: 'cleaning-supplies-vacuums' },
      { name: 'Gardening Tools & Supplies', slug: 'gardening-tools-supplies' },
      { name: 'Grills & Outdoor Cooking', slug: 'grills-outdoor-cooking' },
    ],
  },
  {
    name: 'Fashion & Apparel',
    slug: 'fashion-apparel',
    children: [
      { name: "Men's Fashion", slug: 'mens-fashion', children: [
        { name: "Men's Clothing", slug: 'mens-clothing' },
        { name: "Men's Shoes", slug: 'mens-shoes' },
        { name: "Men's Accessories", slug: 'mens-accessories'},
      ]},
      { name: "Women's Fashion", slug: 'womens-fashion', children: [
        { name: "Women's Clothing", slug: 'womens-clothing' },
        { name: "Women's Shoes", slug: 'womens-shoes' },
        { name: "Women's Accessories", slug: 'womens-accessories'},
      ]},
      { name: "Kids' Fashion", slug: 'kids-fashion', children: [
        { name: "Kids' Clothing", slug: 'kids-clothing' },
        { name: "Kids' Shoes", slug: 'kids-shoes' },
      ]},
      { name: 'Bags & Luggage', slug: 'bags-luggage' },
      { name: 'Jewelry & Watches', slug: 'jewelry-watches', children: [
        { name: 'Jewelry', slug: 'jewelry'},
        { name: 'Watches', slug: 'watches-fashion'}, // distinguish from smartwatches
      ]},
    ],
  },
  // ... (Ajoutez d'autres catégories principales avec une structure similaire si nécessaire)
  // Par exemple: Health & Beauty, Sports & Outdoors, Toys & Games, Books, Music & Movies etc.
  // Gardez une profondeur variable et une structure pertinente.
];

// Appliquer la fonction pour ajouter les prompts génériques aux feuilles qui n'en ont pas
const HIERARCHICAL_CATEGORIES_TO_SEED_WITH_PROMPTS = addAnalysisPromptsToSeedData(HIERARCHICAL_CATEGORIES_TO_SEED);

/**
 * Fonction principale pour exécuter le seeding des catégories.
 */
async function seedCategories() {
  try {
    await dbConnect();
    console.log('INFO: Connexion à la base de données réussie.');

    // Réinitialiser les compteurs pour cette exécution
    categoriesCreatedCount = 0;
    categoriesSkippedCount = 0;

    // Optionnel: Supprimer toutes les catégories existantes avant de seeder.
    // ATTENTION: Ceci effacera toutes les catégories de votre base de données.
    // Décommentez la ligne suivante avec prudence.
    // console.log('INFO: Suppression des catégories existantes...');
    // await CategoryModel.deleteMany({});
    // console.log('INFO: Anciennes catégories supprimées.');

    console.log('INFO: Début du seeding des catégories...');
    for (const category of HIERARCHICAL_CATEGORIES_TO_SEED_WITH_PROMPTS) {
      await createCategoryRecursive(category, null, 0); // Les catégories racines ont une profondeur de 0
    }

    console.log(`
--- Fin du seed des catégories ---
${categoriesCreatedCount} catégorie(s) créée(s).
${categoriesSkippedCount} catégorie(s) ignorée(s) (existante(s) ou erreur).
Total de catégories racines traitées: ${HIERARCHICAL_CATEGORIES_TO_SEED_WITH_PROMPTS.length}.
Vérifiez les logs ci-dessus pour les détails.
`);

  } catch (error) {
    const castedError = error as Error;
    console.error('FATAL: Erreur majeure durant le processus de seed des catégories:', castedError.message, castedError.stack);
  } finally {
    // mongoose.connection.close(); // Décommentez si vous souhaitez fermer la connexion après le script
    // console.log('INFO: Connexion à la base de données fermée (si activé).');
    process.exit(0); // Important pour terminer le script en mode CLI
  }
}

seedCategories(); 