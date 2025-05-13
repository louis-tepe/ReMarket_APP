import dotenv from 'dotenv';
import path from 'path';

function loadEnvironmentVariables() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    // Vous pouvez choisir de logger un avertissement ou de lever une erreur si .env.local est crucial
    console.warn(
      `Avertissement : Le fichier .env.local à ${envPath} n'a pas pu être chargé. Erreur: ${result.error.message}`
    );
    // Si MONGODB_URI est absolument requis et que le fichier .env.local est la seule source,
    // vous pourriez envisager de lever une erreur ici pour arrêter le processus plus tôt.
    // Exemple: throw new Error(`Impossible de charger .env.local: ${result.error.message}`);
  }

  // Pour débogage, vous pouvez vérifier si la variable est chargée:
  // console.log(`MONGODB_URI après dotenv.config: ${process.env.MONGODB_URI ? 'Défini' : 'Non défini ou vide'}`);
}

loadEnvironmentVariables();