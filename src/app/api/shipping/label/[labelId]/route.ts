import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { loadEnv } from '@/lib/loadEnv';

const { SENDCLOUD_PUBLIC_KEY, SENDCLOUD_SECRET_KEY } = loadEnv();

const token = Buffer.from(
  `${SENDCLOUD_PUBLIC_KEY}:${SENDCLOUD_SECRET_KEY}`,
  'utf-8'
).toString('base64');

const authHeaders = {
  'Authorization': `Basic ${token}`,
};

export async function GET(
  req: NextRequest
) {
  // Extract labelId from the URL path
  const labelId = req.nextUrl.pathname.split('/').pop();

  if (!labelId) {
    return NextResponse.json({ message: 'Label ID is required' }, { status: 400 });
  }

  const labelUrl = `https://panel.sendcloud.sc/api/v2/labels/label_printer/${labelId}`;

  try {
    const response = await axios.get(labelUrl, {
      headers: authHeaders,
      responseType: 'arraybuffer', // Important to receive the PDF as a binary buffer
    });

    // Create response headers
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="label-${labelId}.pdf"`);

    // Return the PDF to the client
    return new NextResponse(response.data, { status: 200, headers });

  } catch (error) {
    console.error('Error fetching Sendcloud label:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error response:', error.response?.data);
      return NextResponse.json(
        { message: 'Error fetching label from Sendcloud', details: error.response?.data },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 