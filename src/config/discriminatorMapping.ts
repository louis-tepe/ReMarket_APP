/**
 * Ce fichier centralise le mapping entre les slugs des catégories feuilles
 * et les valeurs 'kind' utilisées par les discriminateurs Mongoose pour les offres de produits.
 *
 * IMPORTANT : Les clés (slugs) de cet objet DOIVENT correspondre EXACTEMENT
 * aux slugs générés par slugify dans CategoryModel.ts avec les options :
 * { lower: true, strict: true, remove: /[*+~.()'"!:@]/g }
 *
 * Utilisez la console Node ou un script pour générer le slug à partir du nom de la catégorie
 * avant de l'ajouter ici. Exemple :
 * const slugify = require('slugify');
 * const categoryName = "Nom De Ma Catégorie";
 * const options = { lower: true, strict: true, remove: /[*+~.()'"!:@]/g };
 * const generatedSlug = slugify(categoryName, options);
 * console.log(generatedSlug);
 */

// Définition des valeurs 'kind' pour la cohérence
export const LAPTOP_KIND = 'laptops';
export const SMARTPHONE_KIND = 'smartphones';
export const FEATURE_PHONES_KIND = 'feature-phones';
export const TABLET_KIND = 'tablets';
export const SMARTWATCH_KIND = 'smartwatches';
export const FITNESS_TRACKER_KIND = 'fitness-trackers';
export const CASES_COVERS_KIND = 'cases-covers';
export const CHARGERS_CABLES_KIND = 'chargers-cables';
export const POWER_BANKS_KIND = 'power-banks';
export const SCREEN_PROTECTORS_KIND = 'screen-protectors';
export const DESKTOP_COMPUTER_KIND = 'desktop-computers';
export const MONITOR_KIND = 'monitors';
export const CPU_KIND = 'cpus-processors';
export const GPU_KIND = 'gpus-graphics-cards';
export const MOTHERBOARD_KIND = 'motherboards';
export const RAM_KIND = 'ram-memory';
export const STORAGE_KIND = 'storage-ssd-hdd';
export const PSU_KIND = 'power-supplies-psu';
export const PC_CASE_KIND = 'pc-cases';
export const KEYBOARD_KIND = 'keyboards';
// Ajoutez d'autres kinds ici au fur et à mesure que vous créez des discriminateurs
// export const TABLET_KIND = 'tablets';

// Centralisation des kinds dans un objet pour une utilisation facilitée
export const KINDS = {
  LAPTOP: LAPTOP_KIND,
  SMARTPHONE: SMARTPHONE_KIND,
  FEATURE_PHONES: FEATURE_PHONES_KIND,
  TABLET: TABLET_KIND,
  SMARTWATCH: SMARTWATCH_KIND,
  FITNESS_TRACKER: FITNESS_TRACKER_KIND,
  CASES_COVERS: CASES_COVERS_KIND,
  CHARGERS_CABLES: CHARGERS_CABLES_KIND,
  POWER_BANKS: POWER_BANKS_KIND,
  SCREEN_PROTECTORS: SCREEN_PROTECTORS_KIND,
  DESKTOP_COMPUTER: DESKTOP_COMPUTER_KIND,
  MONITOR: MONITOR_KIND,
  CPU: CPU_KIND,
  GPU: GPU_KIND,
  MOTHERBOARD: MOTHERBOARD_KIND,
  RAM: RAM_KIND,
  STORAGE: STORAGE_KIND,
  PSU: PSU_KIND,
  PC_CASE: PC_CASE_KIND,
  KEYBOARD: KEYBOARD_KIND,
  // TABLET: TABLET_KIND,
} as const; // 'as const' pour des types littéraux plus stricts si utilisé en TypeScript

export type ProductKind = typeof KINDS[keyof typeof KINDS];

// Le mapping principal
export const categorySlugToKindMap: Record<string, ProductKind> = {
  // Exemples - REMPLACEZ-LES PAR VOS SLUGS ET KINDS RÉELS
  'ordinateurs-portables': KINDS.LAPTOP, // Slug existant, gardé pour exemple de structure
  'laptops': KINDS.LAPTOP, // Slug probable pour "Laptops"
  'telephones-mobiles': KINDS.SMARTPHONE, // Slug existant, gardé pour exemple
  'smartphones': KINDS.SMARTPHONE, // Slug probable pour "Smartphones"
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
  // 'tablettes-graphiques': KINDS.TABLET, // Exemple si vous aviez un TABLET_KIND
  // ... ajoutez ici tous vos mappings slug de catégorie feuille vers kind
};

// Optionnel : Mapping inverse pour trouver un nom de modèle ou une référence
// Peut être utile pour certaines logiques côté serveur ou admin.
// Les valeurs ici devraient correspondre aux noms de vos modèles discriminateurs.
export const kindToModelNameMap: Record<ProductKind, string> = {
  [KINDS.LAPTOP]: 'LaptopOffer', // Nom du discriminateur tel que défini dans LaptopModel.ts
  [KINDS.SMARTPHONE]: 'SmartphoneOffer', // Nom du discriminateur tel que défini dans SmartphoneModel.ts
  [KINDS.FEATURE_PHONES]: 'FeaturePhoneOffer',
  [KINDS.TABLET]: 'TabletOffer',
  [KINDS.SMARTWATCH]: 'SmartwatchOffer',
  [KINDS.FITNESS_TRACKER]: 'FitnessTrackerOffer',
  [KINDS.CASES_COVERS]: 'CasesCoversOffer',
  [KINDS.CHARGERS_CABLES]: 'ChargersCablesOffer',
  [KINDS.POWER_BANKS]: 'PowerBanksOffer',
  [KINDS.SCREEN_PROTECTORS]: 'ScreenProtectorsOffer',
  [KINDS.DESKTOP_COMPUTER]: 'DesktopComputerOffer',
  [KINDS.MONITOR]: 'MonitorOffer',
  [KINDS.CPU]: 'CpuOffer',
  [KINDS.GPU]: 'GpuOffer',
  [KINDS.MOTHERBOARD]: 'MotherboardOffer',
  [KINDS.RAM]: 'RamOffer',
  [KINDS.STORAGE]: 'StorageOffer',
  [KINDS.PSU]: 'PsuOffer',
  [KINDS.PC_CASE]: 'PcCaseOffer',
  [KINDS.KEYBOARD]: 'KeyboardOffer',
  // [KINDS.TABLET]: 'TabletOffer',
};

/**
 * Helper function pour obtenir le 'kind' à partir d'un slug.
 * @param slug Le slug de la catégorie.
 * @returns Le 'kind' correspondant ou undefined si non trouvé.
 */
export function getKindFromSlug(slug: string): ProductKind | undefined {
  return categorySlugToKindMap[slug];
} 