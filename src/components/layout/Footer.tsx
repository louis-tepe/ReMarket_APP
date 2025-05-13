import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-gray-100 dark:bg-gray-800 border-t mt-16">
            <div className="container mx-auto px-4 py-8 sm:py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <h3 className="text-lg font-semibold mb-3">ReMarket</h3>
                        <p className="text-sm text-muted-foreground">
                            Votre marché de confiance pour des produits de seconde main de qualité,
                            inspectés et garantis.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-3">Liens Utiles</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/vendre" className="text-muted-foreground hover:text-primary">Vendre sur ReMarket</Link></li>
                            <li><Link href="/#comment-ca-marche" className="text-muted-foreground hover:text-primary">Comment ça marche ?</Link></li>
                            <li><Link href="/faq" className="text-muted-foreground hover:text-primary">FAQ</Link></li>
                            {/* TODO: Ajouter d'autres liens pertinents (Contact, CGV, etc.) */}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-3">Suivez-nous</h4>
                        <div className="flex space-x-4">
                            {/* TODO: Ajouter des icônes de réseaux sociaux */}
                            <p className="text-sm text-muted-foreground">(Icônes sociales ici)</p>
                        </div>
                    </div>
                </div>
                <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} ReMarket. Tous droits réservés.</p>
                </div>
            </div>
        </footer>
    );
} 