// Type principal pour l'ensemble des données retournées par l'API de scraping
export interface LedenicheurProductDetails {
  product: Product;
  options: Record<string, string[]>;
  specifications: Record<string, Record<string, string | number | boolean>>;
  price_analysis: PriceAnalysis;
  _meta: Meta;
}

export interface Product {
  id: number;
  title: string;
  brand: string;
  image_url: string;
  images: string[];
  url: string;
}

export interface PriceAnalysis {
  '3_months': PriceAnalysisPeriod;
  '6_months': PriceAnalysisPeriod;
  '1_year': PriceAnalysisPeriod;
}

export interface PriceAnalysisPeriod {
  average_price: number;
  data_points: number;
}

export interface Meta {
  source: string;
  scraped_at: string;
}

/**
 * Représente un produit candidat retourné par l'étape d'initiation.
 */
export interface ScrapeCandidate {
  title: string;
  url: string;
  similarity?: number; // La similarité peut être optionnelle
}

/**
 * Type de la réponse pour l'endpoint /scrape/initiate.
 */
export interface ScrapeInitiateResponse {
  job_id: string;
  candidates: ScrapeCandidate[];
}

/**
 * Type de la réponse pour l'endpoint /scrape/select.
 * C'est la même structure que les détails complets du produit.
 */
export type ScrapeSelectResponse = LedenicheurProductDetails; 