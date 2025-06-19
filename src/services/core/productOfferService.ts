import CategoryModel, { ICategory } from '@/lib/mongodb/models/CategoryModel';
import ProductOfferModel, { IProductBase } from '@/lib/mongodb/models/SellerProduct';
import { getKindFromSlug, ProductKind } from '@/config/discriminatorMapping';
import { Types } from 'mongoose';

// Interface de base pour les données d'une offre attendues en entrée.
interface BaseOfferData {
  productModel: number | string;
  seller: Types.ObjectId | string;
  price: number;
  currency?: string;
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  description: string;
  images: string[];
  stockQuantity?: number;
  listingStatus?: 'pending_approval' | 'active' | 'inactive' | 'rejected' | 'sold';
}

// Interface pour les données spécifiques au type de produit (discriminator).
interface SpecificOfferData { 
  [key: string]: unknown; 
}

// Type combiné pour la création d'une offre.
export type CreateOfferInput = BaseOfferData & SpecificOfferData;

/**
 * Crée une nouvelle offre de produit en utilisant les discriminateurs Mongoose.
 * Le 'kind' de produit est déterminé dynamiquement à partir du slug de la catégorie.
 */
export async function createProductOfferService(
  offerData: CreateOfferInput,
  categoryId: Types.ObjectId | string
): Promise<IProductBase> {
  const category: ICategory | null = await CategoryModel.findById(categoryId);

  if (!category) {
    throw new Error(`Catégorie introuvable pour l'ID: ${categoryId}.`);
  }
  if (!category.isLeafNode) {
    throw new Error(`La catégorie '${category.name}' n'est pas une catégorie feuille.`);
  }

  const kind: ProductKind | undefined = getKindFromSlug(category.slug);
  if (!kind) {
    throw new Error(
      `Aucun 'kind' de produit trouvé pour le slug de catégorie: '${category.slug}'. Vérifiez la configuration des discriminateurs.`
    );
  }

  const fullOfferData = {
    ...offerData,
    category: category._id,
    kind: kind, // Mongoose utilise ce champ pour choisir le schéma discriminateur approprié.
  };

  const newProductOffer = new ProductOfferModel(fullOfferData);
  
  try {
    await newProductOffer.save();
    console.log(`Offre (kind: ${kind}) créée avec succès: ${newProductOffer._id}`);
    return newProductOffer;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la nouvelle offre:', error);
    // Propager l'erreur pour une gestion centralisée ou spécifique en amont.
    throw error; 
  }
}

// Interface pour les filtres de recherche d'offres.
export interface OfferFilters {
    category?: string | string[];
    brand?: string | string[];
    condition?: string | string[];
    priceMin?: number;
    priceMax?: number;
    productModelId?: number | string;
    sellerId?: string;
    transactionStatus?: 'available' | 'reserved' | 'pending_shipment' | 'shipped' | 'delivered' | 'cancelled' | 'sold';
    listingStatus?: 'active' | 'inactive' | 'rejected' | 'sold'; // 'pending_approval' a été retiré car géré par d'autres mécanismes.
    // Autres filtres potentiels peuvent être ajoutés ici.
} 

export async function getOffer(offerId: string): Promise<IProductBase | null> {
  if (!Types.ObjectId.isValid(offerId)) {
    return null;
  }
  return await ProductOfferModel.findById(offerId).lean<IProductBase>();
} 