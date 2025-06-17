import { NextResponse, NextRequest } from 'next/server';
import { sendcloudService } from '@/services/shipping/sendcloudService';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get('country');
  const postalCode = searchParams.get('postalCode');

  if (!country || !postalCode) {
    return NextResponse.json({ message: 'Missing country or postalCode parameters' }, { status: 400 });
  }

  try {
    const servicePoints = await sendcloudService.getServicePoints(country, postalCode);
    return NextResponse.json(servicePoints);
  } catch (error) {
    console.error('Failed to get service points:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
