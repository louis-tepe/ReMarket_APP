'use client';

import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export default function TestCartPage() {
    const { data: session, status } = useSession();

    const testAddToCart = async () => {
        if (status !== 'authenticated') {
            toast.error("Veuillez vous connecter pour tester.");
            return;
        }

        const testPayload = {
            action: 'add',
            offerId: '679c7b08f24b532a2a3a9876', // ID d'offre de test
            quantity: 2
        };

        // console.log("Test payload:", testPayload);

        try {
            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testPayload)
            });
            await response.json(); // Just await the response without storing
            // console.log("Response:", response.status, result);
            toast.success("Test ajout réussi !");
        } catch (error) {
            console.error("Erreur:", error);
            toast.error("Erreur lors du test");
        }
    };

    const testGetCart = async () => {
        try {
            const response = await fetch('/api/cart');
            const result = await response.json();
            // console.log("Cart GET Response:", response.status, result);
            toast.success(`Panier récupéré: ${result.data?.items?.length || 0} articles`);
        } catch (error) {
            console.error("Erreur:", error);
            toast.error("Erreur lors de la récupération du panier");
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-4">Test Panier</h1>
            <div className="space-y-4">
                <p>Status: {status}</p>
                <p>User ID: {session?.user?.id || 'N/A'}</p>

                <div className="space-x-4">
                    <Button onClick={testGetCart}>
                        Tester GET Cart
                    </Button>
                    <Button onClick={testAddToCart}>
                        Tester ADD à Cart (avec IDs fictifs)
                    </Button>
                </div>
            </div>
        </div>
    );
} 