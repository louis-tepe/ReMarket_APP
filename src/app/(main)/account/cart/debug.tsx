'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface ApiResponse {
    success?: boolean;
    items?: unknown[];
    message?: string;
    [key: string]: unknown;
}

export default function DebugCart() {
    const { data: session, status } = useSession();
    const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'authenticated') {
            fetch('/api/cart')
                .then(res => res.json())
                .then(data => {
                    console.log('Debug - API Response:', JSON.stringify(data, null, 2));
                    setApiResponse(data);
                })
                .catch(err => {
                    console.error('Debug - Error:', err);
                    setError(err.message);
                });
        }
    }, [status]);

    if (status === 'loading') return <div>Loading session...</div>;
    if (status === 'unauthenticated') return <div>Not authenticated</div>;

    return (
        <div style={{ padding: '20px', backgroundColor: '#f0f0f0', margin: '20px', borderRadius: '8px' }}>
            <h2>Debug Cart Data</h2>
            <h3>Session Status: {status}</h3>
            <h3>User ID: {session?.user?.id}</h3>

            {error && (
                <div style={{ color: 'red' }}>
                    <h4>Error:</h4>
                    <pre>{error}</pre>
                </div>
            )}

            {apiResponse && (
                <div>
                    <h4>API Response:</h4>
                    <pre style={{ backgroundColor: 'white', padding: '10px', overflow: 'auto' }}>
                        {JSON.stringify(apiResponse, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
} 