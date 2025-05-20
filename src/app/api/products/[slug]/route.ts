import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db.Connect';
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

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    await dbConnect();
    const { slug: slugOrId } = await params;

    try {
        let query: FilterQuery<IProductModel>;
        if (Types.ObjectId.isValid(slugOrId)) {
            query = { _id: new Types.ObjectId(slugOrId) };
        } else {
            query = { slug: slugOrId };
        }

        const productModel = await ProductModel.findOne(query)
            .populate('brand', 'name slug')
            .populate('category', 'name slug')
            .lean() as IProductModel | null;

        if (!productModel) {
            return NextResponse.json({ message: "Produit modèle non trouvé" }, { status: 404 });
        }

        const offersFromDB = await ProductOfferModel.find({ 
            productModel: productModel._id, 
            transactionStatus: 'available'
        })
        .populate({
            path: 'seller',
            select: 'name username _id',
            model: UserModel
        })
        .sort({ price: 1 })
        .lean() as unknown as IProductBase[];

        const productData = {
            id: productModel._id.toString(),
            slug: productModel.slug || productModel._id.toString(),
            title: productModel.title,
            brand: {
                name: (productModel.brand as { name?: string, slug?: string })?.name || 'Marque inconnue',
                slug: (productModel.brand as { name?: string, slug?: string })?.slug || ''
            },
            category: {
                name: (productModel.category as { name?: string, slug?: string })?.name || 'Catégorie inconnue',
                slug: (productModel.category as { name?: string, slug?: string })?.slug || ''
            },
            standardDescription: productModel.standardDescription || '',
            standardImageUrls: productModel.standardImageUrls || [],
            keyFeatures: productModel.keyFeatures || [],
            specifications: productModel.specifications || [],
            offers: offersFromDB.map(offer => {
                const populatedSeller = offer.seller as unknown as PopulatedSellerType;
                return {
                    id: (offer._id as Types.ObjectId).toString(),
                    seller: {
                        id: populatedSeller?._id?.toString(),
                        name: populatedSeller?.name || populatedSeller?.username || 'Vendeur ReMarket'
                    },
                    price: offer.price,
                    currency: offer.currency,
                    stockQuantity: offer.stockQuantity,
                    condition: offer.condition,
                    description: offer.description,
                    images: offer.images,
                };
            }),
        };

        return NextResponse.json(productData);

    } catch (error) {
        console.error(`[API /api/products/${slugOrId}] Error fetching product:`, error);
        return NextResponse.json({ message: "Erreur serveur lors de la récupération du produit." }, { status: 500 });
    }
} 