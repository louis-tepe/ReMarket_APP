import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import User from '@/models/User';
import ProductModel, { IProductModel } from '@/models/ProductModel'; // Assurez-vous que le chemin est correct
import dbConnect from '@/lib/db.Connect';
import mongoose from 'mongoose';

// Helper pour s'assurer qu'un ID est un ObjectId valide
const isValidObjectId = (id: string): boolean => mongoose.Types.ObjectId.isValid(id);

// GET - Récupérer les produits favoris de l'utilisateur
export async function GET(req: NextRequest) {
    await dbConnect();
    const token = await getToken({ req });

    if (!token || !token.sub) {
        return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    try {
        const user = await User.findById(token.sub).populate({
            path: 'favorites',
            model: ProductModel, // Spécifiez le modèle ici
            // Optionnel: sélectionnez les champs que vous voulez pour chaque produit favori
            // select: 'title slug standardImageUrls sellerOffers', 
        });

        if (!user) {
            return NextResponse.json({ message: 'Utilisateur non trouvé' }, { status: 404 });
        }

        // Transformer les favoris pour correspondre à ProductCardProps
        const favoriteProducts = user.favorites.map((favInput: unknown) => {
            // Assurez-vous que fav est un document populé et du bon type
            const fav = favInput as (IProductModel & { sellerOffers?: { price: number }[] });

            if (!fav || !fav._id) return null; // ou gérer l'erreur/filtrer

            const offers = fav.sellerOffers || [];
            const cheapestOffer = offers.length > 0
                ? offers.reduce((minOffer: { price: number }, currentOffer: { price: number }) => 
                    currentOffer.price < minOffer.price ? currentOffer : minOffer, 
                  offers[0])
                : null;
            
            return {
                id: fav._id.toString(),
                slug: fav.slug || fav._id.toString(), // Utiliser slug ou _id
                name: fav.title,
                imageUrl: fav.standardImageUrls && fav.standardImageUrls.length > 0 ? fav.standardImageUrls[0] : undefined,
                price: cheapestOffer ? cheapestOffer.price : 0, // Prix de l'offre la moins chère
                offerCount: offers.length, // Nombre d'offres
                // isFavorite: true, // On sait qu'ils sont favoris ici
            };
        }).filter(Boolean); // Retirer les nuls si certains favoris n'ont pas pu être populés correctement

        return NextResponse.json(favoriteProducts, { status: 200 });
    } catch (error) {
        console.error('Erreur lors de la récupération des favoris:', error);
        return NextResponse.json({ message: 'Erreur interne du serveur' }, { status: 500 });
    }
}


// POST - Ajouter un produit aux favoris
export async function POST(req: NextRequest) {
    await dbConnect();
    const token = await getToken({ req });

    if (!token || !token.sub) {
        return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    try {
        const { productId } = await req.json();

        if (!productId || !isValidObjectId(productId)) {
            return NextResponse.json({ message: 'ID de produit invalide' }, { status: 400 });
        }

        const productObjectId = new mongoose.Types.ObjectId(productId);

        // Vérifier si le produit existe (optionnel mais recommandé)
        const productExists = await ProductModel.findById(productObjectId);
        if (!productExists) {
            return NextResponse.json({ message: 'Produit non trouvé' }, { status: 404 });
        }

        const user = await User.findByIdAndUpdate(
            token.sub,
            { $addToSet: { favorites: productObjectId } }, // $addToSet évite les doublons
            { new: true }
        );

        if (!user) {
            return NextResponse.json({ message: 'Utilisateur non trouvé' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Produit ajouté aux favoris', favorites: user.favorites }, { status: 200 });
    } catch (error) {
        console.error('Erreur lors de l\'ajout aux favoris:', error);
        return NextResponse.json({ message: 'Erreur interne du serveur' }, { status: 500 });
    }
}

// DELETE - Retirer un produit des favoris
export async function DELETE(req: NextRequest) {
    await dbConnect();
    const token = await getToken({ req });

    if (!token || !token.sub) {
        return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    try {
        // Obtenir productId depuis les query params pour DELETE
        const { searchParams } = new URL(req.url);
        const productId = searchParams.get('productId');
        
        if (!productId || !isValidObjectId(productId)) {
            return NextResponse.json({ message: 'ID de produit invalide dans les paramètres' }, { status: 400 });
        }
        
        const productObjectId = new mongoose.Types.ObjectId(productId);

        const user = await User.findByIdAndUpdate(
            token.sub,
            { $pull: { favorites: productObjectId } },
            { new: true }
        );

        if (!user) {
            return NextResponse.json({ message: 'Utilisateur non trouvé lors de la suppression du favori' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Produit retiré des favoris', favorites: user.favorites }, { status: 200 });
    } catch (error) {
        console.error('Erreur lors de la suppression du favori:', error);
        return NextResponse.json({ message: 'Erreur interne du serveur lors de la suppression du favori' }, { status: 500 });
    }
} 