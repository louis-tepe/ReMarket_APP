import { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';
import { PlaywrightCrawlingContext } from 'crawlee';
import type { Element as CheerioElement } from 'domhandler';
import {
  LedenicheurProductDetails,
  ProductSpecification,
  PriceHistoryData,
} from './ledenicheur.types';
import { PRODUCT_PAGE_SELECTORS } from './ledenicheur.selectors';
import { calculateDiceSimilarity } from '../utils/scraper.utils';

/**
 * Extrait le texte d'un élément Cheerio, en gérant les cas où il pourrait être undefined.
 */
const safeExtractText = ($element: cheerio.Cheerio<CheerioElement> | undefined): string => {
  return $element?.text()?.trim() || '';
};

/**
 * Extrait les données d'une ligne de spécification en utilisant les nouveaux sélecteurs.
 */
const getSpecRowData = ($: CheerioAPI, rowHtmlElement: CheerioElement): Omit<ProductSpecification, 'section'> | null => {
  const $row = $(rowHtmlElement);
  
  const keyColumn = $row.find(PRODUCT_PAGE_SELECTORS.SPECIFICATION_ROW_KEY_COLUMN);
  const valueColumn = $row.find(PRODUCT_PAGE_SELECTORS.SPECIFICATION_ROW_VALUE_COLUMN);

  // Detailed logging for raw text extraction
  let rawValueText = valueColumn.find(PRODUCT_PAGE_SELECTORS.SPECIFICATION_VALUE_TEXT_SIMPLE).text()?.trim();
  if (!rawValueText) {
    rawValueText = valueColumn.find(PRODUCT_PAGE_SELECTORS.SPECIFICATION_VALUE_LINK).text()?.trim();
  }
  if (!rawValueText) {
    rawValueText = valueColumn.find(PRODUCT_PAGE_SELECTORS.SPECIFICATION_VALUE_ICON_TEXT).map((_, el) => $(el).text()?.trim()).get().join(' ')?.trim();
  }
  if (!rawValueText) {
    // Fallback to any direct span text in value column if specific selectors fail
    rawValueText = valueColumn.find('span').first().text()?.trim();
     if (!rawValueText) { // If even that fails, take all text from value column
        rawValueText = valueColumn.text()?.trim();
    }
  }

  // logger.debug(`[getSpecRowData_RAW] Row HTML: ${$row.html()}`);
  // logger.debug(`[getSpecRowData_RAW] Key Col Text: "${rawKeyText}", Value Col Text (any): "${rawValueText}"`);
  
  const key = safeExtractText(keyColumn.find(PRODUCT_PAGE_SELECTORS.SPECIFICATION_KEY_TEXT));
  let value = '';
  value = safeExtractText(valueColumn.find(PRODUCT_PAGE_SELECTORS.SPECIFICATION_VALUE_TEXT_SIMPLE));

    if (!value) {
    const linkElement = valueColumn.find(PRODUCT_PAGE_SELECTORS.SPECIFICATION_VALUE_LINK);
    if (linkElement.length > 0) {
      value = safeExtractText(linkElement);
    }
    }

    if (!value) {
    const iconTextElement = valueColumn.find(PRODUCT_PAGE_SELECTORS.SPECIFICATION_VALUE_ICON_TEXT);
    if (iconTextElement.length > 0) {
      value = iconTextElement.map((_, el) => $(el).text()?.trim()).get().join(' ').trim();
    }
  }
  
  if (!value && valueColumn.find('span').length > 0) {
     value = safeExtractText(valueColumn.find('span').first());
  }
  
  // Ultimate fallback if value is still empty, take the whole text of the value column.
  // This can be noisy but ensures we get something if specific selectors fail.
  if (!value) {
    value = valueColumn.text()?.trim() || '';
      }

  // logger.debug(`[getSpecRowData_PROCESSED] Key: "${key}", Value: "${value}"`);

  if (key && value && value !== key) {
    return { key, value };
  }
  if (key && value === '') { 
    // logger.debug(`[getSpecRowData] Key "${key}" found with intentionally empty value.`);
    return { key, value: '' }; 
  }
  if (key && !value && rawValueText === '') { // If original value column was genuinely empty
     // logger.debug(`[getSpecRowData] Key "${key}" found, value column was genuinely empty.`);
     return { key, value: ''};
  }
  
  // logger.debug(`[getSpecRowData] Failed to form valid spec pair. Key: "${key}", Value: "${value}", RawValue: "${rawValueText}"`);
  return null;
};

/**
 * Fonction principale pour extraire les détails de la section "Info produit" de Ledenicheur.
 */
export const extractLedenicheurProductDetails = async (
  context: PlaywrightCrawlingContext
): Promise<LedenicheurProductDetails | null> => {
  const { request, response, page, log } = context;
  const $ = context.$ as CheerioAPI;

  const currentUrl = request.loadedUrl || request.url;
  log.info(`[EXTRACT_PRODUCT_DETAILS] Extraction des "Info produit" pour ${currentUrl}`);

  if (!response || response.status() !== 200) {
    log.warning(`[EXTRACT_PRODUCT_DETAILS] Réponse invalide pour ${currentUrl}. Status: ${response?.status()}`);
    return null;
  }

  let cheerioInstance: CheerioAPI;
  if ($ && typeof $ === 'function') {
    cheerioInstance = $;
  } else {
    log.warning(`[EXTRACT_PRODUCT_DETAILS] $ non disponible dans le contexte, création manuelle d'une instance Cheerio.`);
    const html = await page.content();
    cheerioInstance = cheerio.load(html);
    log.info(`[EXTRACT_PRODUCT_DETAILS] Cheerio instance créée manuellement. HTML length: ${html.length}`);
  }

  const productInfoWrapper = cheerioInstance(PRODUCT_PAGE_SELECTORS.PRODUCT_INFO_WRAPPER).first();
  if (productInfoWrapper.length === 0) {
    log.warning(`[EXTRACT_PRODUCT_DETAILS] Section "Info produit" (${PRODUCT_PAGE_SELECTORS.PRODUCT_INFO_WRAPPER}) non trouvée sur ${currentUrl}.`);
    return null;
  }
  log.info(`[EXTRACT_PRODUCT_DETAILS_DEBUG] Section principale PRODUCT_INFO_WRAPPER trouvée.`);

  const productInfoSectionTitle = safeExtractText(productInfoWrapper.find(PRODUCT_PAGE_SELECTORS.PRODUCT_INFO_MAIN_TITLE).first());
  log.info(`[EXTRACT_PRODUCT_DETAILS_DEBUG] Titre de section Info produit: "${productInfoSectionTitle}"`);

  const allSpecifications: ProductSpecification[] = [];

  // Chercher le conteneur racine des spécifications (maintenant div[data-test-type="product-info"]) depuis l'instance Cheerio globale
  const specificationsRootContainer: cheerio.Cheerio<CheerioElement> = cheerioInstance(PRODUCT_PAGE_SELECTORS.SPECIFICATIONS_CONTAINER_ROOT).first() as cheerio.Cheerio<CheerioElement>;

  if (specificationsRootContainer.length === 0) {
    log.warning(`[EXTRACT_PRODUCT_DETAILS_DEBUG] Conteneur racine des spécifications (${PRODUCT_PAGE_SELECTORS.SPECIFICATIONS_CONTAINER_ROOT}) non trouvé globalement sur la page.`);
     return null; 
  }

  log.info(`[EXTRACT_PRODUCT_DETAILS_DEBUG] Conteneur racine SPECIFICATIONS_CONTAINER_ROOT (${PRODUCT_PAGE_SELECTORS.SPECIFICATIONS_CONTAINER_ROOT}) trouvé. HTML: ${specificationsRootContainer.html()?.substring(0, 200)}...`);
  
  // specificationsRootContainer EST maintenant notre sectionsHost direct
  const sectionsHost: cheerio.Cheerio<CheerioElement> = specificationsRootContainer;

  const processSection = (sectionElement: cheerio.Cheerio<CheerioElement>, defaultSectionName: string) => {
    const $section = sectionElement;
    let sectionTitle = safeExtractText($section.find(PRODUCT_PAGE_SELECTORS.SPECIFICATION_SECTION_TITLE).first());
    
    // If no H3 title within the section, check if the section itself has a preceding H3 sibling OR if its parent div has a preceding H3.
    if (!sectionTitle) {
        const prevH3 = $section.prev('h3');
        if (prevH3.length > 0) {
            sectionTitle = safeExtractText(prevH3);
        } else {
            // Check parent's previous sibling if section is wrapped in a div like BasicInfo
            const parentPrevH3 = $section.parent().prev('h3');
            if (parentPrevH3.length > 0) {
                sectionTitle = safeExtractText(parentPrevH3);
            }
        }
    }
    // Check if the title is inside a div that is a sibling to the section. (div > h3) + section
    if(!sectionTitle){
        const divParent = $section.parent('div[data-test="BasicInfo"]');
        if(divParent.length > 0){
            sectionTitle = safeExtractText(divParent.find(PRODUCT_PAGE_SELECTORS.SPECIFICATION_SECTION_TITLE).first());
        }
    }

    const finalSectionName = sectionTitle || defaultSectionName;
    // log.info(`[EXTRACT_PRODUCT_DETAILS_DEBUG] Processing Section ${sectionIndex + 1}/${totalSections}: Title = "${finalSectionName}"`);
    // log.debug(`[EXTRACT_PRODUCT_DETAILS_DEBUG] Section HTML: ${$section.html()?.substring(0, 300)}...`);

    const rows = $section.find(PRODUCT_PAGE_SELECTORS.SPECIFICATION_ROW);
    // log.info(`[EXTRACT_PRODUCT_DETAILS_DEBUG] Section "${finalSectionName}" - Found ${rows.length} rows.`);

    rows.each((rowIndex, rowEl: CheerioElement) => {
      // log.debug(`[EXTRACT_PRODUCT_DETAILS_DEBUG]   Processing Row ${rowIndex + 1} in section "${finalSectionName}"`);
      const specData = getSpecRowData(cheerioInstance, rowEl);
      if (specData) {
        // log.info(`[EXTRACT_PRODUCT_DETAILS_DEBUG]     SPEC_FOUND in "${finalSectionName}": "${specData.key}" = "${specData.value}"`);
        allSpecifications.push({ ...specData, section: finalSectionName });
      } else {
        // log.debug(`[EXTRACT_PRODUCT_DETAILS_DEBUG]     SPEC_NOT_FORMED for row ${rowIndex + 1} in "${finalSectionName}". Row HTML: $(rowEl).html()`);
      }
    });
  };
  
  const sectionsToProcess = sectionsHost.find(PRODUCT_PAGE_SELECTORS.SPECIFICATION_SECTION);
  const totalSectionsFound = sectionsToProcess.length;
  log.info(`[EXTRACT_PRODUCT_DETAILS_DEBUG] Trouvé ${totalSectionsFound} éléments \'section[role="list"]\' dans sectionsHost.`);

  if (totalSectionsFound === 0) {
    log.warning(`[EXTRACT_PRODUCT_DETAILS_DEBUG] Aucun \'section[role="list"]\' trouvé dans sectionsHost. La structure pourrait être différente de celle attendue.`);
  }

  sectionsToProcess.each((idx, sectionEl) => {
    // log.info(`[EXTRACT_PRODUCT_DETAILS_DEBUG] Iterating section ${idx + 1} of ${totalSectionsFound}`);
    processSection(cheerioInstance(sectionEl), `Général (Section ${idx + 1})`);
  });
  
  const pageH1Title = safeExtractText(cheerioInstance('h1').first());
  const validSpecifications = allSpecifications.filter(spec => spec.key && spec.key.trim() !== '');

  if (validSpecifications.length === 0 && !productInfoSectionTitle && !pageH1Title) {
    log.warning(`[EXTRACT_PRODUCT_DETAILS] Aucune information produit significative (titre H1, titre de section ou spécifications) trouvée pour ${currentUrl}. Cheerio HTML head: ${cheerioInstance('head').html()?.substring(0,500)}`);
    return null;
  }

  const productDetails: LedenicheurProductDetails = {
    url: currentUrl,
    pageTitle: pageH1Title || undefined,
    productInfoTitle: productInfoSectionTitle || undefined,
    specifications: validSpecifications,
  };

  log.info(`[EXTRACT_PRODUCT_DETAILS] "Info produit" extraites pour ${currentUrl}: ${validSpecifications.length} spécifications valides trouvées.`);
  if (validSpecifications.length < 5 && validSpecifications.length > 0) { 
    log.info(`[EXTRACT_PRODUCT_DETAILS_DEBUG] Peu de spécifications trouvées. ProductDetails: ${JSON.stringify(productDetails, null, 2)}`);
  } else if (validSpecifications.length === 0) {
    log.warning(`[EXTRACT_PRODUCT_DETAILS_DEBUG] ZÉRO spécifications trouvées. HTML dump of sectionsHost: ${sectionsHost.html()}`);
  }

  // Extraire les données d'historique des prix
  try {
    log.info('[EXTRACT_PRODUCT_DETAILS] Tentative d\'extraction des données d\'historique des prix');
    const priceHistoryData = await extractPriceHistoryData(context);
    if (priceHistoryData) {
      productDetails.priceHistory = priceHistoryData;
      log.info(`[EXTRACT_PRODUCT_DETAILS] Données d\'historique des prix extraites avec succès`);
    } else {
      log.warning('[EXTRACT_PRODUCT_DETAILS] Aucune donnée d\'historique des prix extraite');
    }
  } catch (error) {
    log.error(`[EXTRACT_PRODUCT_DETAILS] Erreur lors de l'extraction de l'historique des prix: ${(error as Error).message}`);
  }

  return productDetails;
};

/**
 * Gère le consentement aux cookies si une bannière est détectée.
 * @param page - L'objet Page de Playwright.
 * @param logger - L'instance de log de Crawlee (peut être context.log).
 * @param pageName - Nom de la page pour les logs (ex: "search page", "product page").
 */
export const handleLedenicheurCookieConsent = async (
  page: PlaywrightCrawlingContext['page'],
  logger: PlaywrightCrawlingContext['log'],
  pageName: string
): Promise<void> => {
  const selectors = [
    'button[data-test="CookieBannerAcceptButton"]',
    'button#cmpbntyestxt', // Common CMP ID
    'button[data-test="cookie-accept-all"]',
    '//button[contains(text(), "Accepter tout") or contains(text(), "Accepter") or contains(text(), "Tout accepter")]', // More generic text match
    '//button[contains(text(), "J\'accepte") or contains(text(), "Je comprends")]', // Corrected escaping for J'accepte
    'button#onetrust-accept-btn-handler', // OneTrust
    'button[id*="cookie"]', // Generic ID match
    'button[class*="cookie"]', // Generic class match
    'button[mode="primary"]' // Common attribute for accept buttons
  ];
  // logger.info(`[COOKIE_CONSENT] Vérification de la bannière de cookies sur ${pageName} (${page.url()}).`);

  let bannerClicked = false;
    for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first(); // Try to find the first match
      if (await locator.isVisible({ timeout: 1500 })) { 
        // logger.info(`[COOKIE_CONSENT] Tentative de clic sur le bouton d\'acceptation des cookies ('${selector}') sur ${pageName}.`);
        await locator.click({ timeout: 2500, force: pageName.includes('search') ? false : true }); // force true for product page if overlay issues
        // logger.info(`[COOKIE_CONSENT] Bouton d\'acceptation des cookies ('${selector}') cliqué sur ${pageName}.`);
        await page.waitForTimeout(1000); 
        bannerClicked = true;
        break; 
        }
    } catch {
      // logger.debug(`[COOKIE_CONSENT] Sélecteur de cookie '${selector}' non trouvé/interactif sur ${pageName}: ${(e as Error).message.split('\n')[0]}`);
      }
    }

  if (!bannerClicked) {
    // logger.info(`[COOKIE_CONSENT] Aucune bannière de cookies évidente trouvée/acceptée sur ${pageName}.`);
  }
};

