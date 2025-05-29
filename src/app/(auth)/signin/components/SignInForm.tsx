'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SignInFormProps {
    onSuccess?: () => void; // Callback optionnel en cas de succès de la connexion
}

/**
 * Composant SignInForm
 * Gère l'état et la soumission du formulaire de connexion.
 * Affiche des notifications toast pour les succès ou erreurs.
 */
export function SignInForm({ onSuccess }: SignInFormProps) {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);

        try {
            // Tentative de connexion avec les identifiants fournis
            const result = await signIn('credentials', {
                redirect: false, // Important: gérer la redirection manuellement après la réponse
                email,
                password,
            });

            if (result?.error) {
                // Gestion des erreurs de connexion spécifiques ou génériques
                const errorMessage = result.error === "CredentialsSignin"
                    ? "Email ou mot de passe incorrect."
                    : "Une erreur est survenue. Veuillez réessayer.";
                toast.error("Erreur de connexion", { description: errorMessage });
                setIsLoading(false);
            } else if (result?.ok) {
                // Succès de la connexion
                toast.success("Connexion réussie!", { description: "Vous allez être redirigé." });
                if (onSuccess) {
                    onSuccess(); // Exécute le callback de succès si fourni
                } else {
                    router.push('/'); // Redirection par défaut vers la page d'accueil
                }
                // Pas besoin de setIsLoading(false) ici car une redirection/changement de page a lieu
            } else {
                // Cas inattendu où signIn ne retourne ni erreur ni succès clair
                toast.error("Erreur inattendue", { description: "Une erreur de connexion inattendue est survenue." });
                setIsLoading(false);
            }
        } catch (err) {
            // Gestion des erreurs serveur ou réseau
            console.error("Erreur lors de la tentative de connexion:", err);
            toast.error("Erreur Serveur", { description: "Une erreur serveur est survenue." });
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="email-signin">Adresse email</Label>
                <Input
                    id="email-signin" // ID unique pour le champ email
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="votre@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="bg-input"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password-signin">Mot de passe</Label>
                <Input
                    id="password-signin" // ID unique pour le champ mot de passe
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Votre mot de passe"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-input"
                />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
        </form>
    );
} 