import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db.Connect';
// Importé pour enregistrement Mongoose, nécessaire pour les opérations .populate()
import '@/models/BrandModel'; 
import '@/models/CategoryModel';
import ProductModel, { IProductModel } from '@/models/ProductModel';
import ProductOfferModel, { IProductBase } from '@/models/ProductBaseModel';
import UserModel from '@/models/User';
import { Types, FilterQuery } from 'mongoose';
// import SellerProduct, { ISellerProduct } from '@/models/SellerProduct';
// import ScrapedProduct, { IScrapedProduct } from '@/models/ScrapedProduct';

// Les types simulés et MOCK_PRODUCT_DATA ont été supprimés car non utilisés.

// Définition du type pour le vendeur peuplé
type PopulatedSellerType = {
  _id: Types.ObjectId;
  name?: string;
  username?: string;
};

// Interface pour une offre avec vendeur peuplé
interface IOfferWithPopulatedSeller extends Omit<IProductBase, 'seller' | '_id'> {
  _id: Types.ObjectId;
  seller: PopulatedSellerType;
}

// Interface pour ProductModel avec brand et category peuplés
interface IProductModelPopulated extends Omit<IProductModel, 'brand' | 'category'> {
  brand: { _id?: Types.ObjectId; name: string; slug: string; };
  category: { _id?: Types.ObjectId; name: string; slug: string; };
}

export async function GET(
    request: NextRequest,
    { params }: { params: { productslug: string } } // Paramètre renommé pour correspondre au dossier
) {
    await dbConnect();
    const { productslug } = params; // Utilisation de productslug

    try {
        let query: FilterQuery<IProductModel>;
        if (Types.ObjectId.isValid(productslug)) {
            query = { _id: new Types.ObjectId(productslug) };
        } else {
            query = { slug: productslug };
        }

        const productModel = await ProductModel.findOne(query)
            .populate('brand', 'name slug')
            .populate('category', 'name slug')
            .lean() as IProductModelPopulated | null; // Utilisation du type populé

        if (!productModel) {
            return NextResponse.json({ message: "Produit modèle non trouvé" }, { status: 404 });
        }

        const offersFromDB = await ProductOfferModel.find({ 
            productModel: productModel._id, 
            transactionStatus: 'available',
            listingStatus: 'active' // Ajout du filtre listingStatus
        })
        .populate({
            path: 'seller',
            select: 'name username _id', // Assurer que _id est inclus pour l'ID du vendeur
            model: UserModel
        })
        .sort({ price: 1 })
        .lean() as IOfferWithPopulatedSeller[]; // Utilisation du type populé pour les offres

        const productData = {
            id: productModel._id.toString(),
            slug: productModel.slug || productModel._id.toString(), // Fallback au cas où le slug est vide
            title: productModel.title,
            brand: {
                name: productModel.brand?.name || 'Marque inconnue',
                slug: productModel.brand?.slug || ''
            },
            category: {
                name: productModel.category?.name || 'Catégorie inconnue',
                slug: productModel.category?.slug || ''
            },
            standardDescription: productModel.standardDescription || '',
            standardImageUrls: productModel.standardImageUrls || [],
            keyFeatures: productModel.keyFeatures || [],
            specifications: productModel.specifications || [],
            offers: offersFromDB.map(offer => {
                // Le cast n'est plus nécessaire grâce à IOfferWithPopulatedSeller
                return {
                    id: offer._id.toString(),
                    seller: {
                        id: offer.seller?._id?.toString(),
                        name: offer.seller?.name || offer.seller?.username || 'Vendeur ReMarket'
                    },
                    price: offer.price,
                    currency: offer.currency,
                    quantity: offer.stockQuantity,
                    condition: offer.condition,
                    sellerDescription: offer.description,
                    sellerPhotos: offer.images,
                };
            }),
        };

        return NextResponse.json(productData);

    } catch (error) {
        // console.error(`[API /api/products/${productslug}] Error fetching product:`, error);
        return NextResponse.json({ message: "Erreur serveur lors de la récupération du produit." }, { status: 500 });
    }
} 