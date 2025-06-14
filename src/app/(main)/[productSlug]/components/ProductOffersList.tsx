import React from 'react';
import { Tag, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import SellerOfferCard from "./SellerOfferCard";
import { Offer } from '../types';

interface ProductOffersListProps {
    offers: Offer[];
    onAddToCart: (offer: Offer) => void;
    addingToCartOfferId: string | null;
    isUserLoggedIn: boolean;
    sessionLoading: boolean;
}

/**
 * Renders a list of seller offers for a product.
 * Each offer is displayed using the SellerOfferCard component.
 * Shows a message if no offers are available.
 */
export default function ProductOffersList({
    offers,
    onAddToCart,
    addingToCartOfferId,
    isUserLoggedIn,
    sessionLoading
}: ProductOffersListProps) {
    const availableOffers = offers.filter(
        offer => offer.transactionStatus === 'available' && offer.stockQuantity > 0
    );

    return (
        <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <Tag className="h-6 w-6 mr-2 text-primary" /> Choisir une offre ReMarket
            </h2>
            {availableOffers.length > 0 ? (
                <div className="space-y-4">
                    {availableOffers.map((offer, index) => (
                        <SellerOfferCard
                            key={offer._id || index}
                            offer={offer}
                            onAddToCart={onAddToCart}
                            isAddingToCart={addingToCartOfferId === offer._id}
                            isUserLoggedIn={isUserLoggedIn}
                            sessionLoading={sessionLoading}
                        />
                    ))}
                </div>
            ) : (
                <Card className="p-6 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Aucune offre disponible pour ce produit pour le moment.</p>
                    <p className="text-sm text-muted-foreground mt-1">Revenez bientôt ou explorez d&apos;autres articles.</p>
                </Card>
            )}
        </div>
    );
} 