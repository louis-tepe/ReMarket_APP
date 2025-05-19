import { Schema, models } from 'mongoose';
import ProductOfferModel, { IProductBase } from '../ProductBaseModel'; // Chemin vers le modèle de base

// Interface pour les champs spécifiques aux smartphones
export interface ISmartphoneOffer extends IProductBase {
  screenSize_in: number; // Taille de l'écran en pouces
  storageCapacity_gb: number; // Capacité de stockage en GB
  ram_gb: number; // RAM en GB
  cameraResolution_mp?: number; // Résolution de la caméra principale en MP (optionnel)
  batteryCapacity_mah?: number; // Capacité de la batterie en mAh (optionnel)
  operatingSystem: string; // Ex: Android 13, iOS 16
  color: string;
  imei?: string; // IMEI (optionnel, mais important pour les téléphones)
}

const SmartphoneSchema = new Schema<ISmartphoneOffer>(
  {
    screenSize_in: {
      type: Number,
      required: [true, "La taille de l'écran est obligatoire pour un smartphone."],
      min: [0, "La taille de l'écran doit être positive."],
    },
    storageCapacity_gb: {
      type: Number,
      required: [true, "La capacité de stockage est obligatoire pour un smartphone."],
      min: [0, "La capacité de stockage doit être positive."],
    },
    ram_gb: {
      type: Number,
      required: [true, "La RAM est obligatoire pour un smartphone."],
      min: [0, "La RAM doit être positive."],
    },
    cameraResolution_mp: {
      type: Number,
      min: [0, "La résolution de la caméra doit être positive."],
    },
    batteryCapacity_mah: {
      type: Number,
      min: [0, "La capacité de la batterie doit être positive."],
    },
    operatingSystem: {
      type: String,
      required: [true, "Le système d'exploitation est obligatoire."],
      trim: true,
    },
    color: {
      type: String,
      required: [true, "La couleur est obligatoire."],
      trim: true,
    },
    imei: {
        type: String,
        trim: true,
        // Vous pourriez ajouter une validation regex pour l'IMEI ici
    }
  },
  {
    // Les options de schéma comme timestamps et versionKey sont héritées du ProductBaseSchema
    // Pas besoin de redéfinir discriminatorKey ici, il est déjà sur le parent
  }
);

// Création du discriminateur
// Le nom 'SmartphoneOffer' sera utilisé comme valeur pour le champ 'kind' du ProductBaseSchema
// et permettra à Mongoose de savoir quel schéma spécifique utiliser.
// Il est crucial que le nom du discriminateur (ex: 'SmartphoneOffer') corresponde à une valeur que vous utiliserez
// pour identifier ce type de produit, par exemple, basé sur le slug de la catégorie feuille.

// Vérifier si le discriminateur existe déjà pour éviter les erreurs de recompilation en dév (Next.js HMR)
let SmartphoneOfferModel;
if (models.ProductOffer && models.ProductOffer.discriminators && models.ProductOffer.discriminators.smartphones) {
  SmartphoneOfferModel = models.ProductOffer.discriminators.smartphones;
} else if (models.ProductOffer) {
  SmartphoneOfferModel = ProductOfferModel.discriminator<ISmartphoneOffer>('smartphones', SmartphoneSchema);
} else {
  // Ce cas est moins probable si ProductBaseModel est correctement exporté et importé,
  // mais c'est une sécurité pour s'assurer que le modèle de base est compilé avant d'ajouter un discriminateur.
  // Cependant, cela peut introduire des complexités avec l'ordre de chargement des modèles.
  // Il est généralement préférable de s'assurer que le modèle de base est chargé en premier.
  console.warn("ProductOfferModel base model not found when defining SmartphoneOffer discriminator. This might lead to issues.");
  // Tentative de définition, mais peut échouer si ProductOfferModel n'est pas encore initialisé
  // SmartphoneOfferModel = model<ISmartphoneOffer>('ProductOffer').discriminator('SmartphoneOffer', SmartphoneSchema);
}

export default SmartphoneOfferModel as typeof models.ProductOffer | undefined; // Exporter avec un type qui reflète sa nature de discriminateur 