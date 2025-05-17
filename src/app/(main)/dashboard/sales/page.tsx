'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import Image from 'next/image';
import { Edit3, Trash2, PlusCircle, AlertTriangle, Info, Package } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';

interface ProductModelInfo {
    id: string;
    name: string;
    imageUrl?: string;
}

export interface SellerOffer {
    id: string;
    productModel: ProductModelInfo;
    price: number;
    currency: string;
    condition: 'new' | 'used_likenew' | 'used_good' | 'used_fair';
    status: 'available' | 'reserved' | 'sold' | 'pending_shipment' | 'shipped' | 'delivered' | 'cancelled' | 'archived';
    sellerDescription?: string;
    sellerPhotos?: string[];
    createdAt: string;
}

// Fonction pour traduire les conditions en français
const translateCondition = (condition: string): string => {
    const conditionsMap: { [key: string]: string } = {
        'new': 'Neuf',
        'used_likenew': 'Comme neuf',
        'used_good': 'Bon état',
        'used_fair': 'État correct',
    };
    return conditionsMap[condition] || condition;
};

// Fonction pour traduire les statuts en français
const translateStatus = (status: SellerOffer['status']): string => {
    const statusMap: { [key: string]: string } = {
        'available': 'Disponible',
        'reserved': 'Réservée',
        'sold': 'Vendu',
        'pending_shipment': 'Envoi en attente',
        'shipped': 'Expédiée',
        'delivered': 'Livrée',
        'cancelled': 'Annulée',
        'archived': 'Archivée',
    };
    return statusMap[status] || status;
};

async function fetchSellerOffers(userId: string): Promise<SellerOffer[]> {
    // TODO: Remplacer par un appel réel à GET /api/users/${userId}/offers
    // L'API devrait retourner IOffer[] avec productModel peuplé
    if (!userId) return [];
    console.log(`Appel simulé à fetchSellerOffers pour l'utilisateur ${userId}`);
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                {
                    id: 'offer1',
                    productModel: { id: 'prod1', name: 'iPhone 13 Pro', imageUrl: 'https://via.placeholder.com/80/FFA500/FFFFFF?Text=P1' },
                    price: 700,
                    currency: 'EUR',
                    condition: 'used_good',
                    status: 'available',
                    sellerDescription: "En très bon état, quelques micro-rayures sur l'écran.",
                    sellerPhotos: ['https://via.placeholder.com/150'],
                    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
                },
                {
                    id: 'offer2',
                    productModel: { id: 'prod2', name: 'MacBook Air M1', imageUrl: 'https://via.placeholder.com/80/4CAF50/FFFFFF?Text=P2' },
                    price: 900,
                    currency: 'EUR',
                    condition: 'used_likenew',
                    status: 'sold',
                    sellerDescription: "Comme neuf, utilisé pour quelques présentations.",
                    sellerPhotos: ['https://via.placeholder.com/150'],
                    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
                },
                {
                    id: 'offer3',
                    productModel: { id: 'prod3', name: 'Sony WH-1000XM4', imageUrl: 'https://via.placeholder.com/80/2196F3/FFFFFF?Text=P3' },
                    price: 250,
                    currency: 'EUR',
                    condition: 'used_fair',
                    status: 'pending_shipment',
                    sellerPhotos: ['https://via.placeholder.com/150'],
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 'offer4',
                    productModel: { id: 'prod4', name: 'Samsung Odyssey G7' }, // Pas d'image
                    price: 450,
                    currency: 'EUR',
                    condition: 'new',
                    status: 'available',
                    sellerPhotos: ['https://via.placeholder.com/150'],
                    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
                },
            ]);
        }, 1000);
    });
}

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

export default function SellerDashboardPage() {
    const { data: session, status: sessionStatus } = useSession();
    const [offers, setOffers] = useState<SellerOffer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const userId = (session?.user as { id?: string })?.id;

        if (sessionStatus === 'authenticated' && userId) {
            setIsLoading(true);
            setError(null);
            fetchSellerOffers(userId)
                .then(fetchedOffers => setOffers(fetchedOffers))
                .catch(err => {
                    console.error('Erreur lors du chargement des offres:', err);
                    const errorMessage = 'Impossible de charger vos offres pour le moment.';
                    setError(errorMessage);
                    toast.error("Erreur de chargement", { description: errorMessage });
                })
                .finally(() => setIsLoading(false));
        } else if (sessionStatus === 'unauthenticated') {
            setError("Veuillez vous connecter pour voir vos offres.");
            setIsLoading(false);
            // Optionnel: rediriger vers la page de connexion
            // router.push('/signin');
        } else if (sessionStatus === 'loading') {
            setIsLoading(true);
        }
    }, [sessionStatus, session]);

    const handleEditOffer = (offerId: string) => {
        console.log(`Modifier l'offre: ${offerId}`);
        toast.info("Fonctionnalité à venir", { description: `La modification de l'offre ${offerId} sera bientôt disponible.` });
    };

    const handleDeleteOffer = async (offerId: string) => {
        toast("Confirmation requise", {
            description: "Êtes-vous sûr de vouloir supprimer cette offre ? Cette action est irréversible.",
            action: {
                label: "Supprimer",
                onClick: async () => {
                    console.log(`Suppression de l'offre: ${offerId}`);
                    // TODO: Implémenter l'appel API DELETE /api/offers/${offerId}
                    // Puis rafraîchir la liste ou filtrer l'offre supprimée
                    // Exemple: setOffers(prevOffers => prevOffers.filter(offer => offer.id !== offerId));
                    toast.success("Offre supprimée (simulation)", { description: `L'offre ${offerId} a été marquée pour suppression.` });
                },
            },
            cancel: {
                label: "Annuler",
                onClick: () => console.log("Suppression annulée")
            }
        });
    };

    const getStatusBadgeVariant = (status: SellerOffer['status']) => {
        switch (status) {
            case 'available': return 'default';
            case 'sold': return 'destructive';
            case 'pending_shipment': return 'outline';
            case 'archived': return 'secondary';
            default: return 'default';
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
                    <Link href="/sell"><PlusCircle className="mr-2 h-4 w-4" />Ajouter une nouvelle offre</Link>
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
                            <Link href="/sell"><PlusCircle className="mr-2 h-5 w-5" />Mettre un article en vente</Link>
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
                                                <Link href={`/sell/edit/${offer.id}`} className="hover:underline" title={`Modifier ${offer.productModel.name}`}>{offer.productModel.name}</Link>
                                            </div>
                                            <div className="text-xs text-muted-foreground md:hidden">
                                                {offer.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} - {translateCondition(offer.condition)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right hidden md:table-cell">{offer.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</TableCell>
                                        <TableCell className="hidden md:table-cell">{translateCondition(offer.condition)}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(offer.status)} className="capitalize text-xs whitespace-nowrap">
                                                {translateStatus(offer.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{new Date(offer.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                                        <TableCell className="text-right px-2">
                                            <div className="flex justify-end items-center space-x-1 sm:space-x-2">
                                                {(offer.status === 'available' || offer.status === 'archived') && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditOffer(offer.id)} title="Modifier l'offre">
                                                        <Edit3 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {(offer.status === 'available' || offer.status === 'archived') && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteOffer(offer.id)} title="Supprimer l'offre" className="text-destructive hover:text-destructive/90">
                                                        <Trash2 className="h-4 w-4" />
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