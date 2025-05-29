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
  _id: Types.ObjectId; // S'assurer que _id est un ObjectId ici
  brand: { _id?: Types.ObjectId; name: string; slug: string; };
  category: { _id?: Types.ObjectId; name: string; slug: string; };
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ productslug: string }> } 
) {
    await dbConnect();
    const { productslug } = await params; 

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
            .lean<IProductModelPopulated | null>(); 

        if (!productModel) {
            return NextResponse.json({ message: "Produit modèle non trouvé" }, { status: 404 });
        }

        const offersFromDB = await ProductOfferModel.find({ 
            productModel: productModel._id, 
            transactionStatus: 'available',
            listingStatus: 'active' 
        })
        .populate<{ seller: PopulatedSellerType }>({
            path: 'seller',
            select: 'name username _id', 
            model: UserModel
        })
        .sort({ price: 1 })
        .lean<IOfferWithPopulatedSeller[]>(); 

        const productData = {
            id: productModel._id.toString(),
            slug: productModel.slug || productModel._id.toString(), 
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
        console.error(`[API /api/products/${productslug}] Error fetching product:`, error);
        return NextResponse.json({ message: "Erreur serveur lors de la récupération du produit." }, { status: 500 });
    }
} 