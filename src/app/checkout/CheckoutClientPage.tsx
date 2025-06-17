'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ServicePointSelector from './components/ServicePointSelector';
import { Separator } from '@/components/ui/separator';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!publishableKey) {
    // Cette erreur est destinée au développeur, pour signaler une mauvaise configuration.
    throw new Error('La clé publique Stripe est manquante. Veuillez vérifier votre fichier .env.local et redémarrer le serveur.');
}

const stripePromise = loadStripe(publishableKey);

interface ServicePoint {
  id: number;
  name: string;
}

function CheckoutForm({ isServicePointSelected }: { isServicePointSelected: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      toast.error("Stripe.js n'a pas encore chargé.");
      return;
    }
    if (!isServicePointSelected) {
        toast.error("Veuillez sélectionner un point de livraison avant de payer.");
        return;
    }
    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
    });

    if (error.type === "card_error" || error.type === "validation_error") {
      toast.error(error.message || 'Une erreur de validation est survenue.');
    } else {
      toast.error('Une erreur inattendue est survenue.');
    }
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <PaymentElement id="payment-element" options={{ layout: "tabs" }} />
        <Button disabled={isLoading || !stripe || !elements || !isServicePointSelected} className="w-full" type="submit">
            {isLoading ? 'Traitement...' : 'Payer maintenant'}
        </Button>
    </form>
  );
}

function StripeCheckout() {
    const searchParams = useSearchParams();
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<ServicePoint | null>(null);
    const amountParam = searchParams.get('amount');
    const offerId = searchParams.get('offerId');
    const amount = amountParam ? Number(amountParam) : 0;

    useEffect(() => {
        async function fetchClientSecret() {
            if (!selectedPoint) return; // Wait for service point selection
            try {
                const res = await fetch('/api/payment/create-intent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        amount,
                        offerId,
                        servicePointId: selectedPoint.id 
                    }),
                });
                if (!res.ok) {
                    const errorData = await res.text();
                    throw new Error(`Erreur du serveur: ${errorData}`);
                }
                const data = await res.json();
                setClientSecret(data.clientSecret);
            } catch (error: any) {
                console.error(error);
                toast.error(`Impossible d'initialiser le paiement: ${error.message}`);
            }
        }
        if (amount > 0 && offerId && selectedPoint) {
            fetchClientSecret();
        }
    }, [amount, offerId, selectedPoint]);

    const handleCreateShipment = async () => {
        if (!offerId || !selectedPoint) {
            toast.error("Données manquantes pour créer l'expédition.");
            return;
        }
        // This would be called by the Stripe webhook after successful payment
        console.log("Simulating shipment creation call with:", { offerId, servicePointId: selectedPoint.id });
    };

    if (amount <= 0) {
        return (
            <div className="container mx-auto py-10 text-center">
                <h1 className="text-2xl font-bold text-red-600">Montant invalide</h1>
                <p>Le montant pour le paiement est manquant ou incorrect.</p>
            </div>
        );
    }
    
    const options: StripeElementsOptions = {
        clientSecret: clientSecret || undefined,
        appearance: { theme: 'stripe' },
    };

    return (
        <div className="w-full max-w-md mx-auto p-4">
            <h1 className="text-2xl font-bold text-center mb-2">Finaliser ma commande</h1>
            <p className="text-center text-xl font-semibold mb-6">{amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">1. Choisissez votre point de livraison</h2>
              <ServicePointSelector onSelectPoint={setSelectedPoint} />
            </div>

            <Separator className="my-6" />

            <div className={!selectedPoint ? 'opacity-50' : ''}>
              <h2 className="text-lg font-semibold mb-2">2. Procédez au paiement</h2>
              {clientSecret ? (
                  <Elements options={options} stripe={stripePromise} key={clientSecret}>
                      <CheckoutForm isServicePointSelected={!!selectedPoint} />
                  </Elements>
              ) : (
                  <div className="text-center"><p>Initialisation du paiement...</p></div>
              )}
            </div>
        </div>
    );
}

export default function StripeCheckoutProvider() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <StripeCheckout />
    </Suspense>
  )
} 