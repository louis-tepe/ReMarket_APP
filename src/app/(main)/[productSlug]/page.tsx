'use client'; // Pour useEffect et useState

import { useEffect, useState, use } from 'react';
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react"; // ShoppingCart, Tag, CheckCircle, Package, ZoomIn, Loader2 removed as they are in components
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { notFound } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";

// Component Imports
import ProductImageGallery from './components/ProductImageGallery';
import ProductMetaInfo from './components/ProductMetaInfo';
import ProductOffersList from './components/ProductOffersList';
import LedenicheurPriceInfo from './components/LedenicheurPriceInfo';
import ProductDetailsTabs from './components/ProductDetailsTabs';
import type { Product, Offer } from './types'; // Import types

// List of top-level slugs that are not product pages.
const NON_PRODUCT_SLUGS = ['cart', 'categories', 'chat', 'dashboard', 'favorites', 'search', 'sell', 'settings', 'account'];

async function getProductDetails(slug: string): Promise<Product | null> {
    if (NON_PRODUCT_SLUGS.includes(slug)) {
        // console.log(`Skipping API call for non-product slug: ${slug}`);
        notFound();
    }
    try {
        const response = await fetch(`/api/products/${slug}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`Failed to fetch product: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching product details:", error);
        return null;
    }
}

function ProductPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                {/* Colonne Image Produit */}
                <div>
                    <Skeleton className="aspect-square w-full rounded-lg" />
                    <div className="mt-4 grid grid-cols-4 gap-2">
                        <Skeleton className="aspect-square w-full rounded" />
                        <Skeleton className="aspect-square w-full rounded" />
                        <Skeleton className="aspect-square w-full rounded" />
                    </div>
                </div>

                {/* Colonne Informations Produit et Offres */}
                <div>
                    <Skeleton className="h-10 w-3/4 mb-2" />
                    <Skeleton className="h-6 w-1/2 mb-1" />
                    <Skeleton className="h-5 w-1/3 mb-6" />

                    <Separator className="my-6" />

                    <Skeleton className="h-8 w-1/4 mb-4" />
                    <div className="space-y-4">
                        {Array.from({ length: 2 }).map((_, index) => (
                            <div key={index} className="border rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <Skeleton className="h-6 w-1/2" />
                                    <Skeleton className="h-8 w-1/4" />
                                </div>
                                <Skeleton className="h-4 w-1/3 mt-1 mb-3" />
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-3/4 mb-3" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ))}
                    </div>

                    <Separator className="my-8" />
                    <Skeleton className="h-8 w-1/3 mb-4" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ProductPageProps {
    params: Promise<{ productSlug: string }>;
}

/**
 * Main page component for displaying product details.
 * It fetches product data based on the slug from the URL,
 * handles loading and error states, and renders the product information
 * using various sub-components.
 */
export default function ProductPage({ params }: ProductPageProps) {
    const resolvedParams = use(params);
    const { productSlug } = resolvedParams;
    const [product, setProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // selectedImage state is now managed by ProductImageGallery
    const [isAddingToCartOfferId, setIsAddingToCartOfferId] = useState<string | null>(null);
    const { data: session, status: sessionStatus } = useSession();

    useEffect(() => {
        // This effect should only run if productSlug is defined and not a known non-product slug.
        if (productSlug && !NON_PRODUCT_SLUGS.includes(productSlug)) {
            setIsLoading(true);
            getProductDetails(productSlug)
                .then(data => {
                    // Only set product data if the component is still mounted and the slug matches
                    // This check can be useful if the slug changes quickly
                    if (productSlug === resolvedParams.productSlug) {
                        setProduct(data);
                    }
                })
                .finally(() => {
                    if (productSlug === resolvedParams.productSlug) {
                        setIsLoading(false);
                    }
                });
        } else {
            // If it's a non-product slug or slug is undefined, stop loading.
            // Next.js router should handle navigation to the correct page for these slugs.
            setProduct(null); // Ensure product state is cleared
            setIsLoading(false);
        }
    }, [productSlug, resolvedParams.productSlug]); // Add resolvedParams.productSlug to dependencies

    // Display skeleton if loading and it's potentially a product page.
    if (isLoading && productSlug && !NON_PRODUCT_SLUGS.includes(productSlug)) {
        return <ProductPageSkeleton />;
    }

    // If not loading and no product data (and it was a product slug), show not found.
    if (!isLoading && !product && productSlug && !NON_PRODUCT_SLUGS.includes(productSlug)) {
        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <Info className="mx-auto h-16 w-16 text-destructive mb-4" />
                <h1 className="text-3xl font-bold mb-2">Produit non trouvé</h1>
                <p className="text-muted-foreground">
                    Désolé, nous n&apos;avons pas pu trouver le produit que vous recherchez.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/">Retour à l&apos;accueil</Link>
                </Button>
            </div>
        );
    }

    // If product is still null here, it implies it's a non-product slug
    // or another unhandled case. Return null to prevent rendering errors.
    // The Next.js router should ideally handle these paths separately.
    if (!product) {
        // This might happen if productSlug is one of NON_PRODUCT_SLUGS,
        // and the earlier checks didn't lead to a return.
        // In this scenario, this page component shouldn't attempt to render product details.
        return null;
    }

    const handleAddToCart = async (offer: Offer) => {
        if (sessionStatus !== 'authenticated' || !session?.user) {
            toast.error("Veuillez vous connecter pour ajouter des articles au panier.");
            return;
        }

        if (!product) return;

        setIsAddingToCartOfferId(offer._id);
        try {
            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    offerId: offer._id,
                    productModelId: product._id, // product is available in this scope
                    quantity: 1,
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                toast.success(`${product.title} a été ajouté à votre panier !`, {
                    description: `Vendeur: ${offer.seller.name || 'N/A'}, Prix: ${offer.price}€`,
                    action: {
                        label: "Voir le panier",
                        onClick: () => { window.location.href = '/cart'; }
                    }
                });
            } else {
                // Gestion d'erreur améliorée
                if (result.message && result.message.includes("Le vendeur n'a pas configuré d'adresse d'expédition")) {
                     toast.error("Ajout impossible", { 
                        description: "Le vendeur de cette offre n'a pas encore renseigné d'adresse d'expédition. Vous ne pouvez pas acheter cet article pour le moment.",
                     });
                } else {
                    throw new Error(result.message || "Erreur lors de l'ajout au panier.");
                }
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue s'est produite.";
            toast.error("Erreur Panier", { description: errorMessage });
        } finally {
            setIsAddingToCartOfferId(null);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                {/* Colonne Image Produit - Replaced with component */}
                <ProductImageGallery
                    productTitle={product.title}
                    standardImageUrls={product.standardImageUrls}
                />

                {/* Colonne Informations Produit et Offres */}
                <div>
                    <ProductMetaInfo
                        category={product.category}
                        brand={product.brand}
                        title={product.title}
                        variantTitle={product.variantTitle}
                        offerCount={product.offers.length}
                    />

                    <Separator className="my-6" />

                    <Tabs defaultValue="offers" className="w-full">
                        <TabsContent value="offers">
                            <ProductOffersList
                                offers={product.offers}
                                handleAddToCart={handleAddToCart}
                                isAddingToCartOfferId={isAddingToCartOfferId}
                                sessionStatus={sessionStatus}
                            />
                        </TabsContent>

                        <Separator className="my-8" />

                        <LedenicheurPriceInfo
                            averagePriceLedenicheur={product.averagePriceLedenicheur}
                            sourceUrlLedenicheur={product.sourceUrlLedenicheur}
                        />

                        <ProductDetailsTabs
                            keyFeatures={product.keyFeatures}
                            specifications={product.specifications}
                            optionChoicesLedenicheur={product.optionChoicesLedenicheur}
                        />
                    </Tabs>
                </div>
            </div>
        </div>
    );
}