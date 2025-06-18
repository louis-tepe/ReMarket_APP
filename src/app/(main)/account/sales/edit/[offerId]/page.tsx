'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Construction } from 'lucide-react';
import Link from 'next/link';

export default function EditOfferPage() {
    const params = useParams();
    const offerId = params.offerId as string;

    return (
        <div className="container mx-auto py-8 px-4 md:px-0">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/account/sales">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Retour aux offres
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold">Modifier l&apos;offre</h1>
            </div>

            <Card className="max-w-2xl mx-auto">
                <CardHeader className="text-center">
                    <Construction className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <CardTitle>Fonctionnalité en développement</CardTitle>
                    <CardDescription>
                        La modification des offres sera bientôt disponible
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-muted-foreground">
                        ID de l&apos;offre à modifier : <span className="font-mono font-semibold">{offerId}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Cette page permettra de modifier les détails de votre offre : prix, état, description, images, etc.
                    </p>
                    <div className="pt-4">
                        <Button asChild>
                            <Link href="/account/sales">
                                Retour à mes offres
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 