import { stripe } from "@/lib/stripe";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getPaymentDetails(paymentIntentId: string) {
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        return {
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
        };
    } catch (error) {
        console.error("Failed to retrieve payment intent:", error);
        return null;
    }
}

export default async function CheckoutSuccessPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const paymentIntentId = searchParams?.payment_intent as string;

    if (!paymentIntentId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <XCircleIcon className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold">Erreur de paiement</h1>
                <p className="text-muted-foreground">ID de transaction non trouvé.</p>
                <Button asChild className="mt-6">
                    <Link href="/">Retour à l'accueil</Link>
                </Button>
            </div>
        );
    }
    
    const paymentDetails = await getPaymentDetails(paymentIntentId);

    if (!paymentDetails || paymentDetails.status !== 'succeeded') {
         return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <XCircleIcon className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold">Paiement échoué</h1>
                <p className="text-muted-foreground">
                    Votre paiement n'a pas pu être traité. Veuillez réessayer.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/checkout">Réessayer le paiement</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 flex justify-center">
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
                            <Link href="/account/sales">Voir mes commandes</Link>
                        </Button>
                         <Button asChild variant="outline">
                            <Link href="/">Continuer mes achats</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 