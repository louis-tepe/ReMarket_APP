import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/authOptions';
import User from '@/lib/mongodb/models/User';
import dbConnect from '@/lib/mongodb/dbConnect';
import { sendcloudService } from '@/services/shipping/sendcloudService';
import { IShippingAddress } from '@/lib/mongodb/models/User';

const addressSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  houseNumber: z.string().min(1, "House number is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(2, "Country is required").max(2, "Country must be a 2-letter code"),
  companyName: z.string().optional(),
  telephone: z.string().optional(),
});


export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: IShippingAddress = await req.json();
    
    const validation = addressSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid address data', errors: validation.error.issues }, { status: 400 });
    }

    await dbConnect();

    const senderAddress = await sendcloudService.syncSenderAddress(body);
    const sendcloudSenderId = senderAddress.id;

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      {
        shippingAddress: body,
        sendcloudSenderId: sendcloudSenderId,
      },
      { new: true, select: 'shippingAddress sendcloudSenderId' }
    );

    if (!updatedUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Failed to update shipping address:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
