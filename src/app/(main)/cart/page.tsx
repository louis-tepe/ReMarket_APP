'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Pour la quantité
import { toast } from 'sonner';
import { Loader2, ShoppingCart, Trash2, Info, ArrowLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Types pour le panier récupéré de l'API
interface CartItemOffer {
    _id: string;
    price: number;
    seller?: { name?: string; username?: string };
    // ... autres champs de l'offre si nécessaire
}

interface CartItemProductModel {
    _id: string;
    title: string;
    standardImageUrls?: string[];
    slug?: string;
}

interface CartItem {
    _id: string; // ID de l'item dans le panier
    offer: CartItemOffer;
    productModel: CartItemProductModel;
    quantity: number;
    addedAt: string;
}

interface CartData {
    items: CartItem[];
    count: number;
    total: number;
}

export default function CartPage() {
    const { data: session, status: sessionStatus } = useSession();
    const router = useRouter();
    const [cart, setCart] = useState<CartData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdatingQuantity, setIsUpdatingQuantity] = useState<string | null>(null); // ID de l'item en cours de modif
    const [isClearingCart, setIsClearingCart] = useState(false);

    const fetchCart = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/cart');
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
            if (result.success) {
                setCart(result.data);
            } else {
                throw new Error(result.message || "Impossible de charger les données du panier.");
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue s'est produite.";
            toast.error("Erreur Panier", { description: errorMessage });
            setCart({ items: [], count: 0, total: 0 }); // Panier vide en cas d'erreur
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (sessionStatus === 'authenticated') {
            fetchCart();
        } else if (sessionStatus === 'unauthenticated') {
            toast.error("Veuillez vous connecter pour accéder à votre panier.");
            router.push('/signin?callbackUrl=/cart');
        }
        // Si sessionStatus est 'loading', on attend qu'il se résolve.
    }, [sessionStatus, router]);

    const handleCartAction = async (payload: any) => {
        if (sessionStatus !== 'authenticated') {
            toast.error("Authentification requise pour modifier le panier.");
            return;
        }
        // Gérer l'état de chargement spécifique à l'item si besoin (ex: pour la quantité)
        // Pour la suppression, on peut juste recharger le panier.
        try {
            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (response.ok && result.success) {
                toast.success(result.message || "Panier mis à jour.");
                setCart(result.data); // Mettre à jour l'état local du panier avec les données retournées
            } else {
                throw new Error(result.message || "Erreur lors de la mise à jour du panier.");
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue s'est produite.";
            toast.error("Erreur Panier", { description: errorMessage });
        }
    };

    const handleRemoveItem = (cartItemId: string) => {
        if (!cartItemId) return;
        setIsUpdatingQuantity(cartItemId); // Utiliser pour le feedback visuel de chargement sur le bouton
        handleCartAction({ action: 'remove', cartItemId })
            .finally(() => setIsUpdatingQuantity(null));
    };

    const handleUpdateQuantity = (cartItemId: string, newQuantity: number) => {
        if (!cartItemId || isNaN(newQuantity) || newQuantity < 0) return;
        if (newQuantity === 0) { // Si la quantité est 0, on supprime l'article
            handleRemoveItem(cartItemId);
            return;
        }
        setIsUpdatingQuantity(cartItemId);
        handleCartAction({ action: 'update', cartItemId, quantity: newQuantity })
            .finally(() => setIsUpdatingQuantity(null));
    };

    const handleClearCart = () => {
        setIsClearingCart(true);
        handleCartAction({ action: 'clear' })
            .finally(() => setIsClearingCart(false));
    };

    if (isLoading || sessionStatus === 'loading') {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="mt-4 text-muted-foreground">Chargement de votre panier...</p>
            </div>
        );
    }

    if (!cart || cart.items.length === 0) {
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

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Votre Panier</h1>
                {cart.items.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleClearCart} disabled={isClearingCart}>
                        {isClearingCart ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4 text-destructive" />}
                        Vider le panier
                    </Button>
                )}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {cart.items.map((item) => (
                        <div key={item._id} className="bg-card p-4 rounded-lg shadow-sm flex flex-col sm:flex-row gap-4">
                            <Link href={`/${item.productModel.slug || item.productModel._id}`} className="block w-full sm:w-24 h-24 sm:h-auto flex-shrink-0 bg-muted rounded overflow-hidden relative">
                                <Image
                                    src={item.productModel.standardImageUrls?.[0] || '/images/placeholder-product.png'}
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
                            <span>Sous-total ({cart.count} article{cart.count > 1 ? 's' : ''})</span>
                            <span>{cart.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                        </div>
                        <div className="flex justify-between mb-2 text-muted-foreground">
                            <span>Frais de livraison</span>
                            <span>À calculer</span> {/* TODO: Intégrer calcul frais de port */}
                        </div>
                        <hr className="my-3" />
                        <div className="flex justify-between font-bold text-lg mb-4">
                            <span>Total</span>
                            <span>{cart.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
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