import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import StripeCheckoutClient from './StripeCheckoutClient';
import { Suspense } from 'react';

function CheckoutPageWrapper() {
    return (
        <Suspense fallback={<div className="text-center p-10">Chargement du module de paiement...</div>}>
            <StripeCheckoutClient />
        </Suspense>
    );
}

export default async function CheckoutPage() {
    const session = await getServerSession(authOptions);

    // La redirection doit toujours être gérée côté serveur.
    if (!session?.user?.id) {
        // Nous ne pouvons plus passer les searchParams, donc nous redirigeons simplement.
        // L'utilisateur devra recliquer sur le bouton de paiement. C'est un compromis nécessaire.
        return redirect(`/signin?callbackUrl=/cart`);
    }

    return <CheckoutPageWrapper />;
} 