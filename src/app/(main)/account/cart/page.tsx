'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Pour la quantité
import { Loader2, ShoppingCart, Trash2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { CartData, CartItem } from './types'; // Import types
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { signIn } from 'next-auth/react';

// Placeholder for product image if none is available
const PLACEHOLDER_IMAGE_URL = '/images/placeholder-product.png';

/**
 * CartPage component: Displays the user's shopping cart.
 * Allows users to view items, update quantities, remove items, and clear the cart.
 * Handles session status for authentication and redirects unauthenticated users.
 */
export default function CartPage() {
    const { status: sessionStatus } = useSession(); // Destructure session for clarity
    const router = useRouter();
    const [cart, setCart] = useState<CartData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdatingQuantity, setIsUpdatingQuantity] = useState<string | null>(null);
    const [isClearingCart, setIsClearingCart] = useState(false);

    /**
     * Fetches the user's cart data from the API.
     * Handles API errors and authentication status.
     */
    const fetchCart = useCallback(async () => {
        if (sessionStatus !== "authenticated") {
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/cart');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Erreur lors de la récupération du panier');
            }

            const cartData = {
                items: Array.isArray(result.data?.items) ? result.data.items : [],
                count: result.data?.count || 0,
                total: result.data?.total || 0
            };

            setCart(cartData);
        } catch (error) {
            console.error('[CartPage] Erreur lors de la récupération du panier:', error);
            setCart({ items: [], count: 0, total: 0 });
        } finally {
            setIsLoading(false);
        }
    }, [sessionStatus]);

    useEffect(() => {
        if (sessionStatus === "authenticated") {
            fetchCart();
        } else if (sessionStatus === "unauthenticated") {
            setIsLoading(false);
            setCart({ items: [], count: 0, total: 0 });
        }
    }, [sessionStatus, fetchCart]);

    /**
     * Handles various cart actions like add, remove, update, or clear items.
     */
    const handleCartAction = async (action: string, offerId?: string, quantity?: number) => {
        try {
            const body: Record<string, unknown> = { action };
            if (offerId) body.offerId = offerId;
            if (quantity !== undefined) body.quantity = quantity;

            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (result.success) {
                await fetchCart();
            } else {
                console.error('Erreur lors de la modification du panier:', result.message);
            }
        } catch (error) {
            console.error('Erreur lors de l\'action panier:', error);
        }
    };

    const handleRemoveItem = (cartItemId: string) => {
        if (!cartItemId) return;
        setIsUpdatingQuantity(cartItemId);
        handleCartAction('remove', cartItemId)
            .finally(() => setIsUpdatingQuantity(null));
    };

    const handleUpdateQuantity = (cartItemId: string, newQuantity: number) => {
        if (!cartItemId || isNaN(newQuantity) || newQuantity < 0) return;
        setIsUpdatingQuantity(cartItemId);
        if (newQuantity === 0) {
            handleCartAction('remove', cartItemId)
                .finally(() => setIsUpdatingQuantity(null));
        } else {
            handleCartAction('update', cartItemId, newQuantity)
                .finally(() => setIsUpdatingQuantity(null));
        }
    };

    const handleClearCart = () => {
        setIsClearingCart(true);
        handleCartAction('clear')
            .finally(() => setIsClearingCart(false));
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Chargement de votre panier...</span>
                </div>
            </div>
        );
    }

    if (sessionStatus === "unauthenticated") {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="p-6 text-center">
                    <h1 className="text-2xl font-bold mb-4">Connexion requise</h1>
                    <p className="text-muted-foreground mb-6">
                        Vous devez être connecté pour accéder à votre panier.
                    </p>
                    <Button onClick={() => signIn()} size="lg">
                        Se connecter
                    </Button>
                </Card>
            </div>
        );
    }

    if (!cart || !cart.items || cart.items.length === 0) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">Mon Panier</h1>
                <Card className="p-6 text-center">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h2 className="text-xl font-semibold mb-2">Votre panier est vide</h2>
                    <p className="text-muted-foreground mb-4">
                        Découvrez nos produits et ajoutez-les à votre panier.
                    </p>
                    <Button onClick={() => router.push('/')} size="lg">
                        Continuer les achats
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Votre Panier ({cart.count || 0})</h1>
                {cart.items.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleClearCart} disabled={isClearingCart || isLoading}>
                        {isClearingCart ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4 text-destructive" />}
                        Vider le panier
                    </Button>
                )}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {cart.items.map((item: CartItem) => (
                        <div key={item._id} className="bg-card p-4 rounded-lg shadow-sm flex flex-col sm:flex-row gap-4">
                            <Link href={`/${item.productModel.slug || item.productModel._id}`} className="block w-full sm:w-24 h-24 sm:h-auto flex-shrink-0 bg-muted rounded overflow-hidden relative">
                                <Image
                                    src={item.productModel.standardImageUrls?.[0] || PLACEHOLDER_IMAGE_URL}
                                    alt={item.productModel.title}
                                    fill
                                    sizes="(max-width: 640px) 100vw, 96px"
                                    className="object-contain"
                                />
                            </Link>
                            <div className="flex-grow">
                                <Link href={`/${item.productModel.slug || item.productModel._id}`} className="hover:underline">
                                    <h2 className="text-lg font-semibold">{item.productModel.title}</h2>
                                </Link>
                                <p className="text-sm text-muted-foreground">Vendu par: {item.offer.seller?.name || item.offer.seller?.username || 'Vendeur ReMarket'}</p>
                                <p className="text-lg font-bold text-primary mt-1">{item.offer.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                            </div>
                            <div className="flex flex-col sm:items-end justify-between mt-2 sm:mt-0">
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateQuantity(item._id, parseInt(e.target.value))}
                                        className="w-16 text-center bg-input"
                                        min={1}
                                        disabled={isUpdatingQuantity === item._id}
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleRemoveItem(item._id)}
                                        disabled={isUpdatingQuantity === item._id}
                                        aria-label="Supprimer l'article"
                                    >
                                        {isUpdatingQuantity === item._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2 sm:text-right">Total: {(item.offer.price * item.quantity).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="lg:col-span-1 sticky top-24 self-start">
                    <div className="bg-card p-6 rounded-lg shadow-sm">
                        <h2 className="text-xl font-semibold mb-4">Récapitulatif</h2>
                        <div className="flex justify-between mb-2">
                            <span>Sous-total ({cart.count || 0} article{cart.count && cart.count > 1 ? 's' : ''})</span>
                            <span>{(cart.total || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                        </div>
                        <div className="flex justify-between mb-2 text-muted-foreground">
                            <span>Frais de livraison</span>
                            <span>À calculer</span>
                        </div>
                        <hr className="my-3" />
                        <div className="flex justify-between font-bold text-lg mb-4">
                            <span>Total</span>
                            <span>{(cart.total || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                        </div>
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled>
                            Passer la commande
                        </Button>
                        <Button variant="outline" className="w-full mt-3" asChild>
                            <Link href="/categories"><ArrowLeft className="mr-2 h-4 w-4" />Continuer mes achats</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
} 