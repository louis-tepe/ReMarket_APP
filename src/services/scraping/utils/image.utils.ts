import fs from 'fs/promises';
import path from 'path';
import { log } from 'crawlee';
import crypto from 'crypto';

/**
 * Télécharge une image depuis une URL et l'enregistre localement
 * @param imageUrl - L'URL de l'image à télécharger
 * @param productSlug - Le slug du produit pour organiser les images
 * @returns L'URL locale de l'image enregistrée ou null en cas d'erreur
 */
export const downloadAndSaveImage = async (
    imageUrl: string, 
    productSlug: string
): Promise<string | null> => {
    try {
        // Créer un nom de fichier unique basé sur l'URL
        const urlHash = crypto.createHash('md5').update(imageUrl).digest('hex');
        const urlObj = new URL(imageUrl);
        const originalExtension = path.extname(urlObj.pathname) || '.jpg';
        const fileName = `${productSlug}_${urlHash}${originalExtension}`;
        
        // Créer le chemin de destination
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'images');
        const filePath = path.join(uploadsDir, fileName);
        
        // S'assurer que le répertoire existe
        await fs.mkdir(uploadsDir, { recursive: true });
        
        // Vérifier si le fichier existe déjà
        try {
            await fs.access(filePath);
            log.info(`[IMAGE_DOWNLOAD] Image already exists locally: ${fileName}`);
            return `/uploads/images/${fileName}`;
        } catch {
            // Le fichier n'existe pas, continuer avec le téléchargement
        }
        
        // Télécharger l'image
        log.info(`[IMAGE_DOWNLOAD] Downloading image from: ${imageUrl}`);
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
            log.error(`[IMAGE_DOWNLOAD] Failed to download image: ${imageUrl}. Status: ${response.status}`);
            return null;
        }
        
        // Vérifier le type de contenu
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            log.error(`[IMAGE_DOWNLOAD] Invalid content type for image: ${contentType}. URL: ${imageUrl}`);
            return null;
        }
        
        // Enregistrer l'image
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.writeFile(filePath, buffer);
        
        log.info(`[IMAGE_DOWNLOAD] Image saved successfully: ${fileName} (${buffer.length} bytes)`);
        return `/uploads/images/${fileName}`;
        
    } catch (error) {
        log.error(`[IMAGE_DOWNLOAD] Error downloading image from ${imageUrl}:`, { 
            error: error instanceof Error ? error.message : String(error) 
        });
        return null;
    }
};

/**
 * Télécharge plusieurs images et retourne les URLs locales
 * @param imageUrls - Liste des URLs d'images à télécharger
 * @param productSlug - Le slug du produit pour organiser les images
 * @returns Liste des URLs locales des images téléchargées avec succès
 */
export const downloadAndSaveImages = async (
    imageUrls: string[], 
    productSlug: string
): Promise<string[]> => {
    if (!imageUrls || imageUrls.length === 0) {
        log.info(`[IMAGE_DOWNLOAD] No images to download for product: ${productSlug}`);
        return [];
    }
    
    log.info(`[IMAGE_DOWNLOAD] Starting download of ${imageUrls.length} images for product: ${productSlug}`);
    
    const downloadPromises = imageUrls.map(async (url, index) => {
        try {
            const localUrl = await downloadAndSaveImage(url, productSlug);
            if (localUrl) {
                log.info(`[IMAGE_DOWNLOAD] Image ${index + 1}/${imageUrls.length} downloaded successfully for ${productSlug}`);
                return localUrl;
            } else {
                log.warning(`[IMAGE_DOWNLOAD] Failed to download image ${index + 1}/${imageUrls.length} for ${productSlug}: ${url}`);
                return null;
            }
        } catch (error) {
            log.error(`[IMAGE_DOWNLOAD] Error downloading image ${index + 1}/${imageUrls.length} for ${productSlug}:`, { 
                url, 
                error: error instanceof Error ? error.message : String(error) 
            });
            return null;
        }
    });
    
    const results = await Promise.all(downloadPromises);
    const successfulDownloads = results.filter((url): url is string => url !== null);
    
    log.info(`[IMAGE_DOWNLOAD] Download complete for ${productSlug}: ${successfulDownloads.length}/${imageUrls.length} images saved`);
    
    return successfulDownloads;
}; 