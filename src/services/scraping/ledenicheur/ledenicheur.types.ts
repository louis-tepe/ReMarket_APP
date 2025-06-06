// src/services/scraping/ledenicheur/ledenicheur.types.ts

/** Représente une spécification technique du produit (une paire clé-valeur). */
export type ProductSpecification = {
  key: string; // Nom de la spécification (ex: "Marque", "Année de publication")
  value: string; // Valeur de la spécification (ex: "Sony PlayStation", "2016")
  section?: string; // Section optionnelle à laquelle appartient cette spécification (ex: "Général", "Connexions")
};

/** Représente les informations d'historique des prix pour un produit. */
export type PriceHistoryData = {
  lowest3MonthsPrice?: string | null; // Prix le plus bas des 3 derniers mois (ex: "135,00 €")
  lowest3MonthsDate?: string | null; // Date du prix le plus bas des 3 derniers mois (ex: "11 mai 2025")
  currentLowestPrice?: string | null; // Prix le plus bas actuel (ex: "194,99 €")
  currentLowestShop?: string | null; // Magasin proposant le prix le plus bas actuel (ex: "Rakuten")
  medianPrice3Months?: string | null; // Prix médian des 3 derniers mois (calculé ou extrait)
  selectedPeriod?: string | null; // Période sélectionnée pour l'historique (ex: "3 mois")
};

/**
 * Encapsule les détails scrapés pour un produit depuis la section "Info produit" de Ledenicheur.fr.
 */
export type LedenicheurProductDetails = {
  url: string; // URL de la page produit sur Ledenicheur
  pageTitle?: string | null; // Titre global de la page produit (H1) - à scraper séparément si besoin
  productInfoTitle?: string | null; // Titre de la section "Info produit" (ex: "Info produit")
  specifications: ProductSpecification[]; // Liste de toutes les spécifications extraites
  imageUrls?: string[]; // URLs des images du produit
  priceHistory?: PriceHistoryData | null; // Données d'historique des prix
};

/**
 * Représente les informations d'un produit extraites d'une carte 
 * dans la page de résultats de recherche de Ledenicheur.fr.
 */
export type LedenicheurSearchResultItem = {
  productPageUrl: string | null; // Lien vers la page détaillée du produit
  title: string | null;
  imageUrl?: string | null;
  priceText?: string | null; // Prix affiché sur la carte (ex: "Dès 349,99 €")
  priceUsedText?: string | null; // Prix occasion affiché sur la carte (ex: "Dès 149,89 €")
  merchantInfo?: string | null; // Info sur le marchand (ex: "chez Amazon.fr Marketplace")
  category?: string | null; // Catégorie affichée sur la carte
  // TODO: "à remplir" - Ajouter d'autres champs si nécessaire
}; 