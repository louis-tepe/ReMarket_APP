'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SignUpFormProps {
    onSuccess?: () => void; // Callback optionnel en cas de succès
}

/**
 * Composant SignUpForm
 * Gère l'état et la soumission du formulaire d'inscription.
 * Affiche des notifications toast pour les succès ou erreurs.
 * Valide la longueur minimale du mot de passe.
 */
export function SignUpForm({ onSuccess }: SignUpFormProps) {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);

        // Validation de la longueur du mot de passe
        if (password.length < 6) {
            toast.error("Mot de passe trop court", { description: "Le mot de passe doit contenir au moins 6 caractères." });
            setIsLoading(false);
            return;
        }

        try {
            // Appel à l'API pour enregistrer le nouvel utilisateur
            const response = await fetch('/api/auth/register', { // Assurez-vous que cette route existe et est correcte
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Gestion des erreurs retournées par l'API
                toast.error("Erreur d'inscription", { description: data.message || 'Une erreur est survenue lors de l\'inscription.' });
            } else {
                // Succès de l'inscription
                toast.success("Inscription réussie !", { description: data.message || 'Vous allez être redirigé vers la page de connexion.' });
                if (onSuccess) {
                    onSuccess(); // Exécute le callback de succès
                } else {
                    // Redirection par défaut après un délai
                    setTimeout(() => {
                        router.push('/signin');
                    }, 2000);
                }
            }
        } catch (err) {
            // Gestion des erreurs serveur ou réseau
            console.error("Erreur lors de la tentative d'inscription:", err);
            toast.error("Erreur Serveur", { description: "Une erreur serveur est survenue lors de l\'inscription." });
        } finally {
            setIsLoading(false); // S'assurer que isLoading est réinitialisé dans tous les cas
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="name-signup">Nom complet (optionnel)</Label>
                <Input
                    id="name-signup" // ID unique
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Votre nom et prénom"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    className="bg-input"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email-signup">Adresse email</Label>
                <Input
                    id="email-signup" // ID unique
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
                <Label htmlFor="password-signup">Mot de passe</Label>
                <Input
                    id="password-signup" // ID unique
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Choisissez un mot de passe (min. 6 caractères)"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-input"
                />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Inscription en cours...' : 'S\'inscrire'}
            </Button>
        </form>
    );
} 