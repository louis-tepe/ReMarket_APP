import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/mongodb/dbConnect';

// Forcer l'enregistrement des schémas avant toute utilisation
import '@/lib/mongodb/models/User';
import '@/lib/mongodb/models/CategoryModel';
import ProductModel from '@/lib/mongodb/models/ScrapingProduct';
import ProductOfferModel from '@/lib/mongodb/models/SellerProduct';
import CartModel from '@/lib/mongodb/models/CartModel';
import { IShippingAddress } from '@/lib/mongodb/models/User';

import { LeanCartItem } from "@/types/cart";
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
    _id: number;
    title: string;
    standardImageUrls: string[];
    slug: string;
}

interface LeanCartItemPopulated extends Omit<LeanCartItem, 'productOffer' | 'price'> {
    offer: PopulatedOfferForCartItem;
    productModel: PopulatedProductModelForCartItem;
}

interface FinalCartItemRaw {
    _id: Types.ObjectId;
    quantity: number;
    offer: {
        _id: Types.ObjectId;
        price: number;
        seller: PopulatedSellerForCart;
        productModel: PopulatedProductModelForCartItem;
        stockQuantity: number;
        condition: string;
        images: string[];
    };
    user: Types.ObjectId;
}

interface FinalCartState {
    items: FinalCartItemRaw[];
    user: Types.ObjectId;
}

interface CartActionPayload {
    action?: 'add' | 'remove' | 'update' | 'clear'; // 'add' est par défaut
    offerId?: string; // Requis pour action: 'add'
    productModelId?: string | number; // Requis pour action: 'add'
    cartItemId?: string; // Requis pour action: 'remove' ou 'update'
    quantity?: number; // Requis pour action: 'add' ou 'update' (pour 'add', 1 par défaut)
}

// Helper pour calculer le total et le nombre d'articles
function calculateCartTotals(items: LeanCartItemPopulated[]) {
    let total = 0;
    let count = 0;
    if (items && Array.isArray(items)) { 
        for (const item of items) {
            const offerPrice = item.offer?.price; 
            if (offerPrice && typeof item.quantity === 'number') {
                total += offerPrice * item.quantity;
                count += item.quantity;
            }
        }
    }
    return { total, count };
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
                const productModelIdNum = typeof productModelId === 'string' ? parseInt(productModelId, 10) : productModelId;

                if (!offerId || !Types.ObjectId.isValid(offerId) || !productModelIdNum || isNaN(productModelIdNum)) {
                    return NextResponse.json({ success: false, message: 'ID offre ou produit manquant/invalide.' }, { status: 400 });
                }
                const addQuantity = quantity === undefined ? 1 : quantity;
                if (typeof addQuantity !== 'number' || addQuantity <= 0) {
                    return NextResponse.json({ success: false, message: 'Quantité invalide.' }, { status: 400 });
                }

                const offerToAdd = await ProductOfferModel.findById(offerId)
                    .select('_id transactionStatus productModel price stockQuantity seller')
                    .populate('seller', 'shippingAddresses')
                    .lean<{ 
                        _id: Types.ObjectId, 
                        transactionStatus: string, 
                        productModel: number, 
                        price: number, 
                        stockQuantity: number,
                        seller: { shippingAddresses?: IShippingAddress[] }
                    } | null>();

                if (!offerToAdd) {
                    return NextResponse.json({ success: false, message: 'Offre introuvable.' }, { status: 404 });
                }
                if (!offerToAdd.seller?.shippingAddresses || offerToAdd.seller.shippingAddresses.length === 0) {
                    return NextResponse.json({ success: false, message: "Le vendeur n'a pas configuré d'adresse d'expédition et ne peut pas vendre cet article pour le moment." }, { status: 400 });
                }
                if (offerToAdd.transactionStatus !== 'available' || offerToAdd.stockQuantity < 1) {
                    return NextResponse.json({ success: false, message: 'Cette offre n\'est plus disponible.' }, { status: 404 });
                }
                if (offerToAdd.productModel !== productModelIdNum) {
                    return NextResponse.json({ success: false, message: 'L\'offre ne correspond pas au produit.' }, { status: 400 });
                }
                await cart.addItem({ offerId, productModelId: productModelIdNum, quantity: addQuantity, price: offerToAdd.price });
                message = 'Article ajouté/mis à jour.';
                break;

            case 'remove':
                if (!cartItemId || !Types.ObjectId.isValid(cartItemId)) {
                    return NextResponse.json({ success: false, message: 'ID d\'article invalide.' }, { status: 400 });
                }
                await cart.removeItem(cartItemId);
                message = 'Article supprimé.';
                break;

            case 'update':
                if (!cartItemId || !Types.ObjectId.isValid(cartItemId) || typeof quantity !== 'number' || quantity <= 0) {
                    return NextResponse.json({ success: false, message: "Données invalides pour la mise à jour." }, { status: 400 });
                }
                
                await cart.updateItemQuantity(cartItemId, quantity);
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
            .populate([
                {
                    path: 'items.offer',
                    model: ProductOfferModel,
                    select: '_id price seller images productModel stockQuantity condition',
                    populate: [
                        { path: 'seller', select: '_id name username' },
                        {
                            path: 'productModel',
                            model: ProductModel,
                            select: '_id title standardImageUrls slug'
                        }
                    ]
                },
            ])
            .lean<FinalCartState | null>();
            
        const transformedItems: LeanCartItemPopulated[] = finalCartState?.items.map((item: FinalCartItemRaw) => ({
            ...item,
            productModel: item.offer.productModel,
        })) || [];

        const { total, count } = calculateCartTotals(transformedItems);

        return NextResponse.json({ 
            success: true, 
            message: message, 
            data: { items: transformedItems, count, total } 
        }, { status: 200 });

    } catch (error) {
        console.error('[API_CART_POST]', error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
        return NextResponse.json({ success: false, message: 'Erreur serveur lors de l\'action sur le panier.', error: errorMessage }, { status: 500 });
    }
}

// TODO: Ajouter une méthode DELETE pour supprimer un article spécifique du panier
// (par exemple, en passant l'offerId dans les query params ou le body) 