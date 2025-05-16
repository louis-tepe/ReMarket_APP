'use client';

import { ShoppingCart as ShoppingCartIcon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
// import { useCart } from "@/context/CartContext"; // Exemple si vous avez un contexte de panier

// Simuler des éléments de panier pour l'exemple
const mockCartItems = [
    // { id: 'item1', productId: 'prod_iphone12', name: 'iPhone 12 128Go - Bleu', price: 550, quantity: 1, imageUrl: '/images/placeholders/iphone_search_1.jpg', sellerName: 'VendeurTech' },
    // { id: 'item2', productId: 'prod_sony_xm4', name: 'Sony WH-1000XM4 - Noir', price: 230, quantity: 1, imageUrl: '/images/placeholders/sony_search_1.jpg', sellerName: 'AudioPro' },
];

export default function CartPage() {
    // const { items, removeItem, updateQuantity, totalPrice } = useCart(); // Exemple d'utilisation d'un contexte
    const items = mockCartItems; // Utilisation des données mockées
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // TODO: Implémenter la logique réelle du panier (ajout, suppression, mise à jour quantité, calcul total)
    // TODO: Intégrer avec un contexte de panier ou une gestion d'état ( Zustand, Redux, etc.)
    // TODO: Connecter au processus de checkout

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold flex items-center">
                    <ShoppingCartIcon className="mr-3 h-8 w-8 text-primary" />
                    Mon Panier
                </h1>
                {items.length > 0 && (
                    <p className="text-muted-foreground">{items.length} article(s)</p>
                )}
            </div>

            {items.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-muted rounded-lg">
                    <ShoppingCartIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Votre panier est vide</h2>
                    <p className="text-muted-foreground mb-6">
                        Parcourez nos produits et ajoutez vos trouvailles ici.
                    </p>
                    <Button asChild>
                        <Link href="/search">Commencer mes achats</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4">
                        {/* {items.map(item => (
                            <div key={item.id} className="border rounded-lg p-4 flex items-start space-x-4 bg-card">
                                <div className="w-20 h-20 bg-muted rounded overflow-hidden flex-shrink-0">
                                    {item.imageUrl && 
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                    }
                                </div>
                                <div className="flex-grow">
                                    <h3 className="font-semibold text-lg">{item.name}</h3>
                                    <p className="text-sm text-muted-foreground">Vendu par: {item.sellerName}</p>
                                    <p className="text-sm text-primary font-medium mt-1">{item.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <label htmlFor={`quantity-${item.id}`} className="text-sm">Qté:</label>
                                        <Input 
                                            type="number" 
                                            id={`quantity-${item.id}`} 
                                            value={item.quantity} 
                                            onChange={(e) => console.log('Update quantity', item.id, parseInt(e.target.value))} // updateQuantity(item.id, parseInt(e.target.value)) 
                                            min="1" 
                                            className="w-16 h-8 bg-input"
                                        />
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => console.log('Remove item', item.id)} className="text-destructive hover:text-destructive/90">
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>
                        ))} */}
                        <p className="text-center text-muted-foreground p-8 border rounded-lg bg-card">
                            <Info className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                            L&apos;affichage détaillé des articles du panier est en cours de développement.
                            <br />Pour l&apos;instant, le total est calculé sur la base de données simulées.
                        </p>
                    </div>
                    <div className="md:col-span-1">
                        <div className="sticky top-24 p-6 border rounded-lg bg-card shadow-sm">
                            <h2 className="text-xl font-semibold mb-4">Récapitulatif</h2>
                            <div className="flex justify-between mb-2 text-muted-foreground">
                                <span>Sous-total</span>
                                <span>{totalPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                            <div className="flex justify-between mb-2 text-muted-foreground">
                                <span>Frais de port</span>
                                <span>Calculés à l&apos;étape suivante</span> {/** ou {SHIPPING_COST.toFixed(2)} € */}
                            </div>
                            <hr className="my-3" />
                            <div className="flex justify-between font-bold text-lg mb-4">
                                <span>Total</span>
                                <span>{totalPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span> {/** Ajouter frais de port si applicable */}
                            </div>
                            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={items.length === 0}>
                                Passer la commande
                            </Button>
                            <p className="text-xs text-muted-foreground mt-3 text-center">
                                Paiement sécurisé. ReMarket gère la transaction.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 