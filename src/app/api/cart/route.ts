import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/mongodb/dbConnect';
import CartModel, { ICart } from '@/lib/mongodb/models/CartModel';
import ProductOfferModel from '@/lib/mongodb/models/ProductBaseModel';
import { Types } from 'mongoose';

// INTERFACES POUR LE PANIER LEAN ET LES OFFRES LEAN
interface PopulatedSellerForCart {
    _id: Types.ObjectId | string;
    name?: string;
    username?: string;
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

// Helper pour calculer le total et le nombre d'articles
function calculateCartTotals(items: LeanCartItem[] | ICart['items']) {
    let total = 0;
    let count = 0;
    if (items && Array.isArray(items)) { 
        for (const item of items) {
            // S'assurer que item.offer est bien populé et a un prix
            const offerPrice = (item.offer as PopulatedOfferForCartItem)?.price; 
            if (offerPrice && typeof item.quantity === 'number') {
                total += offerPrice * item.quantity;
                count += item.quantity;
            }
        }
    }
    return { total, count };
}

// GET: Récupérer le panier de l'utilisateur
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, message: 'Authentification requise.' }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        await dbConnect();
        const cart = await CartModel.findOne({ user: userId })
            .populate<{ items: { offer: PopulatedOfferForCartItem, productModel: PopulatedProductModelForCartItem }[] }>([
                {
                    path: 'items.offer',
                    model: ProductOfferModel,
                    select: '_id price seller',
                    populate: { path: 'seller', select: '_id name username' }
                },
                { path: 'items.productModel', select: '_id title standardImageUrls slug' }
            ])
            .lean<LeanCart | null>();

        if (!cart || !cart.items) {
            return NextResponse.json({ success: true, data: { items: [], count: 0, total: 0 } });
        }

        const { total, count } = calculateCartTotals(cart.items);
        return NextResponse.json({ success: true, data: { ...cart, count, total } });

    } catch (error) {
        console.error('[API_CART_GET]', error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
        return NextResponse.json({ success: false, message: 'Erreur serveur lors de la récupération du panier.', error: errorMessage }, { status: 500 });
    }
}

// POST: Gérer les actions sur le panier
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, message: 'Authentification requise.' }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        const body = await request.json() as CartActionPayload;
        const { action = 'add', offerId, productModelId, cartItemId, quantity } = body;

        await dbConnect();
        let cart = await CartModel.findOne({ user: userId }); 

        if (!cart) {
            if (action === 'add') {
                cart = new CartModel({ user: userId, items: [] });
            } else {
                // Pour les actions autres que 'add', un panier doit exister.
                return NextResponse.json({ success: false, message: 'Panier non trouvé pour effectuer cette action.' }, { status: 404 });
            }
        }

        let message = '';

        switch (action) {
            case 'add':
                if (!offerId || !Types.ObjectId.isValid(offerId) || !productModelId || !Types.ObjectId.isValid(productModelId)) {
                    return NextResponse.json({ success: false, message: 'ID offre ou produit manquant/invalide.' }, { status: 400 });
                }
                const addQuantity = quantity === undefined ? 1 : quantity;
                if (typeof addQuantity !== 'number' || addQuantity <= 0) {
                    return NextResponse.json({ success: false, message: 'Quantité invalide.' }, { status: 400 });
                }

                const offerToAdd = await ProductOfferModel.findById(offerId)
                    .select('_id transactionStatus productModel price stockQuantity')
                    .lean<{ _id: Types.ObjectId, transactionStatus: string, productModel: Types.ObjectId, price: number, stockQuantity: number } | null>();

                if (!offerToAdd) {
                    return NextResponse.json({ success: false, message: 'Offre introuvable.' }, { status: 404 });
                }
                if (offerToAdd.transactionStatus !== 'available' || offerToAdd.stockQuantity < 1) {
                    return NextResponse.json({ success: false, message: 'Cette offre n\'est plus disponible.' }, { status: 404 });
                }
                if (offerToAdd.productModel.toString() !== productModelId) {
                    return NextResponse.json({ success: false, message: 'L\'offre ne correspond pas au produit.' }, { status: 400 });
                }
                await cart.addItem({ offerId, productModelId, quantity: addQuantity });
                message = 'Article ajouté/mis à jour.';
                break;

            case 'remove':
                if (!cartItemId || !Types.ObjectId.isValid(cartItemId)) {
                    return NextResponse.json({ success: false, message: 'ID d\'article invalide.' }, { status: 400 });
                }
                // S'assurer que cart n'est pas null ici, ce qui est géré par la vérification initiale
                const itemToRemove = cart!.items.find(item => item._id.equals(cartItemId)); 
                if (!itemToRemove) {
                    return NextResponse.json({ success: false, message: 'Article non trouvé.' }, { status: 404 });
                }
                await cart!.removeItem(cartItemId);
                message = 'Article supprimé.';
                break;

            case 'update':
                if (!cartItemId || !Types.ObjectId.isValid(cartItemId) || typeof quantity !== 'number' || quantity <= 0) {
                    return NextResponse.json({ success: false, message: "Données invalides pour la mise à jour." }, { status: 400 });
                }
                // S'assurer que cart n'est pas null
                const itemToUpdate = cart!.items.find(item => item._id.equals(cartItemId));
                if (!itemToUpdate) {
                    return NextResponse.json({ success: false, message: 'Article non trouvé pour mise à jour.' }, { status: 404 });
                }
                
                // Check stock for update
                const offerForUpdate = await ProductOfferModel.findById(itemToUpdate.offer)
                    .select('stockQuantity transactionStatus')
                    .lean<{ stockQuantity: number, transactionStatus: string } | null>();

                if (!offerForUpdate || offerForUpdate.transactionStatus !== 'available' || offerForUpdate.stockQuantity < quantity) {
                    return NextResponse.json({ success: false, message: 'Stock insuffisant ou offre non disponible.' }, { status: 400 });
                }
                
                itemToUpdate.quantity = quantity;
                await cart!.save();
                message = 'Quantité mise à jour.';
                break;

            case 'clear':
                // S'assurer que cart n'est pas null
                await cart!.clearCart();
                message = 'Panier vidé.';
                break;

            default:
                return NextResponse.json({ success: false, message: 'Action non reconnue.' }, { status: 400 });
        }
        
        // Récupérer l'état final du panier pour la réponse
        const finalCartState = await CartModel.findOne({ user: userId })
            .populate<{ items: { offer: PopulatedOfferForCartItem, productModel: PopulatedProductModelForCartItem }[] }>([
                { 
                    path: 'items.offer', 
                    model: ProductOfferModel, 
                    select: '_id price seller', 
                    populate: { path: 'seller', select: '_id name username' } 
                },
                { path: 'items.productModel', select: '_id title standardImageUrls slug' }
            ])
            .lean<LeanCart | null>();
            
        const { total, count } = calculateCartTotals(finalCartState?.items || []);

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