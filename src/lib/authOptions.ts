import { NextAuthOptions } from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongoClient";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import User, { IUser, IShippingAddress } from "@/lib/mongodb/models/User";
import dbConnect from "@/lib/mongodb/dbConnect";

const isProduction = process.env.NODE_ENV === "production";

// Type pour éviter `any` dans le callback session
type SessionUserWithId = { id: string; email: string; name: string; image?: string, role: 'user' | 'seller' | 'admin', shippingAddresses: IShippingAddress[] };

// Type pour l'objet utilisateur retourné par authorize
type AuthorizedUser = { id: string; email: string; name?: string; role: 'user' | 'seller' | 'admin', shippingAddresses: IShippingAddress[], image?: string };

const authorizeCredentials = async (credentials: Record<"email" | "password", string> | undefined): Promise<AuthorizedUser> => {
  await dbConnect();
  if (!credentials?.email || !credentials?.password) {
    throw new Error("Email et mot de passe requis.");
  }

  const user: IUser | null = await User.findOne({ email: credentials.email }).select("+password +role +shippingAddresses +image");

  if (!user || !user.password) {
    throw new Error("Identifiants invalides.");
  }

  const isValidPassword = await bcrypt.compare(credentials.password, user.password);
  if (!isValidPassword) {
    throw new Error("Identifiants invalides.");
  }
  
  // Retourne un objet simple compatible avec le type User de NextAuth
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    shippingAddresses: user.shippingAddresses,
    image: user.image
  };
};

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "exemple@email.com" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        const user = await authorizeCredentials(credentials as Record<"email" | "password", string> | undefined);
        // Le `user` retourné est maintenant compatible avec le type attendu par NextAuth.
        return user;
      }
    })
  ],
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // 1. Connexion initiale
      if (user) {
        // L'objet `user` provient de `authorize` et a déjà les bons champs.
        // On le cast pour que TypeScript soit au courant.
        const authorizedUser = user as AuthorizedUser;
        token.id = authorizedUser.id;
        token.role = authorizedUser.role;
        token.shippingAddresses = authorizedUser.shippingAddresses;
        return token;
      }

      // 2. Mise à jour de la session
      if (trigger === "update" && session?.shippingAddresses) {
        token.shippingAddresses = session.shippingAddresses;

        // La logique de persistance est déjà gérée par le point de terminaison API.
        // La réécrire ici est redondant et source d'erreurs.
        // await dbConnect();
        // await User.findByIdAndUpdate(token.id, { shippingAddresses: session.shippingAddresses });
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const userWithRole = session.user as SessionUserWithId;
        userWithRole.id = token.id as string;
        userWithRole.role = token.role as 'user' | 'seller' | 'admin';
        userWithRole.shippingAddresses = token.shippingAddresses as IShippingAddress[];
      }
      return session;
    }
  },
  cookies: {
    sessionToken: {
      name: isProduction ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
        maxAge: 30 * 24 * 60 * 60, // 30 jours
      }
    },
    callbackUrl: {
      name: isProduction ? `__Secure-next-auth.callback-url` : `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      }
    },
    csrfToken: {
      name: isProduction ? `__Host-next-auth.csrf-token` : `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development"
}; 