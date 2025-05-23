import dotenv from 'dotenv';
import path from 'path';

function loadEnvironmentVariables() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.warn(
      `Avertissement: Fichier .env.local non trouvé ou erreur de chargement à ${envPath}. Erreur: ${result.error.message}`
    );
    // Des vérifications supplémentaires pour les variables critiques pourraient être ajoutées ici.
  }
}

loadEnvironmentVariables();