/**
 * Extrait les données d'historique des prix depuis la section StatisticsTabContent.
 */
export const extractPriceHistoryData = async (
  context: PlaywrightCrawlingContext
): Promise<PriceHistoryData | null> => {
  const { page, log } = context;
  
  try {
    log.info('[EXTRACT_PRICE_HISTORY] Début de l\'extraction des données d\'historique des prix');
    
    // Rechercher tous les onglets disponibles pour debugging
    const allTabs = await page.locator('button, a').all();
    const tabTexts = await Promise.all(
      allTabs.slice(0, 10).map(async (tab) => {
        try {
          const text = await tab.textContent();
          return text?.trim() || '';
        } catch {
          return '';
        }
      })
    );
    log.info(`[EXTRACT_PRICE_HISTORY_DEBUG] Onglets trouvés: ${tabTexts.filter(t => t).join(', ')}`);
    
    // Essayer de trouver l'onglet Statistiques avec plusieurs variantes
    const statisticsTabSelectors = [
      'button:has-text("Statistiques")',
      'button:has-text("Historique des prix")',
      'button:has-text("Prix")',
      'a:has-text("Statistiques")',
      'a:has-text("Historique des prix")',
      '[role="tab"]:has-text("Statistiques")',
      '[role="tab"]:has-text("Historique")',
      'button[data-test*="statistics" i]',
      'button[data-test*="price" i]',
      'button[aria-label*="statistique" i]',
      'button[aria-label*="prix" i]'
    ];
    
    let statisticsTabFound = false;
    for (const selector of statisticsTabSelectors) {
      try {
        const tabButton = page.locator(selector).first();
        if (await tabButton.isVisible({ timeout: 1000 })) {
          log.info(`[EXTRACT_PRICE_HISTORY] Onglet trouvé avec sélecteur: ${selector}`);
          await tabButton.click();
          await page.waitForTimeout(2000); // Attendre le chargement du contenu
          statisticsTabFound = true;
          break;
        }
      } catch {
        // Continue vers le sélecteur suivant
        continue;
      }
    }
    
    if (!statisticsTabFound) {
      log.warning('[EXTRACT_PRICE_HISTORY] Aucun onglet Statistiques trouvé, vérification directe du contenu');
    }
    
    // Vérifier que la section d'historique des prix est présente avec plusieurs sélecteurs
    const priceHistorySelectors = [
      PRODUCT_PAGE_SELECTORS.PRICE_HISTORY_WRAPPER,
      'section:has(h2:text("Historique des prix"))',
      'div:has(h2:text("Historique des prix"))',
      '[data-test*="statistics" i]',
      '[data-test*="price-history" i]',
      'section:has(.StyledFooter-sc-0-0)', // Le footer avec les prix
      'div:has(.StyledFooterItem-sc-0-1)' // Les éléments du footer
    ];
    
    let priceHistoryWrapper = null;
    for (const selector of priceHistorySelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          priceHistoryWrapper = element;
          log.info(`[EXTRACT_PRICE_HISTORY] Section d'historique trouvée avec: ${selector}`);
          break;
        }
      } catch {
        continue;
      }
    }
    
    if (!priceHistoryWrapper) {
      log.warning('[EXTRACT_PRICE_HISTORY] Section d\'historique des prix non trouvée avec aucun sélecteur');
      return null;
    }
    
    log.info('[EXTRACT_PRICE_HISTORY] Section d\'historique des prix trouvée');
    
    // S'assurer que la période "3 mois" est sélectionnée (optionnel)
    try {
      const threeMonthsSelectors = [
        PRODUCT_PAGE_SELECTORS.PRICE_HISTORY_3_MONTHS_BUTTON,
        'button:has-text("3 mois")',
        'button:has(span:text("3 mois"))',
        '.StyledButtonGroup-sc-0-1 button:first-child' // Souvent le premier bouton
      ];
      
      for (const selector of threeMonthsSelectors) {
        try {
          const threeMonthsButton = page.locator(selector).first();
          if (await threeMonthsButton.isVisible({ timeout: 1000 })) {
            // Vérifier s'il est déjà sélectionné
            const buttonClass = await threeMonthsButton.getAttribute('class');
            if (!buttonClass?.includes('BHEBV')) {
              log.info('[EXTRACT_PRICE_HISTORY] Sélection de la période "3 mois"');
              await threeMonthsButton.click();
              await page.waitForTimeout(2000);
            }
            break;
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      log.warning(`[EXTRACT_PRICE_HISTORY] Impossible de sélectionner la période 3 mois: ${(error as Error).message}`);
    }
    
    // Extraire les données du footer avec des sélecteurs alternatifs
    const priceHistoryData: PriceHistoryData = {};
    
    // Prix le plus bas des 3 derniers mois
    const lowest3MonthsSelectors = [
      PRODUCT_PAGE_SELECTORS.PRICE_HISTORY_LOWEST_3_MONTHS_PRICE,
      '[data-testid="price-history-lowest-price-in-time-range"]',
      '.StyledFooterItem-sc-0-1:first-child h3',
      'h3:near(:text("Prix le plus bas"))',
      'h3:near(:text("3 mois"))'
    ];
    
    for (const selector of lowest3MonthsSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          priceHistoryData.lowest3MonthsPrice = await element.textContent();
          log.info(`[EXTRACT_PRICE_HISTORY] Prix le plus bas 3 mois: ${priceHistoryData.lowest3MonthsPrice}`);
          break;
        }
      } catch {
        continue;
      }
    }
    
    // Date du prix le plus bas des 3 derniers mois
    const lowest3MonthsDateSelectors = [
      PRODUCT_PAGE_SELECTORS.PRICE_HISTORY_LOWEST_3_MONTHS_DATE,
      '.StyledFooterItem-sc-0-1:first-child span.captiontext',
      '.StyledFooterItem-sc-0-1:first-child span:last-child'
    ];
    
    for (const selector of lowest3MonthsDateSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          priceHistoryData.lowest3MonthsDate = await element.textContent();
          log.info(`[EXTRACT_PRICE_HISTORY] Date du prix le plus bas: ${priceHistoryData.lowest3MonthsDate}`);
          break;
        }
      } catch {
        continue;
      }
    }
    
    // Prix le plus bas actuel
    const currentLowestSelectors = [
      PRODUCT_PAGE_SELECTORS.PRICE_HISTORY_CURRENT_LOWEST_PRICE,
      '[data-testid="price-history-lowest-price-today"]',
      '.StyledFooterItem-sc-0-1:nth-child(2) h3',
      '.StyledFooterItem-sc-0-1:last-child h3'
    ];
    
    for (const selector of currentLowestSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          priceHistoryData.currentLowestPrice = await element.textContent();
          log.info(`[EXTRACT_PRICE_HISTORY] Prix le plus bas actuel: ${priceHistoryData.currentLowestPrice}`);
          break;
        }
      } catch {
        continue;
      }
    }
    
    // Magasin proposant le prix le plus bas actuel
    const currentLowestShopSelectors = [
      PRODUCT_PAGE_SELECTORS.PRICE_HISTORY_CURRENT_LOWEST_SHOP,
      '.StyledFooterItem-sc-0-1:nth-child(2) a span',
      '.StyledFooterItem-sc-0-1:last-child a span',
      'a[href*="go-to-shop"] span'
    ];
    
    for (const selector of currentLowestShopSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          priceHistoryData.currentLowestShop = await element.textContent();
          log.info(`[EXTRACT_PRICE_HISTORY] Magasin prix le plus bas: ${priceHistoryData.currentLowestShop}`);
          break;
        }
      } catch {
        continue;
      }
    }
    
    // Calculer le prix médian approximatif si on a les données de base
    if (priceHistoryData.lowest3MonthsPrice || priceHistoryData.currentLowestPrice) {
      try {
        const medianPrice = await calculateMedianPriceFromChart(page, log);
        if (medianPrice) {
          priceHistoryData.medianPrice3Months = medianPrice;
          log.info(`[EXTRACT_PRICE_HISTORY] Prix médian calculé: ${medianPrice}`);
        }
      } catch (error) {
        log.warning(`[EXTRACT_PRICE_HISTORY] Erreur lors du calcul du médian: ${(error as Error).message}`);
      }
    }
    
    priceHistoryData.selectedPeriod = '3 mois';
    
    // Vérifier si on a au moins une donnée utile
    const hasData = Object.values(priceHistoryData).some(value => value && value !== '3 mois');
    
    if (hasData) {
      log.info('[EXTRACT_PRICE_HISTORY] Extraction terminée avec succès');
      return priceHistoryData;
    } else {
      log.warning('[EXTRACT_PRICE_HISTORY] Aucune donnée d\'historique trouvée');
      return null;
    }
    
  } catch (error) {
    log.error(`[EXTRACT_PRICE_HISTORY] Erreur lors de l'extraction: ${(error as Error).message}`);
    return null;
  }
};

