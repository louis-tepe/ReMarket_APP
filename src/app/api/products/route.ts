import { NextResponse } from 'next/server';

/**
 * @deprecated Cette route API est obsolète. La logique a été déplacée vers
 * la fonction `findProducts` dans `src/services/core/product-service.ts`.
 * Utilisez les Server Actions (`getProducts`) ou appelez le service directement
 * depuis d'autres parties du backend. Cette route sera supprimée dans une
 * version future.
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "Cette route est obsolète. Veuillez utiliser les Server Actions ou appeler directement les services.",
    },
    { status: 410 } // 410 Gone
  );
} 