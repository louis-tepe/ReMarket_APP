'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SignUpForm } from './components/SignUpForm';

/**
 * Page d'Inscription
 * Affiche le formulaire d'inscription et gère la navigation post-inscription.
 */
export default function InscriptionPage() {
    const router = useRouter();

    // Callback pour gérer la redirection après une inscription réussie
    const handleSignUpSuccess = () => {
        // Redirection vers la page de connexion après un court délai pour permettre à l'utilisateur de voir le message de succès
        setTimeout(() => {
            router.push('/signin');
        }, 2000);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight">Créer un compte</CardTitle>
                    <CardDescription>
                        Rejoignez ReMarket et commencez à vendre ou acheter.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SignUpForm onSuccess={handleSignUpSuccess} />
                </CardContent>
                <CardFooter className="flex flex-col items-center">
                    <div className="text-sm text-muted-foreground">
                        Déjà un compte ?{' '}
                        <Link href="/signin" className="font-medium text-primary hover:underline">
                            Connectez-vous
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
} 