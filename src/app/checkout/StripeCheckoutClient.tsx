'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ServicePointSelector from './components/ServicePointSelector';
import AddressSelector from './components/AddressSelector';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!publishableKey) {
    throw new Error('La clé publique Stripe est manquante. Veuillez vérifier votre fichier .env.local.');
}

const stripePromise = loadStripe(publishableKey);

interface ServicePoint {
  id: number;
  name: string;
}

function CheckoutForm({ isReadyToPay }: { isReadyToPay: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      toast.error("Stripe.js n'a pas encore chargé.");
      return;
    }
    if (!isReadyToPay) {
        toast.error("Veuillez sélectionner une adresse et un point de livraison avant de payer.");
        return;
    }
    setIsLoading(true);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      toast.error(submitError.message || 'Une erreur est survenue lors de la soumission.');
      setIsLoading(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast.error(error.message || 'Une erreur de validation est survenue.');
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      router.push(`/checkout/success?payment_intent=${paymentIntent.id}`);
    } else {
      toast.info("En attente de la confirmation du paiement...");
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <PaymentElement id="payment-element" options={{ layout: "tabs" }} />
        <Button disabled={isLoading || !stripe || !elements || !isReadyToPay} className="w-full" type="submit">
            {isLoading ? 'Traitement...' : 'Payer maintenant'}
        </Button>
    </form>
  );
}

function StripeCheckoutCore() {
    const searchParams = useSearchParams();
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<ServicePoint | null>(null);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

    const isReadyToPay = !!selectedPoint && !!selectedAddressId;
    
    const offerId = searchParams.get('offerId');
    const cartId = searchParams.get('cartId');
    const amount = Number(searchParams.get('amount'));

    useEffect(() => {
        async function fetchClientSecret() {
            if (!isReadyToPay || amount <= 0 || (!offerId && !cartId)) return;
            try {
                const res = await fetch('/api/payment/create-intent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        amount,
                        offerId,
                        cartId,
                        servicePointId: selectedPoint!.id,
                        shippingAddressId: selectedAddressId,
                    }),
                });
                if (!res.ok) {
                    const errorData = await res.text();
                    throw new Error(`Erreur du serveur: ${errorData}`);
                }
                const data = await res.json();
                setClientSecret(data.clientSecret);
            } catch (error) {
                console.error(error);
                const message = error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
                toast.error(`Impossible d'initialiser le paiement: ${message}`);
            }
        }
        fetchClientSecret();
    }, [amount, offerId, cartId, selectedPoint, selectedAddressId, isReadyToPay]);

    if (isNaN(amount) || amount <= 0 || (!offerId && !cartId)) {
        return (
            <div className="container mx-auto py-10 text-center">
                <h1 className="text-2xl font-bold text-red-600">Données de paiement invalides</h1>
                <p>Les informations nécessaires pour le paiement sont manquantes ou incorrectes dans l'URL.</p>
                <Button asChild variant="link"><Link href="/cart">Retour au panier</Link></Button>
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
            
            <div className="mb-6 space-y-4">
              <div>
                  <h2 className="text-lg font-semibold mb-2">1. Choisissez votre adresse de facturation</h2>
                  <AddressSelector onSelectAddress={setSelectedAddressId} />
              </div>
              <div>
                  <h2 className="text-lg font-semibold mb-2">2. Choisissez votre point de livraison</h2>
                  <ServicePointSelector onSelectPoint={setSelectedPoint} />
              </div>
            </div>

            <Separator className="my-6" />

            <div className={!isReadyToPay ? 'opacity-50' : ''}>
              <h2 className="text-lg font-semibold mb-2">3. Procédez au paiement</h2>
              {clientSecret ? (
                  <Elements options={options} stripe={stripePromise} key={clientSecret}>
                      <CheckoutForm isReadyToPay={isReadyToPay} />
                  </Elements>
              ) : (
                  <div className="text-center"><p>Veuillez sélectionner une adresse et un point de livraison pour continuer.</p></div>
              )}
            </div>
        </div>
    );
}

export default function StripeCheckoutClient() {
    return <StripeCheckoutCore />;
} 