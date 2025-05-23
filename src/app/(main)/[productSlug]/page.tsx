'use client'; // Pour useEffect et useState

import { useEffect, useState, use } from 'react';
import Image from 'next/image';
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Info, Tag, CheckCircle, Package, ZoomIn, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Link from 'next/link';
import { useSession } from "next-auth/react";
import { toast } from "sonner";

// Types (doivent correspondre à ceux de l'API /api/products/[slug])
interface SellerOffer {
    id: string;
    seller: { id: string, name?: string };
    price: number;
    currency: string;
    quantity: number;
    condition: 'new' | 'used_likenew' | 'used_good' | 'used_fair';
    sellerDescription?: string;
    sellerPhotos?: string[];
}

interface BrandOrCategory {
    name: string;
    slug: string;
}

interface ProductDetails {
    id: string;
    slug: string;
    title: string;
    brand: BrandOrCategory;
    category: BrandOrCategory;
    standardDescription: string;
    standardImageUrls: string[];
    keyFeatures?: string[];
    specifications?: { label: string; value: string; unit?: string }[];
    offers: SellerOffer[];
    sourceUrlIdealo?: string;
    variantTitle?: string;
    priceNewIdealo?: number;
    priceUsedIdealo?: number;
    optionChoicesIdealo?: { optionName: string; availableValues: string[] }[];
    qasIdealo?: { question: string; answer: string }[];
}

