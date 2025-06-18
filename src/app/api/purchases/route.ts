import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb/dbConnect';
import ProductOfferModel from '@/lib/mongodb/models/SellerProduct';
import ProductModel from '@/lib/mongodb/models/ScrapingProduct';
import UserModel from '@/lib/mongodb/models/User';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // LOGGING: Afficher l'ID utilisé pour la recherche
    console.log(`Purchases API: Fetching purchases for userId: ${userId}`);

    if (!userId) {
        return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    try {
        await dbConnect();

        const purchases = await ProductOfferModel.find({ soldTo: new Types.ObjectId(userId) })
            .populate({
                path: 'productModel',
                model: ProductModel,
                select: 'product.title product.images'
            })
            .populate({
                path: 'seller',
                model: UserModel,
                select: 'name'
            })
            .sort({ updatedAt: -1 })
            .lean();

        // LOGGING: Afficher le nombre de résultats
        console.log(`Purchases API: Found ${purchases.length} purchases for userId: ${userId}`);
        return NextResponse.json(purchases);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        // LOGGING: Afficher les erreurs
        console.error(`Purchases API: Error fetching purchases for userId: ${userId}`, error);
        return NextResponse.json({ message: 'Failed to fetch purchases', error: errorMessage }, { status: 500 });
    }
} 