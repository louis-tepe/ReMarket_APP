'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Package, Truck, CheckCircle } from 'lucide-react';
import { IProductBase } from '@/lib/mongodb/models/SellerProduct';

// Assuming IProductBase includes populated seller and productModel
type Purchase = IProductBase & {
  productModel: { product: { title: string; images: string[] }};
  seller: { name: string };
}

// Map statuses to UI elements
const statusConfig = {
    pending_shipment: { text: "En attente d'expédition", icon: Package, color: 'bg-yellow-500' },
    shipped: { text: "Expédié", icon: Truck, color: 'bg-blue-500' },
    delivered: { text: "Livré", icon: CheckCircle, color: 'bg-green-500' },
    // Add other statuses as needed
};

export default function PurchasesPage() {
    const { data: session } = useSession();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (session?.user?.id) {
            fetch(`/api/purchases?userId=${session.user.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        console.error('Failed to fetch purchases:', data.message);
                        setPurchases([]);
                    } else {
                        setPurchases(data);
                    }
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error('An error occurred while fetching purchases:', err);
                    setIsLoading(false);
                });
        } else if (session === null) {
            // If session is loaded and there's no user, stop loading.
            setIsLoading(false);
        }
    }, [session]);

    if (isLoading) {
        return <div>Chargement des achats...</div>;
    }

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Mes Achats</h1>
            <div className="space-y-6">
                {purchases.length > 0 ? purchases.map(purchase => {
                    const statusInfo = purchase.transactionStatus ? statusConfig[purchase.transactionStatus as keyof typeof statusConfig] : null;
                    return (
                        <Card key={purchase._id.toString()}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg">{purchase.productModel.product.title}</CardTitle>
                                <Badge>{purchase.price} {purchase.currency}</Badge>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1">
                                    <Image
                                        src={purchase.productModel.product.images[0] || '/images/placeholder-product.webp'}
                                        alt={purchase.productModel.product.title}
                                        width={150}
                                        height={150}
                                        className="rounded-lg object-cover"
                                    />
                                    <p className="text-sm text-muted-foreground mt-2">Vendu par : <span className="font-semibold">{purchase.seller.name}</span></p>
                                </div>
                                <div className="md:col-span-2">
                                    <h3 className="font-semibold mb-2">Suivi de la commande</h3>
                                    {statusInfo ? (
                                        <div className="flex items-center">
                                            <statusInfo.icon className={`h-6 w-6 mr-3 p-1 rounded-full text-white ${statusInfo.color}`} />
                                            <div>
                                                <p className="font-medium">{statusInfo.text}</p>
                                                {purchase.shippingInfo?.trackingNumber && (
                                                    <p className="text-sm text-muted-foreground">
                                                        N° de suivi : {purchase.shippingInfo.trackingNumber}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">Statut indisponible</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                }) : (
                    <p>Vous n'avez encore effectué aucun achat.</p>
                )}
            </div>
        </div>
    );
}