/**
 * Calcule approximativement le prix médian à partir des données du graphique et des valeurs disponibles.
 */
const calculateMedianPriceFromChart = async (
  page: PlaywrightCrawlingContext['page'],
  log: PlaywrightCrawlingContext['log']
): Promise<string | null> => {
  try {
    log.info('[CALCULATE_MEDIAN] Début du calcul du prix médian');
    
    // Méthode simplifiée : utiliser les prix disponibles pour estimer le médian
    let lowest3MonthsText = null;
    let currentLowestText = null;
    
    // Essayer de récupérer le prix le plus bas des 3 mois avec plusieurs sélecteurs
    const lowest3MonthsSelectors = [
      PRODUCT_PAGE_SELECTORS.PRICE_HISTORY_LOWEST_3_MONTHS_PRICE,
      '[data-testid="price-history-lowest-price-in-time-range"]',
      '.StyledFooterItem-sc-0-1:first-child h3'
    ];
    
    for (const selector of lowest3MonthsSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          lowest3MonthsText = await element.textContent();
          break;
        }
      } catch {
        continue;
      }
    }
    
    // Essayer de récupérer le prix actuel le plus bas avec plusieurs sélecteurs
    const currentLowestSelectors = [
      PRODUCT_PAGE_SELECTORS.PRICE_HISTORY_CURRENT_LOWEST_PRICE,
      '[data-testid="price-history-lowest-price-today"]',
      '.StyledFooterItem-sc-0-1:nth-child(2) h3',
      '.StyledFooterItem-sc-0-1:last-child h3'
    ];
    
    for (const selector of currentLowestSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          currentLowestText = await element.textContent();
          break;
        }
      } catch {
        continue;
      }
    }
    
    // Si on n'a pas les deux prix, essayer de les extraire depuis le graphique actuel
    if (!lowest3MonthsText || !currentLowestText) {
      log.info('[CALCULATE_MEDIAN] Tentative d\'extraction depuis l\'indicateur de prix actuel');
      try {
        const currentPriceIndicator = page.locator(PRODUCT_PAGE_SELECTORS.PRICE_HISTORY_CURRENT_PRICE_INDICATOR).first();
        if (await currentPriceIndicator.isVisible({ timeout: 1000 })) {
          const indicatorText = await currentPriceIndicator.textContent();
          if (indicatorText && !currentLowestText) {
            currentLowestText = indicatorText;
          }
        }
      } catch (error) {
        log.warning(`[CALCULATE_MEDIAN] Impossible d'extraire depuis l'indicateur: ${(error as Error).message}`);
      }
    }
    
    if (!lowest3MonthsText && !currentLowestText) {
      log.warning('[CALCULATE_MEDIAN] Impossible d\'extraire les prix pour le calcul du médian');
      return null;
    }
    
    // Extraire les valeurs numériques des prix
    const extractPrice = (priceText: string): number | null => {
      log.info(`[EXTRACT_PRICE_DEBUG] Parsing prix: "${priceText}"`);
      
      // Supprimer le symbole € et nettoyer
      let cleanText = priceText.replace(/€/g, '').trim();
      
      // Gérer les formats français : "1 362,66", "1362,66", "1.362,66"
      // Remplacer les espaces et points utilisés comme séparateurs de milliers par rien
      cleanText = cleanText.replace(/\s+/g, ''); // Supprimer tous les espaces
      cleanText = cleanText.replace(/\.(?=\d{3})/g, ''); // Supprimer les points suivis de 3 chiffres (séparateurs milliers)
      
      // Maintenant on devrait avoir quelque chose comme "1362,66" ou "1362"
      // Remplacer la virgule décimale par un point pour parseFloat
      cleanText = cleanText.replace(',', '.');
      
      log.info(`[EXTRACT_PRICE_DEBUG] Texte nettoyé: "${cleanText}"`);
      
      // Vérifier que c'est un nombre valide
      const match = cleanText.match(/^(\d+(?:\.\d{1,2})?)$/);
      if (match) {
        const price = parseFloat(match[1]);
        log.info(`[EXTRACT_PRICE_DEBUG] Prix parsé: ${price}`);
        return price;
      }
      
      log.warning(`[EXTRACT_PRICE_DEBUG] Impossible de parser: "${priceText}" -> "${cleanText}"`);
      return null;
    };
    
    let lowestPrice = null;
    let currentPrice = null;
    
    if (lowest3MonthsText) {
      lowestPrice = extractPrice(lowest3MonthsText);
      log.info(`[CALCULATE_MEDIAN] Prix le plus bas extrait: ${lowestPrice} depuis "${lowest3MonthsText}"`);
    }
    
    if (currentLowestText) {
      currentPrice = extractPrice(currentLowestText);
      log.info(`[CALCULATE_MEDIAN] Prix actuel extrait: ${currentPrice} depuis "${currentLowestText}"`);
    }
    
    // Si on n'a qu'un seul prix, l'utiliser comme médian
    if (lowestPrice !== null && currentPrice === null) {
      const formattedMedian = `${lowestPrice.toFixed(2).replace('.', ',')} €`;
      log.info(`[CALCULATE_MEDIAN] Médian basé sur prix minimum uniquement: ${formattedMedian}`);
      return formattedMedian;
    }
    
    if (currentPrice !== null && lowestPrice === null) {
      const formattedMedian = `${currentPrice.toFixed(2).replace('.', ',')} €`;
      log.info(`[CALCULATE_MEDIAN] Médian basé sur prix actuel uniquement: ${formattedMedian}`);
      return formattedMedian;
    }
    
    if (lowestPrice === null || currentPrice === null) {
      log.warning('[CALCULATE_MEDIAN] Impossible de parser les prix numériques');
      return null;
    }
    
    // Calcul du médian approximatif
    let medianValue;
    
    if (lowestPrice === currentPrice) {
      // Si les prix sont identiques, le médian est le même
      medianValue = lowestPrice;
    } else {
      // Calcul approximatif du médian (moyenne entre min et current)
      // En réalité, un vrai calcul nécessiterait tous les points de données du graphique
      medianValue = (lowestPrice + currentPrice) / 2;
    }
    
    // Formater le résultat
    const formattedMedian = `${medianValue.toFixed(2).replace('.', ',')} €`;
    
    log.info(`[CALCULATE_MEDIAN] Médian approximatif calculé: ${formattedMedian} (basé sur min: ${lowestPrice}€, current: ${currentPrice}€)`);
    
    return formattedMedian;
    
  } catch (error) {
    log.error(`[CALCULATE_MEDIAN] Erreur lors du calcul: ${(error as Error).message}`);
    return null;
  }
};

