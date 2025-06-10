import mongoose from 'mongoose';

// Les imports de modèles ne sont plus nécessaires ici car ils seront chargés dynamiquement par Mongoose
// lors de leur première utilisation. Si un pre-chargement est explicitement voulu,
// il faudra les importer dans un fichier d'initialisation de l'application.

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Veuillez définir la variable d'environnement MONGODB_URI dans .env.local"
  );
}

/** Cache global de connexion pour éviter de recréer des connexions. */
let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    // Tente la connexion et stocke la promesse.
    cached.promise = mongoose.connect(MONGODB_URI!, opts).catch(err => {
      // Réinitialise la promesse en cas d'erreur pour permettre une nouvelle tentative.
      cached.promise = null;
      throw err;
    });
  }

  try {
    // Attend la résolution de la promesse de connexion.
    cached.conn = await cached.promise;
  } catch (e) {
    // Si la connexion échoue, la promesse a déjà été réinitialisée.
    // Il suffit de propager l'erreur.
    throw e;
  }

  return cached.conn;
}

export default dbConnect; 