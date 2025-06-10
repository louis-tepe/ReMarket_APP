interface Filters {
    categorySlug?: string;
    brandSlugs?: string[];
    searchQuery?: string;
}

interface Product {
    _id: string;
    title: string;
    slug: string;
    standardImageUrls?: string[];
    sellerOffers?: { price: number }[];
}

export async function getProducts(filters: Filters): Promise<{ success: boolean; data: Product[]; message?: string }> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
        return { success: false, data: [], message: "Configuration error: NEXT_PUBLIC_API_URL is not defined." };
    }

    let fetchUrl = `${apiUrl}/products`;
    const queryParams = new URLSearchParams();
    if (filters.categorySlug?.trim()) {
        queryParams.append('categorySlug', filters.categorySlug);
    }
    if (filters.brandSlugs?.length) {
        queryParams.append('brandSlugs', filters.brandSlugs.join(','));
    }
    if (filters.searchQuery?.trim()) {
        queryParams.append('search', filters.searchQuery.trim());
    }

    if (queryParams.toString()) {
        fetchUrl += `?${queryParams.toString()}`;
    }

    try {
        const res = await fetch(fetchUrl, {
            cache: 'no-store', // 'no-store' pour les actions serveur pour garantir des données fraîches
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Failed to fetch products and could not parse error response.' }));
            return { success: false, data: [], message: `Failed to fetch products. Status: ${res.status}. ${errorData.message}` };
        }

        const data = await res.json();
        return data;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during fetch.";
        return { success: false, data: [], message: errorMessage };
    }
} 