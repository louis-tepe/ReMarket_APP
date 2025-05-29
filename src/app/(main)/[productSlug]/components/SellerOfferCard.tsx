import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Loader2 } from "lucide-react";
import { SellerOffer } from '../types';

interface SellerOfferCardProps {
    offer: SellerOffer;
    onAddToCart: (offer: SellerOffer) => void;
    isAddingToCart: boolean;
    isUserLoggedIn: boolean; // Added to control button state more granularly
    sessionLoading: boolean; // Added to control button state during session load
}

const CONDITION_BADGE_VARIANTS: Record<SellerOffer['condition'], 'default' | 'secondary'> = {
    new: 'default',
    used_likenew: 'default',
    used_good: 'secondary',
    used_fair: 'secondary',
};

const CONDITION_LABELS: Record<SellerOffer['condition'], string> = {
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
            {offer.sellerDescription && (
                <CardContent className="pt-0 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{offer.sellerDescription}</p>
                </CardContent>
            )}
            <CardFooter>
                <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => onAddToCart(offer)}
                    disabled={isAddingToCart || !isUserLoggedIn || sessionLoading}
                >
                    {isAddingToCart ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Ajout...</>
                    ) : (
                        <><ShoppingCart className="mr-2 h-5 w-5" /> Ajouter au panier</>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
} 