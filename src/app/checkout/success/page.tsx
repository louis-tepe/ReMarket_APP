'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { Skeleton } from '@/components/ui/skeleton';

type PaymentDetails = {
    status: string;
    amount: number;
    currency: string;
};

function CheckoutSuccessContent() {
    const searchParams = useSearchParams();
    const paymentIntentId = searchParams.get('payment_intent');

    const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!paymentIntentId) {
            setError('ID de transaction non trouvé.');
            setIsLoading(false);
            return;
        }

        async function fetchPaymentDetails() {
            try {
                const response = await fetch(`/api/payment/details?payment_intent_id=${paymentIntentId}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Échec de la récupération des détails du paiement.');
                }
                const data = await response.json();
                if (data.error) {
                    throw new Error(data.error);
                }
                setPaymentDetails(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
            } finally {
                setIsLoading(false);
            }
        }

        fetchPaymentDetails();
    }, [paymentIntentId]);

    if (isLoading) {
        return <LoadingState />;
    }

    if (error || !paymentDetails || paymentDetails.status !== 'succeeded') {
        return <ErrorState message={error || "Votre paiement n'a pas pu être traité. Veuillez réessayer."} />;
    }

    return (
        <Card className="w-full max-w-lg text-center">
            <CardHeader>
                <div className="mx-auto bg-green-100 rounded-full p-3 w-fit">
                    <CheckCircleIcon className="w-12 h-12 text-green-600" />
                </div>
                <CardTitle className="text-2xl font-bold mt-4">Paiement réussi !</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                    Merci pour votre achat. Votre commande est en cours de traitement.
                </p>
                <div className="border-t pt-4">
                    <p className="text-lg font-semibold">
                        Montant payé: {(paymentDetails.amount / 100).toFixed(2)} {paymentDetails.currency.toUpperCase()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        ID de transaction: {paymentIntentId}
                    </p>
                </div>
                <div className="flex justify-center gap-4 mt-6">
                    <Button asChild>
                        <Link href="/account/purchases">Voir mes commandes</Link>
                    </Button>
                     <Button asChild variant="outline">
                        <Link href="/">Continuer mes achats</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function LoadingState() {
    return (
        <Card className="w-full max-w-lg text-center p-8">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-8 w-48 mt-4 mx-auto" />
            <Skeleton className="h-4 w-64 mt-4 mx-auto" />
            <div className="border-t mt-4 pt-4">
                <Skeleton className="h-6 w-32 mx-auto" />
                <Skeleton className="h-4 w-56 mt-2 mx-auto" />
            </div>
        </Card>
    );
}

function ErrorState({ message }: { message: string }) {
    return (
        <Card className="w-full max-w-lg text-center p-8">
            <div className="mx-auto bg-red-100 rounded-full p-3 w-fit">
                <XCircleIcon className="w-12 h-12 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold mt-4">Erreur de paiement</CardTitle>
            <p className="text-muted-foreground mt-2">{message}</p>
            <div className="flex justify-center gap-4 mt-6">
                <Button asChild>
                    <Link href="/">Retour à l&apos;accueil</Link>
                </Button>
            </div>
        </Card>
    );
}

function CheckoutSuccessWrapper() {
    return (
        <Suspense fallback={<LoadingState />}>
            <CheckoutSuccessContent />
        </Suspense>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <div className="container mx-auto py-10 flex justify-center">
            <CheckoutSuccessWrapper />
        </div>
    );
} 