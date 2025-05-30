'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import Image from 'next/image';
import { Edit3, Trash2, PlusCircle, AlertTriangle, Info, Package, Loader2 } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';
import type { SellerOffer } from './types';
import { useRouter } from 'next/navigation';

export interface ProductModelInfo {
    id: string;
    name: string;
    imageUrl?: string;
}

// Constants for translations to avoid magic strings and improve maintainability
const CONDITIONS_MAP: Record<SellerOffer['condition'], string> = {
    'new': 'Neuf',
    'used_likenew': 'Comme neuf',
    'used_good': 'Bon état',
    'used_fair': 'État correct',
};

const STATUS_MAP: Record<SellerOffer['status'], string> = {
    'available': 'Disponible',
    'reserved': 'Réservée',
    'sold': 'Vendu',
    'pending_shipment': 'Envoi en attente',
    'shipped': 'Expédiée',
    'delivered': 'Livrée',
    'cancelled': 'Annulée',
    'archived': 'Archivée',
};

// Helper function to get badge variant based on status
const getStatusBadgeVariant = (status: SellerOffer['status']): 'default' | 'destructive' | 'outline' | 'secondary' => {
    switch (status) {
        case 'available': return 'default';
        case 'sold': return 'destructive';
        case 'pending_shipment': return 'outline';
        case 'archived': return 'secondary';
        default: return 'default';
    }
};

/**
 * Fetches all offers for a given seller ID.
 * @param userId - The ID of the seller.
 * @returns A promise that resolves to an array of SellerOffer.
 */
async function fetchSellerOffers(userId: string): Promise<SellerOffer[]> {
    if (!userId) return [];

    try {
        const response = await fetch(`/api/users/${userId}/offers`);
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', errorData.message || response.statusText);
            throw new Error(`Failed to fetch offers: ${errorData.message || response.statusText}`);
        }
        const offers: SellerOffer[] = await response.json();
        return offers;
    } catch (error) {
        console.error('Error fetching seller offers:', error);
        // Propager l'erreur pour qu'elle soit gérée dans le useEffect
        throw error;
    }
}

/**
 * Displays a skeleton loader for the seller dashboard page.
 */
function SellerDashboardSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-7 w-1/2" />
                <Skeleton className="h-4 w-3/4 mt-1" />
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="hidden sm:table-cell w-[80px]"><Skeleton className="h-5 w-full" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-3/4" /></TableHead>
                            <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-1/2" /></TableHead>
                            <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-1/2" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-1/2" /></TableHead>
                            <TableHead className="hidden lg:table-cell"><Skeleton className="h-5 w-3/4" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-5 w-1/4 ml-auto" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell className="hidden sm:table-cell"><Skeleton className="h-12 w-12 rounded-md" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-full mb-1" /><Skeleton className="h-3 w-3/4 sm:hidden" /></TableCell>
                                <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                                <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

/**
 * SellerDashboardPage: Displays the seller's offers, allowing them to manage their listings.
 * Handles loading, error states, and fetches offers based on the authenticated user.
 */
