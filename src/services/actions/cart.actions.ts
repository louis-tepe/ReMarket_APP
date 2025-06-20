"use server";

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/mongodb/dbConnect';
import CartModel, { ICart } from '@/lib/mongodb/models/CartModel';
import ProductOfferModel from '@/lib/mongodb/models/SellerProduct';
import ProductModel from '@/lib/mongodb/models/ScrapingProduct';
import { ClientSafeCart, ClientSafeCartItemPopulated, LeanCartItemPopulated } from '@/types/cart';

// Note: Garder cette action simple. La logique de disponibilité sera gérée côté client.
export const getUserCart = async (): Promise<ClientSafeCart | null> => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    try {
        await dbConnect();
        const cart: ICart | null = await CartModel.findOne({ user: session.user.id })
            .populate({
                path: 'items.offer',
                model: ProductOfferModel,
            })
            .populate({
                path: 'items.productModel',
                model: ProductModel,
                select: 'product.title product.images slug'
            })
            .lean();

        if (!cart) return null;
        
        // Calculate total price from cart items
        const total = cart.items.reduce((acc, item) => {
            // item.price is the price at the time of adding to cart
            const price = item.price ?? 0;
            const quantity = item.quantity ?? 0;
            return acc + (price * quantity);
        }, 0);

        // Transform the cart into a client-safe format and add the total
        const clientSafeCart: ClientSafeCart = {
            ...JSON.parse(JSON.stringify(cart)),
            total,
        };

        return clientSafeCart;
        
    } catch (error) {
        console.error('[getUserCart Action] Error:', error);
        return null;
    }
};

export const updateCartItemQuantity = async (itemId: string, newQuantity: number): Promise<ClientSafeCart | null> => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error('Authentification requise.');
    if (newQuantity < 1) return removeCartItem(itemId);
    
    await dbConnect();
    await CartModel.updateOne(
        { user: session.user.id, "items._id": itemId },
        { $set: { "items.$.quantity": newQuantity } }
    );
    revalidatePath('/account/cart');
    return getUserCart();
};

export const removeCartItem = async (itemId: string): Promise<ClientSafeCart | null> => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error('Authentification requise.');
    
    await dbConnect();
    await CartModel.updateOne(
        { user: session.user.id },
        { $pull: { items: { _id: itemId } } }
    );
    revalidatePath('/account/cart');
    return getUserCart();
}; 