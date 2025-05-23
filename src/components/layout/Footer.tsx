import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-background border-t mt-16">
            <div className="container mx-auto px-4 py-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-xl font-semibold mb-4 text-primary">ReMarket</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                            Votre marché de confiance pour des produits de seconde main de qualité,
                            inspectés et garantis. Achetez et vendez en toute simplicité.
                        </p>
                    </div>
                    <div className="md:ml-auto">
                        <h4 className="font-semibold mb-4">Informations</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/vendre" className="text-muted-foreground hover:text-primary">Vendre sur ReMarket</Link></li>
                            <li><Link href="/#comment-ca-marche" className="text-muted-foreground hover:text-primary">Comment ça marche ?</Link></li>
                            <li><Link href="/faq" className="text-muted-foreground hover:text-primary">FAQ</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t pt-8 text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} ReMarket. Tous droits réservés.</p>
                </div>
            </div>
        </footer>
    );
} 