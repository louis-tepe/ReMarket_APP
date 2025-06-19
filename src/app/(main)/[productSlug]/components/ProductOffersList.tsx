'use client';

import React from 'react';
import { Tag, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import SellerOfferCard from "./SellerOfferCard";
import { PopulatedOffer } from '@/app/(main)/[productSlug]/types';

interface ProductOffersListProps {
    offers: PopulatedOffer[];
    handleAddToCart: (offer: PopulatedOffer) => void;
    isAddingToCartOfferId: string | null;
    sessionStatus: "authenticated" | "loading" | "unauthenticated";
}

/**
 * Renders a list of seller offers for a product.
 * Each offer is displayed using the SellerOfferCard component.
 * Shows a message if no offers are available.
 */
const ProductOffersList: React.FC<ProductOffersListProps> = ({
    offers,
    handleAddToCart,
    isAddingToCartOfferId,
    sessionStatus
}) => {
    const availableOffers = offers.filter(
        offer => offer.transactionStatus === 'available' && offer.stockQuantity > 0
    );

    // Grouper les offres par condition et sélectionner la meilleure (la moins chère)
    const bestOffersByCondition = availableOffers.reduce((acc, offer) => {
        const existingOffer = acc[offer.condition];
        if (!existingOffer || offer.price < existingOffer.price) {
            acc[offer.condition] = offer;
        }
        return acc;
    }, {} as Record<PopulatedOffer['condition'], PopulatedOffer>);

    const bestOffers = Object.values(bestOffersByCondition).sort((a, b) => a.price - b.price);

    if (bestOffers.length === 0) {
        return (
            <Card className="p-6 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Aucune offre disponible pour ce produit pour le moment.</p>
                <p className="text-sm text-muted-foreground mt-1">Revenez bientôt ou explorez d&apos;autres articles.</p>
            </Card>
        );
    }

    return (
        <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <Tag className="h-6 w-6 mr-2 text-primary" /> Choisir une offre ReMarket
            </h2>
            <div className="space-y-4">
                {bestOffers.map((offer, index) => (
                    <SellerOfferCard
                        key={offer._id || index}
                        offer={offer}
                        onAddToCart={handleAddToCart}
                        isAddingToCart={isAddingToCartOfferId === offer._id}
                        isUserLoggedIn={sessionStatus === 'authenticated'}
                        sessionLoading={sessionStatus === 'loading'}
                    />
                ))}
            </div>
        </div>
    );
}

export default ProductOffersList; 