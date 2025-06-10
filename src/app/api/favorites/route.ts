import dbConnect from '@/lib/mongodb/dbConnect';
import User from '@/lib/mongodb/models/User';
import ProductModel, { IProductModel } from '@/lib/mongodb/models/ProductModel';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Types } from 'mongoose'; // Importer Types

const isValidObjectId = (id: string): boolean => Types.ObjectId.isValid(id);

// Interface pour un ProductModel populé partiel dans les favoris
interface PopulatedFavoriteProduct extends Pick<IProductModel, '_id' | 'title' | 'slug' | 'standardImageUrls'> {
    sellerOffers?: { price: number }[];
}

// GET - Récupérer les produits favoris de l'utilisateur
export async function GET(req: NextRequest) {
    await dbConnect();
    const token = await getToken({ req });

    if (!token?.sub) { // Vérification concise
        return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }
    const userId = token.sub;

    try {
        const user = await User.findById(userId).populate<{
            favorites: PopulatedFavoriteProduct[]
        }>({
            path: 'favorites',
            model: ProductModel,
            select: 'title slug standardImageUrls sellerOffers', 
        });

        if (!user) {
            return NextResponse.json({ message: 'Utilisateur non trouvé' }, { status: 404 });
        }

        const favoriteProducts = user.favorites.map(fav => {
            if (!fav?._id) return null; 

            const cheapestOfferPrice = fav.sellerOffers?.length 
                ? Math.min(...fav.sellerOffers.map(o => o.price)) 
                : 0;
            
            return {
                id: fav._id.toString(),
                slug: fav.slug || fav._id.toString(),
                name: fav.title,
                imageUrl: fav.standardImageUrls?.[0],
                price: cheapestOfferPrice,
                offerCount: fav.sellerOffers?.length || 0,
            };
        }).filter(Boolean); 

        return NextResponse.json(favoriteProducts, { status: 200 });
    } catch (error) {
        console.error('Erreur GET /api/favorites:', error);
        return NextResponse.json({ message: 'Erreur interne du serveur.' }, { status: 500 });
    }
}


// POST - Ajouter un produit aux favoris
export async function POST(req: NextRequest) {
    await dbConnect();
    const token = await getToken({ req });

    if (!token?.sub) {
        return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }
    const userId = token.sub;

    try {
        const { productId } = await req.json();

        if (!productId || !isValidObjectId(productId)) {
            return NextResponse.json({ message: 'ID de produit invalide.' }, { status: 400 });
        }

        const productObjectId = new Types.ObjectId(productId);

        const productExists = await ProductModel.findById(productObjectId).lean(); // .lean() pour performance
        if (!productExists) {
            return NextResponse.json({ message: 'Produit non trouvé.' }, { status: 404 });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { favorites: productObjectId } }, 
            { new: true }
        ).lean(); // .lean() si on ne retourne que les IDs des favoris

        if (!updatedUser) {
            return NextResponse.json({ message: 'Utilisateur non trouvé.' }, { status: 404 });
        }
        // Retourner seulement les IDs ou un message de succès simple
        return NextResponse.json({ message: 'Produit ajouté aux favoris.', favoriteIds: updatedUser.favorites }, { status: 200 });
    } catch (error) {
        console.error('Erreur POST /api/favorites:', error);
        return NextResponse.json({ message: 'Erreur interne du serveur.' }, { status: 500 });
    }
}

// DELETE - Retirer un produit des favoris
export async function DELETE(req: NextRequest) {
    await dbConnect();
    const token = await getToken({ req });

    if (!token?.sub) {
        return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }
    const userId = token.sub;

    try {
        const { searchParams } = new URL(req.url);
        const productId = searchParams.get('productId');
        
        if (!productId || !isValidObjectId(productId)) {
            return NextResponse.json({ message: 'ID de produit invalide.' }, { status: 400 });
        }
        
        const productObjectId = new Types.ObjectId(productId);

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $pull: { favorites: productObjectId } },
            { new: true }
        ).lean(); // .lean() si on ne retourne que les IDs des favoris

        if (!updatedUser) {
            return NextResponse.json({ message: 'Utilisateur non trouvé.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Produit retiré des favoris.', favoriteIds: updatedUser.favorites }, { status: 200 });
    } catch (error) {
        console.error('Erreur DELETE /api/favorites:', error);
        return NextResponse.json({ message: 'Erreur interne du serveur.' }, { status: 500 });
    }
} 