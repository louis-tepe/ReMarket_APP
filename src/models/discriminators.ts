import mongoose, { Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from './ProductBaseModel';

// Importer tous vos modèles de discriminateurs spécifiques
import CasesCoversOfferModel, { ICasesCoversOffer } from './discriminators/CasesCoversModel';
import ChargersCablesOfferModel, { IChargersCablesOffer } from './discriminators/ChargersCablesModel';
import CpuOfferModel, { ICpuOffer } from './discriminators/CpuModel';
import DesktopComputerOfferModel, { IDesktopComputerOffer } from './discriminators/DesktopComputerModel';
import FeaturePhoneOfferModel, { IFeaturePhoneOffer } from './discriminators/FeaturePhoneModel';
import FitnessTrackerOfferModel, { IFitnessTrackerOffer } from './discriminators/FitnessTrackerModel';
import GpuOfferModel, { IGpuOffer } from './discriminators/GpuModel';
import KeyboardOfferModel, { IKeyboardOffer } from './discriminators/KeyboardModel';
import LaptopOfferModel, { ILaptopOffer } from './discriminators/LaptopModel';
import MonitorOfferModel, { IMonitorOffer } from './discriminators/MonitorModel';
import MotherboardOfferModel, { IMotherboardOffer } from './discriminators/MotherboardModel';
import PcCaseOfferModel, { IPcCaseOffer } from './discriminators/PcCaseModel';
import PowerBankOfferModel, { IPowerBankOffer } from './discriminators/PowerBanksModel';
import PsuOfferModel, { IPsuOffer } from './discriminators/PsuModel';
import RamOfferModel, { IRamOffer } from './discriminators/RamModel';
import ScreenProtectorOfferModel, { IScreenProtectorOffer } from './discriminators/ScreenProtectorsModel';
import SmartphoneOfferModel, { ISmartphoneOffer } from './discriminators/SmartphoneModel';
import SmartwatchOfferModel, { ISmartwatchOffer } from './discriminators/SmartwatchModel';
import StorageOfferModel, { IStorageOffer } from './discriminators/StorageModel';
import TabletOfferModel, { ITabletOffer } from './discriminators/TabletModel';

// Stocke les modèles discriminateurs déjà compilés pour éviter les erreurs de recompilation
// La clé est le `kind` (slug de catégorie), la valeur est le modèle compilé.
const compiledDiscriminators: { [key: string]: Model<IProductBase> } = {};

// Enregistrer manuellement chaque discriminateur pour s'assurer qu'ils sont connus de Mongoose
// et pour peupler notre map `compiledDiscriminators`.
// Cette approche est plus explicite que le switch/case pour l'enregistrement.

// Note: La logique de vérification if (models.ProductOffer && models.ProductOffer.discriminators[key])
// est déjà dans chaque fichier de discriminateur. Ici, on s'assure qu'ils sont importés et donc exécutés.

if (SmartphoneOfferModel) compiledDiscriminators['smartphones'] = SmartphoneOfferModel as Model<IProductBase>;
if (LaptopOfferModel) compiledDiscriminators['laptops'] = LaptopOfferModel as Model<IProductBase>;
if (CasesCoversOfferModel) compiledDiscriminators['cases-covers'] = CasesCoversOfferModel as Model<IProductBase>;
if (ChargersCablesOfferModel) compiledDiscriminators['chargers-cables'] = ChargersCablesOfferModel as Model<IProductBase>;
if (CpuOfferModel) compiledDiscriminators['cpus-processors'] = CpuOfferModel as Model<IProductBase>;
if (DesktopComputerOfferModel) compiledDiscriminators['desktop-computers'] = DesktopComputerOfferModel as Model<IProductBase>;
if (FeaturePhoneOfferModel) compiledDiscriminators['feature-phones'] = FeaturePhoneOfferModel as Model<IProductBase>;
if (FitnessTrackerOfferModel) compiledDiscriminators['fitness-trackers'] = FitnessTrackerOfferModel as Model<IProductBase>;
if (GpuOfferModel) compiledDiscriminators['gpus-graphics-cards'] = GpuOfferModel as Model<IProductBase>;
if (KeyboardOfferModel) compiledDiscriminators['keyboards'] = KeyboardOfferModel as Model<IProductBase>;
if (MonitorOfferModel) compiledDiscriminators['monitors'] = MonitorOfferModel as Model<IProductBase>;
if (MotherboardOfferModel) compiledDiscriminators['motherboards'] = MotherboardOfferModel as Model<IProductBase>;
if (PcCaseOfferModel) compiledDiscriminators['pc-cases'] = PcCaseOfferModel as Model<IProductBase>;
if (PowerBankOfferModel) compiledDiscriminators['power-banks'] = PowerBankOfferModel as Model<IProductBase>;
if (PsuOfferModel) compiledDiscriminators['power-supplies-psu'] = PsuOfferModel as Model<IProductBase>;
if (RamOfferModel) compiledDiscriminators['ram-memory'] = RamOfferModel as Model<IProductBase>;
if (ScreenProtectorOfferModel) compiledDiscriminators['screen-protectors'] = ScreenProtectorOfferModel as Model<IProductBase>;
if (SmartwatchOfferModel) compiledDiscriminators['smartwatches'] = SmartwatchOfferModel as Model<IProductBase>;
if (StorageOfferModel) compiledDiscriminators['storage-ssd-hdd'] = StorageOfferModel as Model<IProductBase>;
if (TabletOfferModel) compiledDiscriminators['tablets'] = TabletOfferModel as Model<IProductBase>;

/**
 * Retourne le modèle Mongoose discriminateur pour un `kind` (slug de catégorie feuille) donné.
 * Utilise les modèles pré-enregistrés via les imports.
 *
 * @param kind Le slug de la catégorie feuille, utilisé comme clé de discriminateur.
 * @returns Le modèle Mongoose discriminateur.
 */
export function ProductCategorySpecificModel(kind: string): Model<IProductBase> {
  const model = compiledDiscriminators[kind];
  if (model) {
    return model;
  }
  
  // Fallback au modèle de base si aucun discriminateur spécifique n'est trouvé pour ce `kind`.
  // Cela permet la création d'offres pour des catégories sans champs spécifiques définis,
  // mais loggue un avertissement.
  console.warn(`[ProductCategorySpecificModel] Aucun discriminateur spécifique trouvé ou enregistré pour le kind '${kind}'. Utilisation du modèle de base ProductOfferModel. Les champs spécifiques ne seront pas validés ni sauvegardés pour cette offre si ce n'est pas intentionnel.`);
  return ProductOfferModel; 
}

// Log pour vérifier quels discriminateurs ont été chargés
console.log("[Discriminators] Modèles discriminateurs compilés chargés:", Object.keys(compiledDiscriminators));

// Optionnel: Pré-enregistrer tous les discriminateurs au démarrage de l'application
// Cela peut être fait en important ce fichier une fois au début (par exemple dans votre fichier principal de serveur ou dbConnect)
// et en appelant une fonction qui itère sur tous les kinds possibles et appelle ProductCategorySpecificModel.
// Exemple:
// export function registerAllDiscriminators() {
//   const allLeafCategorySlugs = ["smartphones", "laptops", ...etc];
//   allLeafCategorySlugs.forEach(slug => {
//     try {
//       ProductCategorySpecificModel(slug);
//     } catch (error) {
//       console.warn(`Avertissement lors du pré-enregistrement du discriminateur pour ${slug}: ${(error as Error).message}`);
//       // Si le discriminateur n'est pas encore défini, ce n'est pas grave ici, il sera créé à la volée plus tard.
//     }
//   });
//   console.log("Pré-enregistrement des discriminateurs terminé (ou tenté).");
// } 