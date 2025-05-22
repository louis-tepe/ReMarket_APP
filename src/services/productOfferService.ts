import CategoryModel, { ICategory } from '../models/CategoryModel';
import ProductOfferModel, { IProductBase } from '../models/ProductBaseModel';
import { getKindFromSlug, ProductKind } from '../config/discriminatorMapping';
import { Types } from 'mongoose';
//Retrouver le KIND en fonction du slug de la catégorie, inversement, retrouver le slug en fonction du KIND
// Importer les modèles discriminateurs si vous avez besoin d'y accéder directement
// par exemple pour une validation plus poussée ou une logique spécifique avant la création via le modèle de base.
// import LaptopOfferModel from '../models/discriminators/LaptopModel';
// import SmartphoneOfferModel from '../models/discriminators/SmartphoneModel';

interface BaseOfferData {
  productModel: Types.ObjectId | string;
  seller: Types.ObjectId | string;
  price: number;
  currency?: string;
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  description: string;
  images: string[];
  stockQuantity?: number;
  listingStatus?: 'pending_approval' | 'active' | 'inactive' | 'rejected' | 'sold';
  // ... autres champs communs de IProductBase que vous attendez en entrée
}

// Interface générique pour les données spécifiques au produit, le type exact dépendra du 'kind'
interface SpecificOfferData { 
  [key: string]: unknown; 
}

export type CreateOfferInput = BaseOfferData & SpecificOfferData;

export async function createProductOfferService(
  offerData: CreateOfferInput,
  categoryId: Types.ObjectId | string
): Promise<IProductBase> {
  // 1. Récupérer la catégorie pour obtenir son slug et valider
  const category: ICategory | null = await CategoryModel.findById(categoryId);

  if (!category) {
    throw new Error(`Catégorie avec ID '${categoryId}' non trouvée.`);
  }

  if (!category.isLeafNode) {
    throw new Error(`La catégorie '${category.name}' (ID: ${categoryId}) n'est pas une catégorie feuille. Seules les catégories feuilles peuvent être associées à des offres.`);
  }

  const categorySlug = category.slug;

  // 2. Déterminer le 'kind' à partir du slug de la catégorie en utilisant le mapping
  const kind: ProductKind | undefined = getKindFromSlug(categorySlug);

  if (!kind) {
    throw new Error(
      `Aucun mapping 'kind' de discriminateur trouvé pour le slug de catégorie: '${categorySlug}' (Catégorie: '${category.name}'). ` +
      `Veuillez vérifier la configuration dans 'src/config/discriminatorMapping.ts' ou le slug de la catégorie.`
    );
  }

  // 3. Préparer les données complètes de l'offre avec le 'kind'
  const fullOfferData = {
    ...offerData,
    category: category._id, // Assigner l'ID de la catégorie
    kind: kind, // Assignation du 'kind' dynamique
  };

  // 4. Créer et sauvegarder l'offre
  // Mongoose utilisera automatiquement le bon schéma discriminateur basé sur la valeur 'kind'.
  // Vous pouvez instancier directement avec ProductOfferModel (le modèle de base).
  
  // Logique de sélection de modèle spécifique (optionnelle, Mongoose le fait pour vous)
  // switch (kind) {
  //   case KINDS.LAPTOP:
  //     // Vous pourriez ici faire des validations spécifiques à ILaptopOffer sur offerData
  //     // avant de passer à la création.
  //     break;
  //   case KINDS.SMARTPHONE:
  //     // Validations spécifiques à ISmartphoneOffer
  //     break;
  //   default:
  //     // Ce cas ne devrait pas être atteint si getKindFromSlug et KINDS sont bien définis
  //     const exhaustiveCheck: never = kind;
  //     throw new Error(`Type de produit (kind) '${exhaustiveCheck}' non géré.`);
  // }

  const newProductOffer = new ProductOfferModel(fullOfferData);
  
  try {
    await newProductOffer.save();
    console.log(`Offre créée avec succès avec le kind: ${kind}`, newProductOffer);
    return newProductOffer;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la nouvelle offre de produit:', error);
    // Vous pourriez vouloir inspecter les erreurs de validation de Mongoose ici
    // if (error instanceof mongoose.Error.ValidationError) { ... }
    throw error; // Renvoyer l'erreur pour la gestion en amont
  }
}

// Exemple d'utilisation (à placer dans un handler d'API ou un script de test)
/*
async function testCreateOffer() {
  // Assurez-vous d'avoir une connexion mongoose active
  // await mongoose.connect('YOUR_MONGO_URI');

  // REMPLACEZ par des IDs valides de votre base de données
  const mockLaptopCategoryId = new Types.ObjectId('replace_with_actual_laptop_category_id'); 
  const mockSmartphoneCategoryId = new Types.ObjectId('replace_with_actual_smartphone_category_id');
  const mockSellerId = new Types.ObjectId('replace_with_actual_seller_id');
  const mockProductModelId = new Types.ObjectId('replace_with_actual_product_model_id');

  const laptopOfferData: CreateOfferInput = {
    productModel: mockProductModelId,
    seller: mockSellerId,
    price: 1200,
    condition: 'like-new',
    description: 'Superbe PC portable, peu servi',
    images: ['image_laptop1.jpg'],
    stockQuantity: 1,
    // Champs spécifiques Laptop (ILaptopOffer)
    screenSize_in: 15.6,
    processor: 'Intel Core i7 11th Gen',
    ram_gb: 16,
    storageType: 'SSD',
    storageCapacity_gb: 512,
    operatingSystem: 'Windows 11 Pro',
    color: 'Gris sidéral',
  };

  const smartphoneOfferData: CreateOfferInput = {
    productModel: mockProductModelId, // Peut être un autre productModel
    seller: mockSellerId,
    price: 750,
    condition: 'good',
    description: 'iPhone en bon état, quelques micro-rayures',
    images: ['image_phone1.jpg', 'image_phone2.jpg'],
    // Champs spécifiques Smartphone (ISmartphoneOffer)
    screenSize_in: 6.1,
    storageCapacity_gb: 256,
    ram_gb: 6,
    operatingSystem: 'iOS 16',
    color: 'Bleu Pacifique',
  };

  try {
    console.log('Tentative de création d'une offre pour ordinateur portable...');
    const createdLaptop = await createProductOfferService(laptopOfferData, mockLaptopCategoryId);
    console.log('Offre Ordinateur Portable créée :', createdLaptop._id, createdLaptop.kind);

    console.log('\nTentative de création d'une offre pour smartphone...');
    const createdSmartphone = await createProductOfferService(smartphoneOfferData, mockSmartphoneCategoryId);
    console.log('Offre Smartphone créée :', createdSmartphone._id, createdSmartphone.kind);

  } catch (error) {
    console.error('Erreur dans testCreateOffer:', error);
  }
  // await mongoose.disconnect();
}

// testCreateOffer();
*/ 

// Interface pour les filtres de recherche d'offres
export interface OfferFilters {
    category?: string | string[];
    brand?: string | string[];
    condition?: string | string[];
    priceMin?: number;
    priceMax?: number;
    productModelId?: string;
    sellerId?: string;
    transactionStatus?: 'available' | 'reserved' | 'pending_shipment' | 'shipped' | 'delivered' | 'cancelled' | 'sold';
    listingStatus?: 'active' | 'inactive' | 'rejected' | 'sold'; // MODIFIÉ: pending_approval supprimé
    // ... autres filtres potentiels
} 