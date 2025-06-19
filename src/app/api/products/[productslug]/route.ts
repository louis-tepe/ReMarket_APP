import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/mongodb/dbConnect';
// Importé pour enregistrement Mongoose, nécessaire pour les opérations .populate()
import '@/lib/mongodb/models/BrandModel'; 
import '@/lib/mongodb/models/CategoryModel';
import ProductModel, { IProductModel } from '@/lib/mongodb/models/ScrapingProduct';
import ProductOfferModel, { IProductBase } from '@/lib/mongodb/models/SellerProduct';
import UserModel from '@/lib/mongodb/models/User';
import { Types, FilterQuery } from 'mongoose';
// import { LeanProductModel } from '@/types/product';
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
  _id: Types.ObjectId; // L'_id est un ObjectId
  brand: { _id?: Types.ObjectId; name: string; slug: string; };
  category: { _id?: Types.ObjectId; name: string; slug: string; };
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ productslug: string }> } 
) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const { productslug } = await params; 

    try {
        let query: FilterQuery<IProductModel>;
        const potentialId = parseInt(productslug, 10);

        if (!isNaN(potentialId)) {
            // Recherche par l'ID numérique externe si c'est un nombre
            query = { "product.id": potentialId };
        } else {
            // Sinon, recherche par le slug
            query = { slug: productslug };
        }

        const productModel = await ProductModel.findOne(query)
            .populate('brand', 'name slug')
            .populate('category', 'name slug')
            .lean<IProductModelPopulated | null>(); 

        if (!productModel) {
            return NextResponse.json({ message: "Produit modèle non trouvé" }, { status: 404 });
        }

        const offersQuery: FilterQuery<IProductBase> = { 
            productModel: productModel._id, // Utilise le vrai _id de MongoDB
            transactionStatus: 'available',
            listingStatus: 'active' 
        };

        if (userId) {
            offersQuery.seller = { $ne: new Types.ObjectId(userId) };
        }

        const offersFromDB = await ProductOfferModel.find(offersQuery)
        .populate<{ seller: PopulatedSellerType }>({
            path: 'seller',
            select: 'name username _id', 
            model: UserModel
        })
        .sort({ price: 1 })
        .lean<IOfferWithPopulatedSeller[]>(); 

        const specifications = productModel.specifications
            ? Object.entries(productModel.specifications).flatMap(([category, specsObject]) => {
                if (typeof specsObject !== 'object' || specsObject === null) return [];
                return Object.entries(specsObject).map(([label, value]) => ({
                    label: `${category} > ${label}`,
                    value: String(value),
                }));
            })
            : [];

        const optionChoicesLedenicheur = productModel.options
            ? Object.entries(productModel.options).map(([optionName, availableValues]) => ({
                optionName,
                availableValues
              }))
            : [];

        const priceNewLedenicheur = productModel.price_analysis?.['3_months']?.average_price;

        const productData = {
            _id: productModel._id.toString(), // Assure-toi que c'est le _id de MongoDB
            slug: productModel.slug || productModel._id.toString(), 
            title: productModel.product.title,
            brand: {
                name: productModel.brand?.name || productModel.product.brand || 'Marque inconnue',
                slug: productModel.brand?.slug || ''
            },
            category: {
                name: productModel.category?.name || 'Catégorie inconnue',
                slug: productModel.category?.slug || ''
            },
            standardDescription: productModel.product.description || '',
            standardImageUrls: productModel.product.images || [],
            keyFeatures: [], // Donnée non disponible depuis le scraper pour l'instant
            specifications: specifications,
            offers: offersFromDB.map(offer => {
                return {
                    _id: offer._id.toString(),
                    seller: {
                        _id: offer.seller?._id?.toString(),
                        name: offer.seller?.name || offer.seller?.username || 'Vendeur ReMarket'
                    },
                    price: offer.price,
                    currency: offer.currency,
                    stockQuantity: offer.stockQuantity,
                    condition: offer.condition,
                    transactionStatus: offer.transactionStatus,
                    description: offer.description,
                    images: offer.images,
                };
            }),
            sourceUrlLedenicheur: productModel.product.url,
            priceNewLedenicheur: priceNewLedenicheur,
            optionChoicesLedenicheur: optionChoicesLedenicheur,
        };

        return NextResponse.json(productData);

    } catch (error) {
        console.error(`[API /api/products/${productslug}] Error fetching product:`, error);
        return NextResponse.json({ message: "Erreur serveur lors de la récupération du produit." }, { status: 500 });
    }
} 