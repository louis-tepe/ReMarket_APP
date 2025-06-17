import { NextAuthOptions } from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongoClient";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import User, { IUser } from "@/lib/mongodb/models/User";
import dbConnect from "@/lib/mongodb/dbConnect";

const isProduction = process.env.NODE_ENV === "production";

// Type pour éviter `any` dans le callback session
type SessionUserWithId = { id?: string; email?: string | null; name?: string | null; image?: string | null };

const authorizeCredentials = async (credentials: Record<"email" | "password", string> | undefined) => {
  await dbConnect();
  if (!credentials?.email || !credentials?.password) {
    throw new Error("Email et mot de passe requis.");
  }

  const user: IUser | null = await User.findOne({ email: credentials.email }).select("+password");

  if (!user || !user.password) {
    throw new Error("Identifiants invalides.");
  }

  const isValidPassword = await bcrypt.compare(credentials.password, user.password);
  if (!isValidPassword) {
    throw new Error("Identifiants invalides.");
  }

  return { id: user._id.toString(), email: user.email, name: user.name };
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
        // Appel de la fonction d'autorisation extraite
        return await authorizeCredentials(credentials as Record<"email" | "password", string> | undefined);
      }
    })
  ],
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        return { ...token, id: user.id };
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as SessionUserWithId).id = token.id as string;
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