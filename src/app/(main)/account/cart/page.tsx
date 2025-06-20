"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';

import { getUserCart, updateCartItemQuantity, removeCartItem } from '@/services/actions/cart.actions';
import { ClientSafeCart, ClientSafeCartItemPopulated } from '@/types/cart';
import { Button } from '@/components/ui/button';

const PLACEHOLDER_IMAGE_URL = '/images/placeholder-product.webp';

const getImageUrl = (item: ClientSafeCartItemPopulated): string => {
    const offerImageUrl = item.offer?.images?.[0];
    if (typeof offerImageUrl === 'string' && offerImageUrl.trim() !== '') {
        return offerImageUrl;
    }
    const modelImageUrl = item.productModel?.standardImageUrls?.[0];
    if (typeof modelImageUrl === 'string' && modelImageUrl.trim() !== '') {
        return modelImageUrl;
    }
    return PLACEHOLDER_IMAGE_URL;
};

function CartItem({ item, onQuantityChange, onRemove, isUpdating }: { item: ClientSafeCartItemPopulated, onQuantityChange: (id: string, q: number) => void, onRemove: (id: string) => void, isUpdating: boolean }) {
    const title = item.productModel?.title || 'Titre non disponible';
    const slug = item.productModel?.slug;

    return (
        <div className="flex items-center p-4 border rounded-lg">
            <Image src={getImageUrl(item)} alt={title} width={80} height={80} className="rounded-md" />
            <div className="ml-4 flex-grow">
                {slug ? (
                    <Link href={`/${slug}`}><h3 className="font-semibold">{title}</h3></Link>
                ) : (
                    <h3 className="font-semibold">{title}</h3>
                )}
                <p className="text-sm text-muted-foreground">Prix: {item.offer?.price ?? 'N/A'} €</p>
            </div>
            <div className="flex items-center gap-4">
                <input type="number" value={item.quantity} onChange={(e) => onQuantityChange(item._id, parseInt(e.target.value, 10))} className="w-16 p-1 border rounded" disabled={isUpdating} />
                <Button variant="ghost" size="icon" onClick={() => onRemove(item._id)} disabled={isUpdating}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function CartDisplay({ cart, handleQuantityChange, handleRemoveItem, isUpdating }: { cart: ClientSafeCart, handleQuantityChange: (itemId: string, quantity: number) => void, handleRemoveItem: (itemId: string) => void, isUpdating: boolean }) {
    const router = useRouter();
    const totalAmount = useMemo(() => {
        return cart.items.reduce((acc, item) => {
            const price = item.offer?.price ?? 0;
            return acc + (price * item.quantity);
        }, 0);
    }, [cart.items]);

    const handleProceedToCheckout = () => {
        if (!cart?._id || totalAmount <= 0) {
            toast.error("Votre panier est vide ou le total est invalide.");
            return;
        }
        router.push(`/checkout?cartId=${cart._id}&amount=${totalAmount}`);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <h1 className="text-3xl font-bold mb-6">Votre Panier</h1>
                <div className="space-y-4">
                    {cart.items.map((item) => (
                        <CartItem 
                            key={item._id}
                            item={item} 
                            onQuantityChange={handleQuantityChange}
                            onRemove={handleRemoveItem}
                            isUpdating={isUpdating}
                        />
                    ))}
                </div>
            </div>
            <div className="lg:col-span-1">
                <div className="bg-muted p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Résumé</h2>
                    <div className="flex justify-between mb-2">
                        <span>Sous-total</span>
                        <span>{totalAmount.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between mb-4">
                        <span>Livraison</span>
                        <span>Calculée à l'étape suivante</span>
                    </div>
                    <div className="border-t pt-4 flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{totalAmount.toFixed(2)} €</span>
                    </div>
                    <Button 
                        className="w-full mt-6" 
                        onClick={handleProceedToCheckout}
                        disabled={isUpdating || totalAmount <= 0}
                    >
                        Passer la commande
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function CartPage() {
    const { status: sessionStatus } = useSession();
    const queryClient = useQueryClient();

    const { data: cart, isLoading, error } = useQuery({
        queryKey: ['cart'],
        queryFn: getUserCart,
        enabled: sessionStatus === 'authenticated',
    });

    const updateQuantityMutation = useMutation({
        mutationFn: ({ itemId, quantity }: { itemId: string, quantity: number }) => updateCartItemQuantity(itemId, quantity),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            toast.success('Panier mis à jour.');
        },
        onError: (err: Error) => {
            toast.error(err.message);
        }
    });

    const removeItemMutation = useMutation({
        mutationFn: (itemId: string) => removeCartItem(itemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            toast.success('Article supprimé.');
        },
        onError: (err: Error) => {
            toast.error(err.message);
        }
    });

    if (isLoading) return <div>Chargement du panier...</div>;
    if (error) return <div>Erreur: {(error as Error).message}</div>;

    if (!cart || cart.items.length === 0) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Votre Panier</h1>
                <p>Votre panier est vide.</p>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-8">
            <CartDisplay 
                cart={cart}
                handleQuantityChange={(itemId, quantity) => updateQuantityMutation.mutate({ itemId, quantity })}
                handleRemoveItem={(itemId) => removeItemMutation.mutate(itemId)}
                isUpdating={updateQuantityMutation.isPending || removeItemMutation.isPending}
            />
        </div>
    );
}