/**
 * Calcule la similarité entre deux chaînes normalisées avec une nouvelle logique de pondération.
 * @returns Un score de similarité final entre 0 et 1.
 */
export const calculateSimilarityWithProductTypeBonus = (
  searchQuery: string,
  candidateTitle: string,
  normalizedQuery: string,
  normalizedCandidate: string
): number => {
    // Utiliser la similarité de Dice comme base, sur les chaînes normalisées sans espaces
    // pour mieux capturer les séquences comme "rtx3060"
    const diceSimilarity = calculateDiceSimilarity(
        normalizedQuery.replace(/\s/g, ''),
        normalizedCandidate.replace(/\s/g, '')
    );

    let bonus = 0;
    const MAX_BONUS = 0.4; // Le bonus total ne peut pas dépasser 0.4 pour ne pas surcoter

    // --- Bonus pour la correspondance des nombres (très important pour les modèles) ---
    const queryNumbers = normalizedQuery.match(/\d+/g) || [];
    const candidateNumbers = normalizedCandidate.match(/\d+/g) || [];
    
    if (queryNumbers.length > 0) {
        const queryNumSet = new Set(queryNumbers);
        const candidateNumSet = new Set(candidateNumbers);
        const commonNumbers = new Set([...queryNumSet].filter(x => candidateNumSet.has(x)));

        if (queryNumSet.size === commonNumbers.size) {
            // Bonus maximal si tous les nombres de la requête sont dans le candidat
            bonus += 0.25;
        } else if (commonNumbers.size > 0) {
            // Bonus partiel proportionnel au nombre de correspondances
            bonus += 0.15 * (commonNumbers.size / queryNumSet.size);
        }
    }

    // --- Bonus pour les termes techniques et variantes communes ---
    const technicalTerms = ['ti', 'super', 'xt', 'oc', 'v2', 'lhr', 'gaming', 'pro', 'dual', 'fan', 'edition', 'white', 'black'];
    const queryWords = new Set(normalizedQuery.split(' '));
    const candidateWords = new Set(normalizedCandidate.split(' '));

    const commonTechTerms = technicalTerms.filter(term => 
        queryWords.has(term) && candidateWords.has(term)
    );

    // Ajoute un petit bonus pour chaque terme technique commun
    bonus += Math.min(0.15, commonTechTerms.length * 0.05);

    // --- Pénalité pour les mots indiquant une incompatibilité ---
    // Par exemple, si l'on cherche "3060" et que le titre contient "3060 ti",
    // mais que la recherche ne contient pas "ti".
    const queryLower = normalizedQuery;
    const candidateLower = normalizedCandidate;

    if (candidateLower.includes('ti') && !queryLower.includes('ti') && queryLower.includes('3060')) {
        // C'est un cas délicat, on peut choisir de ne pas pénaliser pour l'instant
        // car un utilisateur pourrait omettre "ti" en cherchant une "3060 ti".
    }

    // Calculer la similarité finale
    // On combine la similarité de Dice avec le bonus, en s'assurant que le résultat reste entre 0 et 1.
    // La similarité de Dice a plus de poids.
    const finalSimilarity = Math.min(1, (diceSimilarity * 0.7) + Math.min(bonus, MAX_BONUS));

    return finalSimilarity;
}; 