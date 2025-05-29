'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Pour la quantité
import { toast } from 'sonner';
import { Loader2, ShoppingCart, Trash2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { CartData, CartActionPayload, CartItem } from './types'; // Import types
import { useSession } from 'next-auth/react';

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
        console.log("[CartPage] fetchCart appelé, sessionStatus:", sessionStatus);

        if (sessionStatus !== 'authenticated') {
            console.log("[CartPage] Session non authentifiée, arrêt du fetch");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            console.log("[CartPage] Début de l'appel API /api/cart");
            const response = await fetch('/api/cart');
            console.log("[CartPage] Response status:", response.status, response.statusText);

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("Veuillez vous connecter pour voir votre panier.");
                    router.push('/signin?callbackUrl=/cart');
                    return;
                }
                const errorData = await response.json().catch(() => ({ message: "Erreur lors du chargement du panier." }));
                throw new Error(errorData.message);
            }

            const result = await response.json();
            console.log("[CartPage] Réponse API complète:", JSON.stringify(result, null, 2));

            if (result.success) {
                // Les données de l'API correspondent maintenant aux types attendus
                const cartData: CartData = {
                    items: result.data?.items || [],
                    count: result.data?.count || 0,
                    total: result.data?.total || 0
                };

                console.log("[CartPage] CartData formaté:", JSON.stringify(cartData, null, 2));
                console.log("[CartPage] Nombre d'items:", cartData.items.length);
                console.log("[CartPage] Count:", cartData.count);
                console.log("[CartPage] Total:", cartData.total);

                setCart(cartData);
            } else {
                console.error("[CartPage] API success=false:", result.message);
                throw new Error(result.message || "Impossible de charger les données du panier.");
            }
        } catch (error: unknown) {
            console.error("[CartPage] Erreur fetchCart:", error);
            const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue s'est produite.";
            toast.error("Erreur Panier", { description: errorMessage });
            // Définir un panier vide en cas d'erreur au lieu de null
            setCart({ items: [], count: 0, total: 0 });
        } finally {
            console.log("[CartPage] Fin fetchCart, setIsLoading(false)");
            setIsLoading(false);
        }
    }, [router, sessionStatus]);

    useEffect(() => {
        console.log("[CartPage] useEffect sessionStatus:", sessionStatus);
        if (sessionStatus === 'authenticated') {
            fetchCart();
        } else if (sessionStatus === 'unauthenticated') {
            toast.error("Veuillez vous connecter pour accéder à votre panier.");
            router.push('/signin?callbackUrl=/cart');
            setIsLoading(false);
        }
        // Pour le statut 'loading', on garde isLoading à true
    }, [sessionStatus, fetchCart, router]);

    /**
     * Handles various cart actions like add, remove, update, or clear items.
     * @param payload - The action details (type, item IDs, quantity).
     */
    const handleCartAction = useCallback(async (payload: CartActionPayload) => {
        if (sessionStatus !== 'authenticated') {
            toast.error("Authentification requise pour modifier le panier.");
            return;
        }

        try {
            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            console.log("[CartPage] Réponse action panier:", result);

            if (response.ok && result.success) {
                toast.success(result.message || "Panier mis à jour.");
                // Mettre à jour l'état local du panier avec les données retournées
                const updatedCartData: CartData = {
                    items: result.data?.items || [],
                    count: result.data?.count || 0,
                    total: result.data?.total || 0
                };
                setCart(updatedCartData);
            } else {
                throw new Error(result.message || "Erreur lors de la mise à jour du panier.");
            }
        } catch (error: unknown) {
            console.error("[CartPage] Erreur action panier:", error);
            const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue s'est produite.";
            toast.error("Erreur Panier", { description: errorMessage });
        }
    }, [sessionStatus]);

    const handleRemoveItem = (cartItemId: string) => {
        if (!cartItemId) return;
        setIsUpdatingQuantity(cartItemId);
        handleCartAction({ action: 'remove', cartItemId })
            .finally(() => setIsUpdatingQuantity(null));
    };

    const handleUpdateQuantity = (cartItemId: string, newQuantity: number) => {
        if (!cartItemId || isNaN(newQuantity) || newQuantity < 0) return;
        setIsUpdatingQuantity(cartItemId);
        if (newQuantity === 0) {
            handleCartAction({ action: 'remove', cartItemId })
                .finally(() => setIsUpdatingQuantity(null));
        } else {
            handleCartAction({ action: 'update', cartItemId, quantity: newQuantity })
                .finally(() => setIsUpdatingQuantity(null));
        }
    };

    const handleClearCart = () => {
        setIsClearingCart(true);
        handleCartAction({ action: 'clear' })
            .finally(() => setIsClearingCart(false));
    };

    // Affichage du loader pendant le chargement
    if (isLoading || sessionStatus === 'loading') {
        console.log("[CartPage] Rendu - État de chargement. isLoading:", isLoading, "sessionStatus:", sessionStatus);
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="mt-4 text-muted-foreground">Chargement de votre panier...</p>
            </div>
        );
    }

    // Redirection si non authentifié (déjà gérée dans useEffect, mais garde comme fallback)
    if (sessionStatus === 'unauthenticated') {
        console.log("[CartPage] Rendu - Session non authentifiée");
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h1 className="text-3xl font-bold mb-2">Connexion requise</h1>
                <p className="text-muted-foreground mb-6">
                    Veuillez vous connecter pour accéder à votre panier.
                </p>
                <Button asChild>
                    <Link href="/signin?callbackUrl=/cart">Se connecter</Link>
                </Button>
            </div>
        );
    }

    // Log final avant le rendu du panier
    console.log("[CartPage] État final avant rendu:", {
        cart,
        hasItems: cart?.items && cart.items.length > 0,
        itemsLength: cart?.items?.length,
        count: cart?.count,
        total: cart?.total
    });

    // Panier vide (cart existe mais pas d'items)
    if (!cart || !cart.items || cart.items.length === 0) {
        console.log("[CartPage] Rendu - Panier vide. cart:", cart);
        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h1 className="text-3xl font-bold mb-2">Votre panier est vide</h1>
                <p className="text-muted-foreground mb-6">
                    Parcourez nos catégories pour trouver votre bonheur !
                </p>
                <Button asChild>
                    <Link href="/categories">Explorer les produits</Link>
                </Button>
            </div>
        );
    }

    console.log("[CartPage] Rendu - Panier avec articles. Nombre d'items:", cart.items.length);
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