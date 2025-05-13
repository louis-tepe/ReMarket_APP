'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import Image from 'next/image';
import { Edit3, Trash2 } from 'lucide-react';

// TODO: Récupérer l'ID de l'utilisateur connecté via NextAuth
const LOGGED_IN_USER_ID = 'simulated-user-id';

interface ProductModelInfo {
    id: string;
    name: string;
    imageUrl?: string;
}

interface Offer {
    id: string;
    productModel: ProductModelInfo;
    price: number;
    condition: string;
    status: 'available' | 'sold' | 'pending_shipment' | 'archived'; // Exemple de statuts
    createdAt: string;
}

async function fetchSellerOffers(userId: string): Promise<Offer[]> {
    // TODO: Remplacer par un appel réel à GET /api/users/${userId}/offers
    console.log(`Appel simulé à fetchSellerOffers pour l'utilisateur ${userId}`);
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                {
                    id: 'offer1',
                    productModel: { id: 'prod1', name: 'iPhone 13 Pro', imageUrl: 'https://via.placeholder.com/150/ FFA500/FFFFFF?Text=Produit1' },
                    price: 700,
                    condition: 'used_good',
                    status: 'available',
                    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // Il y a 2 jours
                },
                {
                    id: 'offer2',
                    productModel: { id: 'prod2', name: 'MacBook Air M1', imageUrl: 'https://via.placeholder.com/150/4CAF50/FFFFFF?Text=Produit2' },
                    price: 900,
                    condition: 'used_likenew',
                    status: 'sold',
                    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), // Il y a 5 jours
                },
                {
                    id: 'offer3',
                    productModel: { id: 'prod3', name: 'Sony WH-1000XM4', imageUrl: 'https://via.placeholder.com/150/2196F3/FFFFFF?Text=Produit3' },
                    price: 250,
                    condition: 'used_good',
                    status: 'pending_shipment',
                    createdAt: new Date().toISOString(),
                },
            ]);
        }, 1000);
    });
}

export default function SellerDashboardPage() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadOffers = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const fetchedOffers = await fetchSellerOffers(LOGGED_IN_USER_ID);
                setOffers(fetchedOffers);
            } catch (err) {
                console.error('Erreur lors du chargement des offres:', err);
                setError('Impossible de charger vos offres pour le moment.');
            }
            setIsLoading(false);
        };
        loadOffers();
    }, []);

    const handleEditOffer = (offerId: string) => {
        // TODO: Implémenter la navigation vers une page d'édition ou un modal
        console.log(`Modifier l'offre: ${offerId}`);
        // router.push(`/vendre/modifier/${offerId}`); Ou une logique similaire
        alert(`Simulation: Modifier l'offre ${offerId}`)
    };

    const handleDeleteOffer = async (offerId: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette offre ? Cette action est irréversible.")) {
            console.log(`Supprimer l'offre: ${offerId}`);
            // TODO: Implémenter l'appel API DELETE /api/offers/${offerId}
            // Puis rafraîchir la liste ou filtrer l'offre supprimée
            // Exemple: setOffers(prevOffers => prevOffers.filter(offer => offer.id !== offerId));
            alert(`Simulation: Supprimer l'offre ${offerId}`)
        }
    };

    const getStatusBadgeVariant = (status: Offer['status']) => {
        switch (status) {
            case 'available': return 'default';
            case 'sold': return 'destructive'; // Ou une couleur signifiant le succès/la finalisation
            case 'pending_shipment': return 'outline';
            default: return 'secondary';
        }
    };

    if (isLoading) {
        return <div className="text-center py-10">Chargement de vos offres...</div>;
    }

    if (error) {
        return <div className="text-center py-10 text-red-600">{error}</div>;
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Mes Offres Actives</h1>
                <Button asChild>
                    <Link href="/vendre">Ajouter une nouvelle offre</Link>
                </Button>
            </div>

            {offers.length === 0 && !isLoading && (
                <Card>
                    <CardHeader>
                        <CardTitle>Aucune offre pour le moment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">
                            Vous n&apos;avez pas encore d&apos;articles en vente. Commencez par ajouter votre premier produit !
                        </p>
                        <Button asChild>
                            <Link href="/vendre">Mettre un article en vente</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {offers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Liste de vos offres</CardTitle>
                        <CardDescription>Gérez ici les articles que vous avez mis en vente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="hidden sm:table-cell">Produit</TableHead>
                                    <TableHead>Nom</TableHead>
                                    <TableHead className="hidden md:table-cell">Prix</TableHead>
                                    <TableHead className="hidden md:table-cell">État</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="hidden lg:table-cell">Date d&apos;ajout</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {offers.map((offer) => (
                                    <TableRow key={offer.id}>
                                        <TableCell className="hidden sm:table-cell">
                                            {offer.productModel.imageUrl ? (
                                                <Image src={offer.productModel.imageUrl} alt={offer.productModel.name} width={48} height={48} className="h-12 w-12 object-cover rounded-md" />
                                            ) : (
                                                <div className="h-12 w-12 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                                                    Pas d&apos;image
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{offer.productModel.name}</div>
                                            <div className="text-xs text-muted-foreground sm:hidden">
                                                {offer.price.toFixed(2)} € - {offer.condition}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">{offer.price.toFixed(2)} €</TableCell>
                                        <TableCell className="hidden md:table-cell">{offer.condition}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(offer.status)}>{offer.status.replace('_', ' ')}</Badge>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell">{new Date(offer.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end items-center space-x-2">
                                                {(offer.status === 'available') && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditOffer(offer.id)} title="Modifier">
                                                        <Edit3 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {(offer.status === 'available' || offer.status === 'archived') && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteOffer(offer.id)} title="Supprimer" className="text-destructive hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
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