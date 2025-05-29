'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AccountPage() {
    const router = useRouter();
    const { status } = useSession();

    useEffect(() => {
        if (status === 'authenticated') {
            // Rediriger vers la page des ventes par défaut
            router.replace('/account/sales');
        } else if (status === 'unauthenticated') {
            // Rediriger vers la page de connexion
            router.replace('/signin');
        }
    }, [status, router]);

    // Afficher un loader pendant la redirection
    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="text-center space-y-4">
                    <Skeleton className="h-8 w-48 mx-auto" />
                    <Skeleton className="h-4 w-32 mx-auto" />
                </div>
            </div>
        </div>
    );
} 