import React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Loader2, Zap } from "lucide-react";
import { Offer } from '../types';

interface SellerOfferCardProps {
    offer: Offer;
    onAddToCart: (offer: Offer) => void;
    isAddingToCart: boolean;
    isUserLoggedIn: boolean; // Added to control button state more granularly
    sessionLoading: boolean; // Added to control button state during session load
}

const CONDITION_BADGE_VARIANTS: Record<Offer['condition'], 'default' | 'secondary'> = {
    new: 'default',
    used_likenew: 'default',
    used_good: 'secondary',
    used_fair: 'secondary',
};

const CONDITION_LABELS: Record<Offer['condition'], string> = {
    new: 'Neuf',
    used_likenew: 'Comme neuf',
    used_good: 'Bon état',
    used_fair: 'État correct',
};

/**
 * Displays a single seller offer card with details like price, seller, condition,
 * and an "Add to Cart" button.
 * The button's state changes based on login status, session loading, and add-to-cart action.
 */
export default function SellerOfferCard({
    offer,
    onAddToCart,
    isAddingToCart,
    isUserLoggedIn,
    sessionLoading
}: SellerOfferCardProps) {

    const conditionBadgeVariant = CONDITION_BADGE_VARIANTS[offer.condition] || 'secondary';
    const conditionLabel = CONDITION_LABELS[offer.condition] || offer.condition;
    const isOfferAvailable = offer.transactionStatus === 'available' && offer.stockQuantity > 0;

    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow bg-card">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl">
                            {offer.price.toLocaleString('fr-FR', { style: 'currency', currency: offer.currency })}
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Vendu par : <span className="font-medium text-foreground">{offer.seller.name || 'Vendeur anonyme'}</span>
                        </CardDescription>
                    </div>
                    <Badge variant={conditionBadgeVariant} className="capitalize">
                        {conditionLabel}
                    </Badge>
                </div>
            </CardHeader>
            {offer.description && (
                <CardContent className="pt-0 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{offer.description}</p>
                </CardContent>
            )}
            <CardFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => onAddToCart(offer)}
                    disabled={!isOfferAvailable || isAddingToCart || !isUserLoggedIn || sessionLoading}
                >
                    {isAddingToCart ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Ajout...</>
                    ) : (
                        <><ShoppingCart className="mr-2 h-5 w-5" /> Ajouter au panier</>
                    )}
                </Button>
                <Button
                    asChild
                    className="w-full"
                    disabled={!isOfferAvailable || !isUserLoggedIn || sessionLoading}
                >
                    <Link href={`/checkout?amount=${offer.price}&offerId=${offer._id}`}>
                        <Zap className="mr-2 h-5 w-5" /> Acheter maintenant
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
} 