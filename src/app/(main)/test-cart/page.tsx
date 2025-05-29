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

        try {
            // Test avec des IDs fictifs (vous devrez les remplacer par de vrais IDs de votre DB)
            const testPayload = {
                action: 'add',
                offerId: '507f1f77bcf86cd799439011', // Exemple d'ObjectId
                productModelId: '507f1f77bcf86cd799439012', // Exemple d'ObjectId
                quantity: 1
            };

            console.log("Test payload:", testPayload);

            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testPayload),
            });

            const result = await response.json();
            console.log("Response:", response.status, result);

            if (response.ok) {
                toast.success("Test ajout réussi !");
            } else {
                toast.error(`Erreur: ${result.message}`);
            }
        } catch (error) {
            console.error("Erreur test:", error);
            toast.error("Erreur lors du test");
        }
    };

    const testGetCart = async () => {
        try {
            const response = await fetch('/api/cart');
            const result = await response.json();
            console.log("Cart GET Response:", response.status, result);

            if (response.ok) {
                toast.success(`Panier récupéré: ${result.data?.items?.length || 0} articles`);
            } else {
                toast.error(`Erreur: ${result.message}`);
            }
        } catch (error) {
            console.error("Erreur get cart:", error);
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