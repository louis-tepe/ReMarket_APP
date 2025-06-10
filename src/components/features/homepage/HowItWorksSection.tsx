import { ShieldCheck, Repeat, PackageCheck } from 'lucide-react';

export function HowItWorksSection() {
  return (
    <section id="comment-ca-marche" className="py-12 md:py-16 bg-muted/50 dark:bg-card">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-4">ReMarket Simplifie le Seconde Main</h2>
        <p className="text-muted-foreground text-center max-w-3xl mx-auto mb-12">
          Nous standardisons l&apos;expérience d&apos;achat et de vente pour vous offrir la qualité du neuf, au prix de l&apos;occasion. Pas de contact direct, pas de tracas.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center p-6 bg-background dark:bg-gray-800/50 rounded-lg shadow-sm">
            <div className="p-3 bg-primary/10 rounded-full mb-4">
              <PackageCheck className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">1. Vendez Facilement</h3>
            <p className="text-sm text-muted-foreground">
              Soumettez votre produit. Notre IA l&apos;analyse et le liste. Une fois vendu, envoyez-le simplement à notre point relais.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-background dark:bg-gray-800/50 rounded-lg shadow-sm">
            <div className="p-3 bg-primary/10 rounded-full mb-4">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">2. Achetez en Confiance</h3>
            <p className="text-sm text-muted-foreground">
              Trouvez votre bonheur parmi des annonces standardisées. Chaque article est vérifié avant de vous être expédié.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-background dark:bg-gray-800/50 rounded-lg shadow-sm">
            <div className="p-3 bg-primary/10 rounded-full mb-4">
              <Repeat className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">3. Processus Simplifié</h3>
            <p className="text-sm text-muted-foreground">
              ReMarket gère la logistique et la communication. Plus besoin de négocier ou de rencontrer des inconnus.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
} 