import dotenv from 'dotenv';
import path from 'path';

function loadEnvironmentVariables() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.warn(
      `Avertissement : Le fichier .env.local à ${envPath} n'a pas pu être chargé. Erreur : ${result.error.message}`
    );
    // Si des variables d'environnement cruciales manquent après cette tentative,
    // des vérifications supplémentaires pourraient être ajoutées ici pour lever une erreur.
  }
}

loadEnvironmentVariables();