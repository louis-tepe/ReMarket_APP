'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from './components/SignInForm'; // Importation du nouveau composant
import { useRouter } from 'next/navigation';

/**
 * Page de Connexion
 * Affiche le formulaire de connexion et gère la navigation post-connexion.
 */
export default function ConnexionPage() {
    const router = useRouter();

    // Callback pour gérer la redirection après une connexion réussie
    const handleSignInSuccess = () => {
        router.push('/');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight">Connexion</CardTitle>
                    <CardDescription>
                        Accédez à votre compte ReMarket.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Utilisation du composant SignInForm */}
                    <SignInForm onSuccess={handleSignInSuccess} />
                </CardContent>
                <CardFooter className="flex flex-col items-center space-y-2">
                    <div className="text-sm text-muted-foreground">
                        Pas encore de compte ?{' '}
                        <Link href="/signup" className="font-medium text-primary hover:underline">
                            Inscrivez-vous
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
} 