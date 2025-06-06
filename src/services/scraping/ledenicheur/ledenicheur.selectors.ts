// src/services/scraping/ledenicheur/ledenicheur.selectors.ts
export const SEARCH_RESULTS_SELECTORS = {
  PRODUCT_LIST_CONTAINER: 'ul.grid[data-test="SearchResultList"]', 
  PRODUCT_ITEM: 'li', 
  PRODUCT_CARD_WRAPPER: 'div[data-test="ProductGridCard"]',
  PRODUCT_LINK: 'a[data-test="ProductCardProductName"]',
  PRODUCT_TITLE_IN_CARD: 'a[data-test="ProductCardProductName"] > p.font-heavy',
  PRODUCT_IMAGE: 'div[data-sentry-component="DynamicImage"] img',
  PRODUCT_PRICE_TEXT: 'div[data-sentry-component="Price"] p.text-m.font-heaviest',
  PRODUCT_PRICE_USED_TEXT: 'div[data-test="UsedBadge"] p.text-positive-700',
  PRODUCT_MERCHANT_INFO: 'div[data-sentry-component="StoreInfo"] p.text-xs.line-clamp-1',
  PRODUCT_CATEGORY: 'p.text-xs.truncate.opacity-75',
  // TODO: Ajouter d'autres sélecteurs pour la page de recherche si nécessaire (ex: pagination, nombre total de résultats)
};

