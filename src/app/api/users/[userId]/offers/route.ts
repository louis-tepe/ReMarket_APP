import { NextRequest, NextResponse } from 'next/server';
 import ProductOfferModel, { IProductBase, IShippingInfo } from '@/lib/mongodb/models/SellerProduct';
import ProductModel, { IScrapedProduct } from '@/lib/mongodb/models/ScrapingProduct';
import dbConnect from '@/lib/mongodb/dbConnect';
import { Types } from 'mongoose';
import { LeanBrand } from '@/types/brand';
import { LeanCategory } from '@/types/category';

interface PopulatedProductModel extends Omit<IScrapedProduct, 'brand' | 'category'> {
    brand?: LeanBrand;
    category: LeanCategory;
}

interface PopulatedOffer extends Omit<IProductBase, 'productModel' | 'shippingInfo'> {
    productModel: PopulatedProductModel;
    shippingInfo?: IShippingInfo; // Le shippingInfo est optionnel
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    const { userId } = await params;

    if (!userId || !Types.ObjectId.isValid(userId)) {
        return NextResponse.json({ message: "ID d'utilisateur invalide." }, { status: 400 });
    }

    try {
        await dbConnect();

        const offers: PopulatedOffer[] = await ProductOfferModel.find({ seller: userId })
            .populate({
                path: 'productModel',
                model: ProductModel,
                populate: [
                    { path: 'brand', select: 'name slug' },
                    { path: 'category', select: 'name slug' }
                ]
            })
            .sort({ createdAt: -1 }) // Trier par date de création
            .lean<PopulatedOffer[]>();

        if (!offers || offers.length === 0) {
            return NextResponse.json([], { status: 200 });
        }
        
        return NextResponse.json(offers);

    } catch (error) {
        console.error("Erreur lors de la récupération des offres du vendeur:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}