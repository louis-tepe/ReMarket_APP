import { Info } from 'lucide-react';

interface LedenicheurPriceInfoProps {
    priceNewLedenicheur?: number;
    priceUsedLedenicheur?: number;
    sourceUrlLedenicheur?: string;
}

/**
 * Displays pricing information from Ledenicheur, including new and used prices,
 * and a link to the source URL. Renders nothing if no Ledenicheur data is provided.
 */
export default function LedenicheurPriceInfo({
    priceNewLedenicheur,
    priceUsedLedenicheur,
    sourceUrlLedenicheur
}: LedenicheurPriceInfoProps) {
    if (!priceNewLedenicheur && !priceUsedLedenicheur && !sourceUrlLedenicheur) {
        return null;
    }

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-2">
                <Info className="h-5 w-5 mr-2 text-blue-500" /> Informations de référence (Ledenicheur)
            </div>
            <div className="text-sm text-gray-700 space-y-1">
                {priceNewLedenicheur && (
                    <p>Prix neuf constaté : <span className="font-semibold">{priceNewLedenicheur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span></p>
                )}
                {priceUsedLedenicheur && (
                    <p>Prix occasion constaté : <span className="font-semibold">{priceUsedLedenicheur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span></p>
                )}
                {sourceUrlLedenicheur && (
                    <p>Source : <a href={sourceUrlLedenicheur} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Voir sur Ledenicheur</a></p>
                )}
            </div>
        </div>
    );
} 