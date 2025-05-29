import { Model } from 'mongoose';
import ProductOfferModel, { IProductBase } from './ProductBaseModel';

// Importe tous les modèles de discriminateurs spécifiques
// Chaque fichier de discriminateur s'auto-enregistre auprès de Mongoose
// et devrait idéalement exporter le modèle compilé.
import './discriminators/CasesCoversModel';
import './discriminators/ChargersCablesModel';
import './discriminators/CpuModel';
import './discriminators/DesktopComputerModel';
import './discriminators/FeaturePhoneModel';
import './discriminators/FitnessTrackerModel';
import './discriminators/GpuModel';
import './discriminators/KeyboardModel';
import './discriminators/LaptopModel';
import './discriminators/MonitorModel';
import './discriminators/MotherboardModel';
import './discriminators/PcCaseModel';
import './discriminators/PowerBanksModel';
import './discriminators/PsuModel';
import './discriminators/RamModel';
import './discriminators/ScreenProtectorsModel';
import './discriminators/SmartphoneModel';
import './discriminators/SmartwatchModel';
import './discriminators/StorageModel';
import './discriminators/TabletModel';

/**
 * Récupère le modèle Mongoose discriminateur pour un `kind` donné (slug de catégorie feuille).
 * Si un discriminateur spécifique pour ce `kind` est enregistré, il est retourné.
 * Sinon, retourne le `ProductOfferModel` de base et émet un avertissement.
 *
 * @param kind Le slug de la catégorie feuille, utilisé comme clé de discriminateur.
 * @returns Le modèle Mongoose discriminateur spécifique ou le modèle de base.
 */
export function getProductOfferDiscriminator(kind: string): Model<IProductBase> {
  // Accède aux discriminateurs enregistrés sur le modèle de base
  const discriminators = ProductOfferModel.discriminators;
  const specificModel = discriminators?.[kind];

  if (specificModel) {
    return specificModel as Model<IProductBase>;
  }
  
  console.warn(
    `[getProductOfferDiscriminator] Aucun discriminateur spécifique trouvé pour le kind '${kind}'. ` +
    `Retour du ProductOfferModel de base. Les champs spécifiques à la catégorie ` +
    `ne seront pas validés ni sauvegardés si ce n'est pas l'intention.`
  );
  return ProductOfferModel; 
}

// Log pour vérifier quels discriminateurs ont été chargés au démarrage.
// Cela se produit parce que chaque fichier de discriminateur est importé.
if (ProductOfferModel.discriminators) {
    console.log(
        "[Discriminators] Modèles discriminateurs enregistrés au démarrage:", 
        Object.keys(ProductOfferModel.discriminators)
    );
} else {
    console.log("[Discriminators] Aucun discriminateur explicitement enregistré sur ProductOfferModel au démarrage.");
}

// Note: Il n'est généralement pas nécessaire d'appeler une fonction pour "pré-enregistrer"
// les discriminateurs si chaque fichier de modèle discriminateur gère son propre enregistrement
// via `ProductOfferModel.discriminator('kind-value', SpecificSchema)`. 
// Le simple fait d'importer ces fichiers suffit à les exécuter et à enregistrer les discriminateurs. 