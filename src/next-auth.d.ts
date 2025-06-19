import 'next-auth';
import { IShippingAddress } from '@/lib/mongodb/models/User';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role: 'user' | 'seller' | 'admin';
      shippingAddresses: IShippingAddress[];
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'user' | 'seller' | 'admin';
    shippingAddresses: IShippingAddress[];
  }
} 