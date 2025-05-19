import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Ajustez le chemin si nécessaire
import dbConnect from '@/lib/db.Connect';
import CartModel, { ICart } from '@/models/CartModel';
import OfferModel, { IOffer } from '@/models/OfferModel';
import ProductModel from '@/models/ProductModel'; // Pour valider productModelId
import { Types } from 'mongoose';

interface CartActionPayload {
    action?: 'add' | 'remove' | 'update' | 'clear'; // 'add' est par défaut
    offerId?: string; // Requis pour action: 'add'
    productModelId?: string; // Requis pour action: 'add'
    cartItemId?: string; // Requis pour action: 'remove' ou 'update'
    quantity?: number; // Requis pour action: 'add' ou 'update' (pour 'add', 1 par défaut)
}

// GET: Récupérer le panier de l'utilisateur
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    console.log("GET /api/cart - Session récupérée:", JSON.stringify(session, null, 2));
    if (!session || !session.user || !(session.user as any).id) {
        console.error("GET /api/cart - Échec auth ou ID utilisateur manquant. Session:", JSON.stringify(session, null, 2));
        return NextResponse.json({ success: false, message: 'Authentification requise.' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    try {
        await dbConnect();
        const cart = await CartModel.findOne({ user: userId })
            .populate({
                path: 'items.offer',
                model: OfferModel,
                populate: {
                    path: 'seller',
                    select: 'name username' // Champs du vendeur à peupler
                }
            })
            .populate('items.productModel', 'title standardImageUrls slug') // Populate product details
            .lean();

        if (!cart) {
            return NextResponse.json({ success: true, data: { items: [], count: 0, total: 0 } });
        }

        // Calculer le total et le nombre d'articles
        let total = 0;
        let count = 0;
        if (cart.items) {
            for (const item of cart.items) {
                if (item.offer && typeof item.offer.price === 'number' && typeof item.quantity === 'number') {
                    total += item.offer.price * item.quantity;
                    count += item.quantity;
                }
            }
        }

        return NextResponse.json({ success: true, data: { ...cart, count, total } });

    } catch (error) {
        console.error('[API_CART_GET]', error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
        return NextResponse.json({ success: false, message: 'Erreur serveur lors de la récupération du panier.', error: errorMessage }, { status: 500 });
    }
}

// POST: Gérer les actions sur le panier (ajouter, supprimer, mettre à jour)
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    console.log("POST /api/cart - Session récupérée:", JSON.stringify(session, null, 2));
    if (!session || !session.user || !(session.user as any).id) {
        console.error("POST /api/cart - Échec auth ou ID utilisateur manquant. Session:", JSON.stringify(session, null, 2));
        return NextResponse.json({ success: false, message: 'Authentification requise.' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    try {
        const body = await request.json() as CartActionPayload;
        const { action = 'add', offerId, productModelId, cartItemId, quantity } = body;

        await dbConnect();
        let cart = await CartModel.findOne({ user: userId });

        if (!cart) {
            // Si aucune action ne peut créer un panier (comme remove/update sur un panier inexistant), retourner une erreur ou créer un panier vide.
            if (action === 'add') {
                cart = new CartModel({ user: userId, items: [] });
            } else {
                return NextResponse.json({ success: false, message: 'Panier non trouvé.' }, { status: 404 });
            }
        }

        let message = '';

        switch (action) {
            case 'add':
                if (!offerId || !Types.ObjectId.isValid(offerId) || !productModelId || !Types.ObjectId.isValid(productModelId)) {
                    return NextResponse.json({ success: false, message: 'ID offre ou produit manquant/invalide pour l\'ajout.' }, { status: 400 });
                }
                const currentQuantity = quantity === undefined ? 1 : quantity;
                if (typeof currentQuantity !== 'number' || currentQuantity <= 0) {
                    return NextResponse.json({ success: false, message: 'Quantité invalide pour l\'ajout.' }, { status: 400 });
                }

                const offer = await OfferModel.findById(offerId).lean();
                if (!offer || offer.status !== 'available') {
                    return NextResponse.json({ success: false, message: 'Offre non disponible ou introuvable.' }, { status: 404 });
                }
                if (!offer.productModel || offer.productModel.toString() !== productModelId) {
                    return NextResponse.json({ success: false, message: 'L\'offre ne correspond pas au produit spécifié.' }, { status: 400 });
                }
                await cart.addItem({ offerId, productModelId, quantity: currentQuantity });
                message = 'Article ajouté/mis à jour dans le panier.';
                break;

            case 'remove':
                if (!cartItemId || !Types.ObjectId.isValid(cartItemId)) {
                    return NextResponse.json({ success: false, message: 'ID de l\'article du panier manquant/invalide pour la suppression.' }, { status: 400 });
                }
                // La méthode removeItem dans CartModel.ts doit être adaptée pour utiliser cartItemId si ce n'est pas déjà le cas
                // Pour l'instant, on suppose qu'elle prend offerId. Si elle prend cartItemId, c'est mieux.
                // Recherche de l'item pour obtenir l'offerId si removeItem se base sur offerId
                const itemToRemove = cart.items.find(item => item._id.equals(cartItemId));
                if (!itemToRemove) {
                    return NextResponse.json({ success: false, message: 'Article non trouvé dans le panier.' }, { status: 404 });
                }
                await cart.removeItem(itemToRemove.offer); // Supposant que removeItem prend offerId
                // Si CartModel.removeItem prend cartItemId, ce serait : await cart.removeItem(cartItemId);
                message = 'Article supprimé du panier.';
                break;

            case 'update':
                if (!cartItemId || !Types.ObjectId.isValid(cartItemId) || typeof quantity !== 'number' || quantity <= 0) {
                    return NextResponse.json({ success: false, message: "Données manquantes/invalides pour la mise à jour (ID article, quantité)." }, { status: 400 });
                }
                const itemToUpdateIndex = cart.items.findIndex(item => item._id.equals(cartItemId));
                if (itemToUpdateIndex === -1) {
                    return NextResponse.json({ success: false, message: 'Article non trouvé pour la mise à jour.' }, { status: 404 });
                }
                cart.items[itemToUpdateIndex].quantity = quantity;
                await cart.save(); 
                message = 'Quantité de l\'article mise à jour.';
                break;

            case 'clear':
                await cart.clearCart();
                message = 'Panier vidé avec succès.';
                break;

            default:
                return NextResponse.json({ success: false, message: 'Action non reconnue.' }, { status: 400 });
        }

        // Recalculer le total et le nombre d'articles pour la réponse
        let total = 0;
        let count = 0;
        // Il est important de re-fetch ou de s'assurer que `cart` est l'état le plus récent après la modification.
        // Utiliser lean() seulement si on ne modifie plus l'instance de cart ensuite.
        const finalCartState = await CartModel.findOne({ user: userId })
            .populate('items.offer', 'price') // Seulement le prix est nécessaire pour le calcul
            .populate('items.productModel', 'title standardImageUrls slug') // Pour un retour complet si besoin
            .lean();
            
        if (finalCartState && finalCartState.items) {
            for (const item of finalCartState.items) {
                if (item.offer && typeof item.offer.price === 'number' && typeof item.quantity === 'number') {
                    total += item.offer.price * item.quantity;
                    count += item.quantity;
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: message, 
            data: { items: finalCartState?.items || [], count, total } 
        }, { status: 200 });

    } catch (error) {
        console.error('[API_CART_POST]', error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
        return NextResponse.json({ success: false, message: 'Erreur serveur lors de l\'action sur le panier.', error: errorMessage }, { status: 500 });
    }
}

// TODO: Ajouter une méthode DELETE pour supprimer un article spécifique du panier
// (par exemple, en passant l'offerId dans les query params ou le body) 