export const PRODUCT_PAGE_SELECTORS = {
  // Sélecteurs pour la section "Info produit" - corrigés selon le HTML réel
  PRODUCT_INFO_WRAPPER: 'section[data-test="PropertiesTabContent"], div#properties, div.SectionWrapper-sc-ia0zhw-0', // Prioriser PropertiesTabContent
  PRODUCT_INFO_MAIN_TITLE: 'h2.Text--q06h0j.iYVnhg.h2text', // "Info produit"
  
  // Conteneur général des listes de propriétés/spécifications à l'intérieur de PRODUCT_INFO_WRAPPER
  // Cibler un div qui contient "StyledPanel--" dans sa classe, enfant direct de PRODUCT_INFO_WRAPPER (ou plus précisément de section[data-test="PropertiesTabContent"])
  // SPECIFICATIONS_CONTAINER_ROOT: 'section[data-test="PropertiesTabContent"] > div[class*="StyledPanel--"]',
  // Nouvelle approche: Cibler directement le conteneur qui semble universel pour les sections de specs
  SPECIFICATIONS_CONTAINER_ROOT: 'div[data-test-type="product-info"]',

  // Sélecteur pour chaque section de spécifications (ex: "Informations de base", "Général")
  SPECIFICATION_SECTION: 'section[role="list"]', 
  SPECIFICATION_SECTION_TITLE: 'h3[class*="Title"], h3', // Titre de la section (h3)
  
  // Ligne de propriété (clé-valeur)
  SPECIFICATION_ROW: 'div[role="listitem"]', 

  // Colonnes dans une ligne de propriété
  SPECIFICATION_ROW_KEY_COLUMN: 'div[role="listitem"] > div[class*="Column-sc-"]:first-child',
  SPECIFICATION_ROW_VALUE_COLUMN: 'div[role="listitem"] > div[class*="Column-sc-"]:nth-child(2)',

  // Éléments spécifiques à l'intérieur des colonnes
  SPECIFICATION_KEY_TEXT: 'span[class*="PropertyName-sc-"]',
  
  SPECIFICATION_VALUE_TEXT_SIMPLE: 'span[class*="PropertyValue-sc-"]',
  SPECIFICATION_VALUE_LINK: 'a[data-test="InternalLink"]',
  SPECIFICATION_VALUE_ICON_TEXT: 'span[class*="ColoredIconWrapper"] span',

  // Sélecteur pour identifier la première section qui n'a pas de titre H3 explicite mais contient des specs
  // Ce conteneur est souvent le premier enfant direct avec des specs sous `SPECIFICATIONS_CONTAINER_ROOT > div[data-test-type="product-info"]`
  FIRST_UNNAMED_SPECIFICATION_SECTION_CONTAINER: 'div[data-test-type="product-info"] > div.hideInViewports-sc-0-0:first-child > section[role="list"]',

  // Sélecteurs pour la galerie d'images (Lightbox/Carousel) - corrigés selon HTML réel
  PRODUCT_MEDIA_BUTTON: 'button[data-test="ProductMedia"]',
  LIGHTBOX_CAROUSEL_CONTAINER: 'div.Lightbox-sc-0-0, div[data-test="Carousel"]',
  CAROUSEL_CONTAINER: 'div[data-test="Carousel"]',
  CAROUSEL_SLIDES_WRAPPER: 'div.react-swipe-container',
  CAROUSEL_SLIDE: 'div.CarouselSlide-sc-0-4',
  CAROUSEL_IMAGE_ITEM: 'div.CarouselSlide-sc-0-4 img',
  CAROUSEL_THUMBNAIL_LIST: 'ul.List-sc-0-6',
  CAROUSEL_THUMBNAIL_ITEM: 'ul.List-sc-0-6 li img',
  LIGHTBOX_CLOSE_BUTTON: 'button[aria-label="Close lightbox"]',

  // Sélecteurs alternatifs pour les images
  ALTERNATIVE_CAROUSEL_CONTAINER: 'div[data-test="Carousel"]',
  ALTERNATIVE_IMAGE_ITEMS: 'img[src*="pricespy"], img[src*="product"], img[alt*="product"]',
  CAROUSEL_SLIDE_GENERIC: '[class*="Slide"], [class*="slide"], [data-test*="slide"]',
  PRODUCT_IMAGE_GENERIC: 'img[class*="product"], img[data-test*="image"]',

  // Sélecteurs pour l'historique des prix et statistiques
  PRICE_HISTORY_WRAPPER: 'section[data-test="StatisticsTabContent"]',
  PRICE_HISTORY_TITLE: 'h2.Text--q06h0j.iYVnhg.h2text', // "Historique des prix"
  PRICE_HISTORY_PERIOD_BUTTONS: 'div.StyledButtonGroup-sc-0-1 button',
  PRICE_HISTORY_3_MONTHS_BUTTON: 'div.StyledButtonGroup-sc-0-1 button:has(span[title="3 mois"])',
  PRICE_HISTORY_SELECTED_BUTTON: 'div.StyledButtonGroup-sc-0-1 button.BHEBV',
  
  // Footer avec les statistiques de prix
  PRICE_HISTORY_FOOTER: 'div.StyledFooter-sc-0-0',
  PRICE_HISTORY_LOWEST_3_MONTHS_CONTAINER: 'div.StyledFooterItem-sc-0-1:first-child',
  PRICE_HISTORY_LOWEST_3_MONTHS_LABEL: 'div.StyledFooterItem-sc-0-1:first-child span.captionstrongtext',
  PRICE_HISTORY_LOWEST_3_MONTHS_PRICE: 'div.StyledFooterItem-sc-0-1:first-child h3[data-testid="price-history-lowest-price-in-time-range"]',
  PRICE_HISTORY_LOWEST_3_MONTHS_DATE: 'div.StyledFooterItem-sc-0-1:first-child span.captiontext',
  
  PRICE_HISTORY_CURRENT_LOWEST_CONTAINER: 'div.StyledFooterItem-sc-0-1:nth-child(2)',
  PRICE_HISTORY_CURRENT_LOWEST_PRICE: 'div.StyledFooterItem-sc-0-1:nth-child(2) h3[data-testid="price-history-lowest-price-today"]',
  PRICE_HISTORY_CURRENT_LOWEST_SHOP: 'div.StyledFooterItem-sc-0-1:nth-child(2) a span',
  
  // Graphique SVG (pour extraction avancée si nécessaire)
  PRICE_HISTORY_CHART_SVG: 'div.StyledChartWrapper-sc-0-0 svg.recharts-surface',
  PRICE_HISTORY_CHART_PRICE_POINTS: 'g.recharts-layer.recharts-area path.recharts-curve.recharts-area-curve',
  PRICE_HISTORY_CURRENT_PRICE_INDICATOR: 'div[data-testid="price-history-price-today-indicator"]',

  // Ces sélecteurs ci-dessous sont des placeholders ou des exemples et seront supprimés ou adaptés
  // car le HTML fourni se concentre sur "Info Produit" (spécifications).
  // TITLE_H1: 'h1', // À déterminer globalement sur la page, pas dans ce snippet. Placeholder.
  // PRICE_NEW_STRONG: 'span.price', // À déterminer globalement. Placeholder.
  // OOPSTAGE_GALLERY_IMAGE: 'img.product-gallery-image', // Pas dans ce snippet. Placeholder.
  // PRODUCT_DESCRIPTION_CONTAINER: 'div.product-description', // Pas dans ce snippet. Placeholder.
  // OFFERS_CONTAINER: 'div#offers-list', // Pas dans ce snippet. Placeholder.
  // CAPTCHA_CHECK: 'form#captcha-form', // Pas dans ce snippet. Placeholder.
  // REVIEWS_CONTAINER: 'div#product-reviews', // Pas dans ce snippet. Placeholder.

  // Ces champs ne sont plus pertinents vu le focus sur "Info produit"
  // PRODUCT_FEATURES_CONTAINER: 'div.features-section',
  // PRODUCT_FEATURE_ITEM: 'li.feature-item',
  // OFFER_ITEM: 'div.offer-item',
  // OFFER_PRICE: 'span.offer-price',
  // OFFER_SELLER_NAME: 'a.seller-name',
  // OFFER_PRODUCT_STATE: 'span.product-state',
  // OFFER_SHIPPING_INFO: 'span.shipping-details',
  // REVIEW_ITEM: 'div.review',
  // REVIEW_RATING: 'span.review-rating',
  // REVIEW_TEXT: 'p.review-text',
}; 