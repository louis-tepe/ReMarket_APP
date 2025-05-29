import { Info } from 'lucide-react';

interface IdealoPriceInfoProps {
    priceNewIdealo?: number;
    priceUsedIdealo?: number;
    sourceUrlIdealo?: string;
}

/**
 * Displays pricing information from Idealo, including new and used prices,
 * and a link to the source URL. Renders nothing if no Idealo data is provided.
 */
export default function IdealoPriceInfo({
    priceNewIdealo,
    priceUsedIdealo,
    sourceUrlIdealo
}: IdealoPriceInfoProps) {
    if (!priceNewIdealo && !priceUsedIdealo && !sourceUrlIdealo) {
        return null;
    }

    return (
        <div className="mb-8 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
                <Info className="h-5 w-5 mr-2 text-blue-500" /> Informations de référence (Idealo)
            </h3>
            <div className="space-y-1 text-sm">
                {priceNewIdealo && (
                    <p>Prix neuf constaté : <span className="font-semibold">{priceNewIdealo.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span></p>
                )}
                {priceUsedIdealo && (
                    <p>Prix occasion constaté : <span className="font-semibold">{priceUsedIdealo.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span></p>
                )}
                {sourceUrlIdealo && (
                    <p>Source : <a href={sourceUrlIdealo} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Voir sur Idealo</a></p>
                )}
            </div>
        </div>
    );
} 