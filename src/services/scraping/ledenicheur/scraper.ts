import { log } from 'crawlee';
import { spawn } from 'child_process';
import path from 'path';
import { LedenicheurProductDetails } from './ledenicheur.types';

/**
 * Fonction principale pour scraper un produit sur Ledenicheur.fr en utilisant un script Python avec Botasaurus.
 * @param productName Le nom du produit à scraper.
 * @returns Une promesse qui se résout avec les détails du produit ou null.
 */
export const scrapeLedenicheurProduct = async (
  productName: string
): Promise<LedenicheurProductDetails | null> => {
  log.info(`[PYTHON_SCRAPER] Lancement du scraping pour: "${productName}"`);

  // Chemin vers l'interpréteur Python et le script principal.
  // Utilise 'python3' pour être plus explicite.
  const pythonExecutable = 'python3';
  const scraperScriptPath = path.join(process.cwd(), 'scrapers', 'ledenicheur_scraper', 'main.py');

  return new Promise((resolve, reject) => {
    // Lance le script Python en tant que processus enfant.
    const pythonProcess = spawn(pythonExecutable, [scraperScriptPath, productName]);

    let jsonData = '';
    let errorData = '';

    // Écoute la sortie standard (stdout) du script Python.
    // C'est ici que nous recevrons le JSON final.
    pythonProcess.stdout.on('data', (data) => {
      jsonData += data.toString();
    });

    // Écoute la sortie d'erreur (stderr) du script Python.
    // Utile pour le débogage.
    pythonProcess.stderr.on('data', (data) => {
      const errorLine = data.toString();
      errorData += errorLine;
      // Affiche les logs du scraper Python en temps réel pour le débogage.
      log.debug(`[PYTHON_LOG] ${errorLine.trim()}`);
    });

    // Gère la fin de l'exécution du processus.
    pythonProcess.on('close', (code) => {
      log.info(`[PYTHON_SCRAPER] Le script Python s'est terminé avec le code: ${code}`);

      if (code === 0) {
        try {
          // Le script a réussi, on parse le JSON reçu.
          const productDetails: LedenicheurProductDetails = JSON.parse(jsonData);
          log.info(`[PYTHON_SCRAPER] Scraping réussi pour "${productName}".`);
          resolve(productDetails);
        } catch (e) {
          log.error(`[PYTHON_SCRAPER] Erreur de parsing du JSON reçu de Python: ${(e as Error).message}`);
          log.error(`[PYTHON_SCRAPER] Données reçues: ${jsonData}`);
          reject(new Error('Failed to parse JSON from Python scraper.'));
        }
      } else {
        // Le script a échoué.
        log.error(`[PYTHON_SCRAPER] Le script de scraping a échoué pour "${productName}".`);
        log.error(`[PYTHON_SCRAPER] Logs d'erreur:\n${errorData}`);
        resolve(null); // Résoudre avec null en cas d'échec du scraping.
      }
    });

    // Gère les erreurs lors de la création du processus.
    pythonProcess.on('error', (err) => {
      log.error(`[PYTHON_SCRAPER] Erreur lors du lancement du processus Python: ${err.message}`);
      reject(err);
    });
  });
}; 