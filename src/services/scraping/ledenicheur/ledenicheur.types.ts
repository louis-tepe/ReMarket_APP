// Type principal pour l'ensemble des données retournées par l'API de scraping
export interface LedenicheurProductDetails {
  product: Product;
  options: Record<string, string[]>;
  specifications: Record<string, Record<string, string | number | boolean>>;
  price_analysis: PriceAnalysis;
  _meta: Meta;
}

export interface Product {
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
  search_candidates: SearchCandidate[];
}

export interface SearchCandidate {
  title: string;
  url: string;
  similarity: number;
} 