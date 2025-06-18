/**
 * Centralise le mapping entre les slugs des catégories feuilles et les valeurs 'kind'
 * des discriminateurs Mongoose pour les offres de produits.
 *
 * IMPORTANT : Les slugs ici DOIVENT correspondre aux slugs générés par
 * CategoryModel.ts (slugify avec options : { lower: true, strict: true, remove: /[*+~.()'"!:@]/g }).
 *
 * Vérifiez/générez les slugs via la console Node ou un script :
 * const slugify = require('slugify');
 * console.log(slugify("Nom Catégorie", { lower: true, strict: true, remove: /[*+~.()'"!:@]/g }));
 */

// Centralisation des kinds pour une utilisation facilitée et cohérente
export const KINDS = {
  LAPTOP: 'laptops',
  SMARTPHONE: 'smartphones',
  FEATURE_PHONES: 'feature-phones',
  TABLET: 'tablets',
  SMARTWATCH: 'smartwatches',
  FITNESS_TRACKER: 'fitness-trackers',
  CASES_COVERS: 'cases-covers',
  CHARGERS_CABLES: 'chargers-cables',
  POWER_BANKS: 'power-banks',
  SCREEN_PROTECTORS: 'screen-protectors',
  DESKTOP_COMPUTER: 'desktop-computers',
  MONITOR: 'monitors',
  CPU: 'cpus-processors',
  GPU: 'gpus-graphics-cards',
  MOTHERBOARD: 'motherboards',
  RAM: 'ram-memory',
  STORAGE: 'storage-ssd-hdd',
  PSU: 'power-supplies-psu',
  PC_CASE: 'pc-cases',
  KEYBOARD: 'keyboards',
  GAME_CONSOLE: 'game-consoles',
  // Ajoutez d'autres kinds ici
} as const; // 'as const' pour des types littéraux stricts

// Type dérivé des valeurs de l'objet KINDS
export type ProductKind = typeof KINDS[keyof typeof KINDS];

// Mapping principal : slug de catégorie -> kind
export const categorySlugToKindMap: Record<string, ProductKind> = {
  'laptops': KINDS.LAPTOP,
  'smartphones': KINDS.SMARTPHONE,
  'feature-phones': KINDS.FEATURE_PHONES,
  'tablets': KINDS.TABLET,
  'smartwatches': KINDS.SMARTWATCH,
  'fitness-trackers': KINDS.FITNESS_TRACKER,
  'cases-covers': KINDS.CASES_COVERS,
  'chargers-cables': KINDS.CHARGERS_CABLES,
  'power-banks': KINDS.POWER_BANKS,
  'screen-protectors': KINDS.SCREEN_PROTECTORS,
  'desktop-computers': KINDS.DESKTOP_COMPUTER,
  'monitors': KINDS.MONITOR,
  'cpus-processors': KINDS.CPU,
  'gpus-graphics-cards': KINDS.GPU,
  'motherboards': KINDS.MOTHERBOARD,
  'ram-memory': KINDS.RAM,
  'storage-ssd-hdd': KINDS.STORAGE,
  'power-supplies-psu': KINDS.PSU,
  'pc-cases': KINDS.PC_CASE,
  'keyboards': KINDS.KEYBOARD,
  'game-consoles': KINDS.GAME_CONSOLE,
  // Ajoutez ici tous vos mappings slug de catégorie feuille vers kind.
  // Exemples de slugs précédemment présents et leurs kinds (à vérifier/conserver si toujours pertinents) :
  // 'ordinateurs-portables': KINDS.LAPTOP,
  // 'telephones-mobiles': KINDS.SMARTPHONE,
};

/**
 * Récupère le 'kind' à partir d'un slug de catégorie.
 * @param slug Le slug de la catégorie.
 * @returns Le 'kind' correspondant ou undefined si non trouvé.
 */
export function getKindFromSlug(slug: string): ProductKind | undefined {
  return categorySlugToKindMap[slug];
} 