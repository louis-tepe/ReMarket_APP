import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db.Connect';
import CartModel from '@/models/CartModel';
import ProductOfferModel from '@/models/ProductBaseModel';
import { Types } from 'mongoose';

// Définition locale de ICartItem si non exporté par CartModel
// Cela suppose la structure d'un élément de panier dans un document Mongoose complet.
interface ICartItem {
    _id: Types.ObjectId;
    offer: Types.ObjectId | PopulatedOfferForCartItem; // Peut être ObjectId ou populé
    productModel: Types.ObjectId | PopulatedProductModelForCartItem; // Peut être ObjectId ou populé
    quantity: number;
    // autres champs spécifiques à ICartItem si nécessaire
}

// INTERFACES POUR LE PANIER LEAN ET LES OFFRES LEAN
interface PopulatedSellerForCart {
    _id: Types.ObjectId | string;
    name?: string;
    username?: string;
}

// Interface pour une offre "lean" individuelle, utilisée dans POST
// Définie de manière autonome pour éviter les conflits d'héritage
interface LeanProductOffer {
    _id: Types.ObjectId | string;
    transactionStatus?: string; 
    productModel: Types.ObjectId | string; 
    price: number; 
    // Ajoutez d'autres champs de ProductOfferModel que vous sélectionnez et utilisez effectivement.
    // Par exemple: name, description, seller (si vous le sélectionnez pour cet usage spécifique)
}

interface PopulatedOfferForCartItem {
    _id: Types.ObjectId | string;
    price: number;
    seller: PopulatedSellerForCart;
    // currency?: string; // Décommentez et ajoutez au select si nécessaire
    // condition?: string; // Décommentez et ajoutez au select si nécessaire
}

interface PopulatedProductModelForCartItem {
    _id: Types.ObjectId | string;
    title: string;
    standardImageUrls: string[];
    slug: string;
}

interface LeanCartItem {
    _id: Types.ObjectId | string;
    offer: PopulatedOfferForCartItem;
    productModel: PopulatedProductModelForCartItem;
    quantity: number;
}

interface LeanCart {
    _id: Types.ObjectId | string;
    user: Types.ObjectId | string; 
    items: LeanCartItem[];
    createdAt?: Date; 
    updatedAt?: Date;
}

interface CartActionPayload {
    action?: 'add' | 'remove' | 'update' | 'clear'; // 'add' est par défaut
    offerId?: string; // Requis pour action: 'add'
    productModelId?: string; // Requis pour action: 'add'
    cartItemId?: string; // Requis pour action: 'remove' ou 'update'
    quantity?: number; // Requis pour action: 'add' ou 'update' (pour 'add', 1 par défaut)
}

// GET: Récupérer le panier de l'utilisateur
export async function GET() {
    const session = await getServerSession(authOptions);
    console.log("GET /api/cart - Session récupérée:", JSON.stringify(session, null, 2));
    if (!session || !session.user || !(session.user as { id?: string }).id) {
        console.error("GET /api/cart - Échec auth ou ID utilisateur manquant. Session:", JSON.stringify(session, null, 2));
        return NextResponse.json({ success: false, message: 'Authentification requise.' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    try {
        await dbConnect();
        const cart = await CartModel.findOne({ user: userId })
            .populate({
                path: 'items.offer',
                model: ProductOfferModel,
                select: '_id price seller', // Assurez-vous que cela correspond à PopulatedOfferForCartItem
                populate: {
                    path: 'seller',
                    select: '_id name username' // Assurez-vous que cela correspond à PopulatedSellerForCart
                }
            })
            .populate('items.productModel', '_id title standardImageUrls slug') // Assurez-vous que cela correspond à PopulatedProductModelForCartItem
            .lean<LeanCart | null>(); // Utilisation de LeanCart ici

        if (!cart) {
            return NextResponse.json({ success: true, data: { items: [], count: 0, total: 0 } });
        }

        // Calculer le total et le nombre d'articles directement
        let calculatedTotal = 0;
        let calculatedCount = 0;
        if (cart.items && Array.isArray(cart.items)) { 
            for (const item of cart.items) { 
                if (item.offer && typeof item.offer.price === 'number' && typeof item.quantity === 'number') {
                    calculatedTotal += item.offer.price * item.quantity;
                    calculatedCount += item.quantity;
                }
            }
        }

        return NextResponse.json({ success: true, data: { ...cart, count: calculatedCount, total: calculatedTotal } });

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
    if (!session || !session.user || !(session.user as { id?: string }).id) {
        console.error("POST /api/cart - Échec auth ou ID utilisateur manquant. Session:", JSON.stringify(session, null, 2));
        return NextResponse.json({ success: false, message: 'Authentification requise.' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    try {
        const body = await request.json() as CartActionPayload;
        const { action = 'add', offerId, productModelId, cartItemId, quantity } = body;

        await dbConnect();
        // cart n'est pas .lean() ici, donc il utilise les types Mongoose complets (ICart)
        let cart = await CartModel.findOne({ user: userId }); 

        if (!cart) {
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

                const offer = await ProductOfferModel.findById(offerId)
                    .select('_id transactionStatus productModel price') 
                    .lean<LeanProductOffer | null>();

                if (!offer || offer.transactionStatus !== 'available') {
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
                const itemToRemove = cart.items.find((item: ICartItem) => item._id.equals(cartItemId)); 
                if (!itemToRemove) {
                    return NextResponse.json({ success: false, message: 'Article non trouvé dans le panier.' }, { status: 404 });
                }
                await cart.removeItem(itemToRemove.offer as Types.ObjectId); // Cast si removeItem attend un ObjectId 
                message = 'Article supprimé du panier.';
                break;

            case 'update':
                if (!cartItemId || !Types.ObjectId.isValid(cartItemId) || typeof quantity !== 'number' || quantity <= 0) {
                    return NextResponse.json({ success: false, message: "Données manquantes/invalides pour la mise à jour (ID article, quantité)." }, { status: 400 });
                }
                const itemToUpdateIndex = cart.items.findIndex((item: ICartItem) => item._id.equals(cartItemId));
                if (itemToUpdateIndex === -1) {
                    return NextResponse.json({ success: false, message: 'Article non trouvé pour la mise à jour.' }, { status: 404 });
                }
                cart.items[itemToUpdateIndex].quantity = quantity as number;
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
        
        const finalCartState = await CartModel.findOne({ user: userId })
            .populate({
                path: 'items.offer',
                model: ProductOfferModel,
                select: '_id price seller', // Correspond à PopulatedOfferForCartItem
                populate: {
                    path: 'seller',
                    select: '_id name username' // Correspond à PopulatedSellerForCart
                }
            })
            .populate('items.productModel', '_id title standardImageUrls slug') // Correspond à PopulatedProductModelForCartItem
            .lean<LeanCart | null>(); // Utilisation de LeanCart ici
            
        if (finalCartState && finalCartState.items && Array.isArray(finalCartState.items)) {
            for (const item of finalCartState.items) { // item sera de type LeanCartItem
                if (item.offer && typeof item.offer.price === 'number' && typeof item.quantity === 'number') {
                    total += item.offer.price * item.quantity;
                    count += item.quantity;
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: message, 
            // S'assurer que finalCartState.items existe avant de le spreader, ou fournir un tableau vide
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