"use server";

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/mongodb/dbConnect';
import CartModel, { ICart } from '@/lib/mongodb/models/CartModel';
import ProductOfferModel from '@/lib/mongodb/models/SellerProduct';
import ProductModel from '@/lib/mongodb/models/ScrapingProduct';
import { ClientSafeCart } from '@/types/cart';

// Note: Garder cette action simple. La logique de disponibilité sera gérée côté client.
export const getUserCart = async (): Promise<ClientSafeCart | null> => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    try {
        await dbConnect();
        const cart = await CartModel.findOne({ user: session.user.id })
            .populate({
                path: 'items.offer',
                model: ProductOfferModel,
                populate: {
                    path: 'productModel',
                    model: ProductModel,
                    select: 'product.title product.images slug'
                }
            })
            .lean<ICart>();

        if (!cart) return null;
        
        // Conversion en un objet sérialisable sans les types Mongoose
        return JSON.parse(JSON.stringify(cart));
        
    } catch (error) {
        console.error('[getUserCart Action] Error:', error);
        return null;
    }
};

export const updateCartItemQuantity = async (itemId: string, newQuantity: number) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error('Authentification requise.');
    if (newQuantity < 1) return removeCartItem(itemId);
    
    await dbConnect();
    await CartModel.updateOne(
        { user: session.user.id, "items._id": itemId },
        { $set: { "items.$.quantity": newQuantity } }
    );
    revalidatePath('/cart');
};

export const removeCartItem = async (itemId: string) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error('Authentification requise.');
    
    await dbConnect();
    await CartModel.updateOne(
        { user: session.user.id },
        { $pull: { items: { _id: itemId } } }
    );
    revalidatePath('/cart');
}; 