export default function SellerDashboardPage() {
    const { data: session, status: sessionStatus } = useSession();
    const [offers, setOffers] = useState<SellerOffer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingOffers, setDeletingOffers] = useState<Record<string, boolean>>({});
    const router = useRouter();

    // Memoized fetch function to avoid re-creation on every render
    const loadOffers = useCallback(async (userId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedOffers = await fetchSellerOffers(userId);
            setOffers(fetchedOffers);
        } catch (err) {
            console.error('Erreur lors du chargement des offres:', err);
            const errorMessage = err instanceof Error ? err.message : 'Impossible de charger vos offres pour le moment.';
            setError(errorMessage);
            toast.error("Erreur de chargement", { description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fonction pour recharger les offres utilisateur
    const fetchUserOffers = useCallback(() => {
        const userId = (session?.user as { id?: string })?.id;
        if (userId) {
            loadOffers(userId);
        }
    }, [session, loadOffers]);

    useEffect(() => {
        const userId = (session?.user as { id?: string })?.id;
        if (sessionStatus === 'authenticated' && userId) {
            loadOffers(userId);
        } else if (sessionStatus === 'unauthenticated') {
            setError("Veuillez vous connecter pour voir vos offres.");
            setIsLoading(false);
        } else if (sessionStatus === 'loading') {
            setIsLoading(true); // Explicitly set loading true while session is resolving
        }
    }, [sessionStatus, session, loadOffers]);

    /**
     * Placeholder for editing an offer.
     * @param offerId - The ID of the offer to edit.
     */
    const handleModifyOffer = (offerId: string) => {
        // console.log(`Modifier l'offre: ${offerId}`);
        router.push(`/account/sell/edit/${offerId}`);
    };

    /**
     * Placeholder for deleting an offer. Shows a confirmation toast.
     * @param offerId - The ID of the offer to delete.
     */
    const handleDeleteOffer = async (offerId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) {
            return;
        }

        try {
            setDeletingOffers(prev => ({ ...prev, [offerId]: true }));

            // console.log(`Suppression de l'offre: ${offerId}`);

            const response = await fetch(`/api/offers/${offerId}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Offre supprimée avec succès");
                // Recharger les offres
                fetchUserOffers();
            } else {
                toast.error(result.message || "Erreur lors de la suppression");
            }
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            toast.error("Erreur lors de la suppression de l'offre");
        } finally {
            setDeletingOffers(prev => ({ ...prev, [offerId]: false }));
        }
    };

    if (sessionStatus === 'loading' || (isLoading && sessionStatus !== 'unauthenticated')) {
        return (
            <div className="container mx-auto py-8">
                <div className="flex justify-between items-center mb-8">
                    <Skeleton className="h-9 w-1/3" />
                    <Skeleton className="h-10 w-48" />
                </div>
                <SellerDashboardSkeleton />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto py-8 text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <h2 className="text-xl font-semibold mb-2 text-destructive">Erreur</h2>
                <p className="text-muted-foreground">{error}</p>
                {sessionStatus === 'unauthenticated' &&
                    <Button asChild className="mt-6"><Link href="/signin">Se connecter</Link></Button>
                }
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Mes Offres</h1>
                <Button asChild>
                    <Link href="/account/sell"><PlusCircle className="mr-2 h-4 w-4" />Ajouter une nouvelle offre</Link>
                </Button>
            </div>

            {offers.length === 0 ? (
                <Card className="text-center py-10 sm:py-16">
                    <CardHeader>
                        <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <CardTitle className="text-2xl">Aucune offre pour le moment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            Vous n&apos;avez pas encore d&apos;articles en vente. Commencez par ajouter votre premier produit et touchez des milliers d&apos;acheteurs potentiels !
                        </p>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <Button asChild size="lg">
                            <Link href="/account/sell"><PlusCircle className="mr-2 h-5 w-5" />Mettre un article en vente</Link>
                        </Button>
                    </CardFooter>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Liste de vos offres</CardTitle>
                        <CardDescription>Gérez ici les articles que vous avez mis en vente sur ReMarket.</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="hidden sm:table-cell w-[64px] px-2">Image</TableHead>
                                    <TableHead>Produit</TableHead>
                                    <TableHead className="text-right hidden md:table-cell">Prix</TableHead>
                                    <TableHead className="hidden md:table-cell">État</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="hidden lg:table-cell">Mise en vente</TableHead>
                                    <TableHead className="text-right px-2">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {offers.map((offer) => (
                                    <TableRow key={offer.id}>
                                        <TableCell className="hidden sm:table-cell px-2">
                                            {offer.productModel.imageUrl ? (
                                                <Image src={offer.productModel.imageUrl} alt={offer.productModel.name} width={48} height={48} className="h-12 w-12 object-cover rounded-md border" />
                                            ) : (
                                                <div className="h-12 w-12 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground border">
                                                    <Package className="h-6 w-6" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium group-hover:text-primary transition-colors">
                                                <Link href={`/account/sell/edit/${offer.id}`} className="hover:underline" title={`Modifier ${offer.productModel.name}`}>{offer.productModel.name}</Link>
                                            </div>
                                            <div className="text-xs text-muted-foreground md:hidden">
                                                {offer.price.toLocaleString('fr-FR', { style: 'currency', currency: offer.currency })} - {CONDITIONS_MAP[offer.condition] || offer.condition}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right hidden md:table-cell">{offer.price.toLocaleString('fr-FR', { style: 'currency', currency: offer.currency })}</TableCell>
                                        <TableCell className="hidden md:table-cell">{CONDITIONS_MAP[offer.condition] || offer.condition}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(offer.status)} className="capitalize text-xs whitespace-nowrap">
                                                {STATUS_MAP[offer.status] || offer.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{new Date(offer.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                                        <TableCell className="text-right px-2">
                                            <div className="flex justify-end items-center space-x-1 sm:space-x-2">
                                                {(offer.status === 'available' || offer.status === 'archived') && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleModifyOffer(offer.id)} title="Modifier l'offre">
                                                        <Edit3 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {(offer.status === 'available' || offer.status === 'archived') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteOffer(offer.id)}
                                                        title="Supprimer l'offre"
                                                        className="text-destructive hover:text-destructive/90"
                                                        disabled={deletingOffers[offer.id]}
                                                    >
                                                        {deletingOffers[offer.id] ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                )}
                                                {/* Ajouter d'autres actions si nécessaire, ex: voir l'annonce publique */}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 