async function getProductDetails(slug: string): Promise<ProductDetails | null> {
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
                            <Card key={index}>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-6 w-1/2" />
                                        <Skeleton className="h-8 w-1/4" />
                                    </div>
                                    <Skeleton className="h-4 w-1/3 mt-1" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-4 w-full mb-2" />
                                    <Skeleton className="h-4 w-3/4" />
                                </CardContent>
                                <CardFooter>
                                    <Skeleton className="h-10 w-full" />
                                </CardFooter>
                            </Card>
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

export default function ProductPage({ params }: ProductPageProps) {
    const resolvedParams = use(params);
    const { productSlug } = resolvedParams;
    const [product, setProduct] = useState<ProductDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAddingToCart, setIsAddingToCart] = useState<string | null>(null);
    const { data: session, status: sessionStatus } = useSession();

    useEffect(() => {
        if (productSlug) {
            setIsLoading(true);
            getProductDetails(productSlug)
                .then(data => {
                    setProduct(data);
                    if (data && data.standardImageUrls.length > 0) {
                        setSelectedImage(data.standardImageUrls[0]);
                    }
                })
                .finally(() => setIsLoading(false));
        }
    }, [productSlug]);

    if (isLoading) {
        return <ProductPageSkeleton />;
    }

    if (!product) {
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

    const handleAddToCart = async (offer: SellerOffer) => {
        if (sessionStatus !== 'authenticated' || !session?.user) {
            toast.error("Veuillez vous connecter pour ajouter des articles au panier.");
            return;
        }

        if (!product) return;

        setIsAddingToCart(offer.id);
        try {
            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    offerId: offer.id,
                    productModelId: product.id,
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
                throw new Error(result.message || "Erreur lors de l'ajout au panier.");
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue s'est produite.";
            toast.error("Erreur Panier", { description: errorMessage });
        } finally {
            setIsAddingToCart(null);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                {/* Colonne Image Produit */}
                <div className="sticky top-24 self-start">
                    {selectedImage && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <div className="aspect-square w-full bg-muted rounded-lg overflow-hidden cursor-zoom-in relative group">
                                    <Image
                                        src={selectedImage}
                                        alt={`Image principale de ${product.title}`}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        className="object-contain group-hover:scale-105 transition-transform duration-300"
                                        priority={true}
                                    />
                                    <div className="absolute bottom-2 right-2 bg-black/50 text-white p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ZoomIn className="h-5 w-5" />
                                    </div>
                                </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh]">
                                <DialogHeader>
                                    <DialogTitle>{product.title}</DialogTitle>
                                </DialogHeader>
                                <div className="relative aspect-square w-full h-auto">
                                    <Image
                                        src={selectedImage}
                                        alt={`Image agrandie de ${product.title}`}
                                        fill
                                        sizes="(max-width: 1024px) 90vw, 800px"
                                        className="object-contain"
                                    />
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                    {product.standardImageUrls.length > 1 && (
                        <div className="mt-4 grid grid-cols-4 gap-2">
                            {product.standardImageUrls.map((url, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedImage(url)}
                                    className={`aspect-square w-full bg-muted rounded overflow-hidden border-2 ${selectedImage === url ? 'border-primary' : 'border-transparent'} hover:border-primary/50 transition-all`}
                                >
                                    <Image src={url} alt={`Miniature ${index + 1} de ${product.title}`} width={100} height={100} className="object-contain h-full w-full" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Colonne Informations Produit et Offres */}
                <div>
                    <Badge variant="outline" className="mb-2">{product.category?.name} {product.brand?.name ? `> ${product.brand.name}` : ''}</Badge>
                    <h1 className="text-3xl lg:text-4xl font-bold mb-1">{product.title}</h1>
                    {product.variantTitle && (
                        <p className="text-lg text-muted-foreground mb-1">{product.variantTitle}</p>
                    )}
                    <p className="text-lg text-muted-foreground mb-1">Par <span className="font-semibold text-foreground">{product.brand?.name || 'Marque inconnue'}</span></p>
                    {/* TODO: Afficher le nombre d'offres disponibles */}
                    <p className="text-sm text-primary mb-6">{product.offers.length} offre(s) disponible(s)</p>

                    <Separator className="my-6" />

                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4 flex items-center">
                            <Tag className="h-6 w-6 mr-2 text-primary" /> Choisir une offre ReMarket
                        </h2>
                        {product.offers.length > 0 ? (
                            <div className="space-y-4">
                                {product.offers.map((offer) => (
                                    <Card key={offer.id} className="shadow-sm hover:shadow-md transition-shadow bg-card">
                                        <CardHeader className="pb-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="text-xl">{offer.price.toLocaleString('fr-FR', { style: 'currency', currency: offer.currency })}</CardTitle>
                                                    <CardDescription className="mt-1">Vendu par : <span className="font-medium text-foreground">{offer.seller.name || 'Vendeur anonyme'}</span></CardDescription>
                                                </div>
                                                <Badge variant={offer.condition === 'new' || offer.condition === 'used_likenew' ? 'default' : 'secondary'} className="capitalize">
                                                    {offer.condition.replace('used_likenew', 'comme neuf').replace('used_good', 'bon état').replace('used_fair', 'état correct').replace('new', 'neuf')}
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
                                                onClick={() => handleAddToCart(offer)}
                                                disabled={isAddingToCart === offer.id || sessionStatus === 'loading'}
                                            >
                                                {isAddingToCart === offer.id ?
                                                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Ajout...</> :
                                                    <><ShoppingCart className="mr-2 h-5 w-5" /> Ajouter au panier</>
                                                }
                                            </Button>
                                        </CardFooter>
                                    </Card>
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

                    <Separator className="my-8" />

                    {(product.priceNewIdealo || product.priceUsedIdealo || product.sourceUrlIdealo) && (
                        <div className="mb-8 p-4 border rounded-lg bg-muted/50">
                            <h3 className="text-lg font-semibold mb-3 flex items-center"><Info className="h-5 w-5 mr-2 text-blue-500" /> Informations de référence (Idealo)</h3>
                            <div className="space-y-1 text-sm">
                                {product.priceNewIdealo && (
                                    <p>Prix neuf constaté : <span className="font-semibold">{product.priceNewIdealo.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span></p>
                                )}
                                {product.priceUsedIdealo && (
                                    <p>Prix occasion constaté : <span className="font-semibold">{product.priceUsedIdealo.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span></p>
                                )}
                                {product.sourceUrlIdealo && (
                                    <p>Source : <a href={product.sourceUrlIdealo} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Voir sur Idealo</a></p>
                                )}
                            </div>
                        </div>
                    )}

                    <Tabs defaultValue="description" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-4">
                            <TabsTrigger value="description">Description</TabsTrigger>
                            {product.keyFeatures && product.keyFeatures.length > 0 && <TabsTrigger value="features">Points Clés</TabsTrigger>}
                            {product.specifications && product.specifications.length > 0 && <TabsTrigger value="specs">Spécifications</TabsTrigger>}
                            {product.optionChoicesIdealo && product.optionChoicesIdealo.length > 0 && <TabsTrigger value="options">Options</TabsTrigger>}
                            {product.qasIdealo && product.qasIdealo.length > 0 && <TabsTrigger value="qas">Q&R</TabsTrigger>}
                        </TabsList>
                        <TabsContent value="description">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Description Standardisée</CardTitle>
                                </CardHeader>
                                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                                    <p>{product.standardDescription || 'Aucune description détaillée disponible.'}</p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        {product.keyFeatures && product.keyFeatures.length > 0 && (
                            <TabsContent value="features">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Caractéristiques Principales</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                            {product.keyFeatures.map((feature, index) => (
                                                <li key={index} className="flex items-start">
                                                    <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        )}
                        {product.specifications && product.specifications.length > 0 && (
                            <TabsContent value="specs">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Détails Techniques</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2 text-sm">
                                            {product.specifications.map((spec, index) => (
                                                <li key={index} className="flex justify-between border-b pb-1 last:border-b-0">
                                                    <span className="font-medium text-foreground">{spec.label}:</span>
                                                    <span className="text-muted-foreground">{spec.value}{spec.unit ? ` ${spec.unit}` : ''}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        )}
                    </Tabs>
                </div>
            </div>
        </div>
    );
}