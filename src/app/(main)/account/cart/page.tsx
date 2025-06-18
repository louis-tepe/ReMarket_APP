'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ShoppingCart, Trash2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { CartData, CartItem, OfferCondition } from './types';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

const PLACEHOLDER_IMAGE_URL = '/images/placeholder-product.webp';

// Fonction pour traduire les états de condition en français
const translateCondition = (condition: OfferCondition) => {
    const map: Record<OfferCondition, string> = {
        'new': 'Neuf',
        'like-new': 'Comme neuf',
        'good': 'Bon état',
        'fair': 'État correct',
        'poor': 'Usé'
    };
    return map[condition] || condition;
};

// Sous-composant pour gérer la logique de quantité individuellement
function QuantitySelector({ item, onUpdate, onRemove, isUpdating }: { item: CartItem, onUpdate: (id: string, qty: number) => void, onRemove: (id: string) => void, isUpdating: boolean }) {
    const [quantity, setQuantity] = useState(item.quantity);

    useEffect(() => {
        setQuantity(item.quantity);
    }, [item.quantity]);

    const handleBlur = () => {
        if (quantity === item.quantity || quantity === '') return;
        const numQuantity = Number(quantity);
        if (numQuantity > 0 && numQuantity <= item.offer.stockQuantity) {
            onUpdate(item._id, numQuantity);
        } else {
            setQuantity(item.quantity);
            toast.error(`La quantité doit être entre 1 et ${item.offer.stockQuantity}.`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10));
    };

    return (
        <div className="flex items-center gap-2">
            <Input
                type="number"
                value={quantity}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-16 text-center bg-input"
                min={1}
                max={item.offer.stockQuantity}
                disabled={isUpdating}
                aria-label={`Quantité pour ${item.productModel.title}`}
            />
            <Button
                variant="outline"
                size="icon"
                onClick={() => onRemove(item._id)}
                disabled={isUpdating}
                aria-label="Supprimer l'article"
            >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
            </Button>
        </div>
    );
}

/**
 * CartPage component: Displays the user's shopping cart.
 * Allows users to view items, update quantities, remove items, and clear the cart.
 * Handles session status for authentication and redirects unauthenticated users.
 */
export default function CartPage() {
    const { data: session, status: sessionStatus } = useSession();
    const router = useRouter();
    const [cart, setCart] = useState<CartData | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const isLoading = sessionStatus === 'loading' || (isUpdating && cart === null);

    /**
     * Fetches the user's cart data from the API.
     * Handles API errors and authentication status.
     */
    const fetchCart = useCallback(async () => {
        if (sessionStatus !== "authenticated") {
            return;
        }

        setIsUpdating(true);
        try {
            const response = await fetch('/api/cart');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Erreur lors de la récupération du panier');
            }

            setCart(result.data);
        } catch (error) {
            console.error('[CartPage] Erreur lors de la récupération du panier:', error);
            toast.error((error as Error).message);
            setCart({ items: [], count: 0, total: 0 });
        } finally {
            setIsUpdating(false);
        }
    }, [sessionStatus]);

    useEffect(() => {
        if (sessionStatus === "authenticated") {
            fetchCart();
        } else if (sessionStatus === "unauthenticated") {
            setIsUpdating(false);
            setCart({ items: [], count: 0, total: 0 });
        }
    }, [sessionStatus, fetchCart]);

    /**
     * Handles various cart actions like add, remove, update, or clear items.
     */
    const handleCartAction = async (action: 'update' | 'remove' | 'clear', cartItemId?: string, quantity?: number) => {
        setIsUpdating(true);
        try {
            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, cartItemId, quantity }),
            });
            const result = await response.json();
            if (result.success) {
                setCart(result.data);
                toast.success(result.message || 'Panier mis à jour !');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            toast.error(`Action impossible: ${(error as Error).message}`);
            await fetchCart();
        } finally {
            setIsUpdating(false);
        }
    };

    const totalAmount = useMemo(() => cart?.total ?? 0, [cart]);

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
                    <Button variant="outline" size="sm" onClick={() => handleCartAction('clear')} disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4 text-destructive" />}
                        Vider le panier
                    </Button>
                )}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {cart.items.map((item: CartItem) => (
                        <Card key={item._id} className="p-4 flex flex-col sm:flex-row gap-4">
                            <Link href={`/${item.productModel.slug || item.productModel._id}`} className="block w-full sm:w-24 h-24 sm:h-auto flex-shrink-0 bg-muted rounded overflow-hidden relative">
                                <Image
                                    src={item.offer.images?.[0] || item.productModel.standardImageUrls?.[0] || PLACEHOLDER_IMAGE_URL}
                                    alt={item.productModel.title || 'Image du produit'}
                                    fill
                                    sizes="(max-width: 640px) 100vw, 96px"
                                    className="object-contain"
                                />
                            </Link>
                            <div className="flex-grow">
                                <Link href={`/${item.productModel.slug || item.productModel._id}`} className="hover:underline">
                                    <h2 className="text-lg font-semibold">{item.productModel.title}</h2>
                                </Link>
                                <p className="text-sm text-muted-foreground">État: {translateCondition(item.offer.condition)}</p>
                                <p className="text-lg font-bold text-primary mt-1">{item.offer.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                            </div>
                            <div className="flex flex-col sm:items-end justify-between mt-2 sm:mt-0">
                                <QuantitySelector
                                    item={item}
                                    onUpdate={(id, qty) => handleCartAction('update', id, qty)}
                                    onRemove={(id) => handleCartAction('remove', id)}
                                    isUpdating={isUpdating}
                                />
                                <p className="text-sm text-muted-foreground mt-2 sm:text-right">Total: {(item.offer.price * item.quantity).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Résumé de la commande</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between">
                                <span>Sous-total</span>
                                <span>{totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Livraison</span>
                                <span>Gratuite</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>{totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full" size="lg" disabled={isUpdating}>
                                <Link href={`/checkout?amount=${totalAmount}&cartId=${cart._id}`}>
                                    Procéder au paiement
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                    <div className="text-center mt-4">
                        <Button variant="link" onClick={() => router.push('/')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Continuer les achats
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
} 