'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';

/**
 * Provides the NextAuth session context to the application.
 * This is a Client Component that wraps its children with SessionProvider.
 */
export default function NextAuthProvider({ children }: { children: React.ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>;
} 