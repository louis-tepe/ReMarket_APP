'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CartRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        // Rediriger vers la vraie page du panier
        router.replace('/account/cart');
    }, [router]);

    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Redirection vers votre panier...</p>
        </div>
    );
} 