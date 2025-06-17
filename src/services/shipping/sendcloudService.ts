import axios, { AxiosInstance } from 'axios';
import { loadEnv } from '@/lib/loadEnv';
import { IShippingAddress } from '@/lib/mongodb/models/User';

const { SENDCLOUD_PUBLIC_KEY, SENDCLOUD_SECRET_KEY } = loadEnv();

interface SendcloudSenderAddress {
  id: number;
  company_name: string;
  contact_name: string;
  email: string;
  telephone: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  country: string; // ISO 2
}

interface SendcloudServicePoint {
  id: number;
  name: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  country: string;
  carrier: string;
  distance: number;
}

interface CreateParcelPayload {
  parcel: {
    name: string; // Recipient name
    // company_name?: string;
    // address: string; // Not needed for service points
    // house_number: string;
    // city: string;
    // postal_code: string;
    // country: string;
    email: string; // Recipient email
    telephone: string; // Recipient phone
    to_service_point: number; // Service Point ID
    sender_address: number; // Sender Address ID from Sendcloud
    weight: string; // In kgs, e.g., "1.5"
    request_label: boolean;
    apply_shipping_rules: boolean;
    shipment: {
      id: number; // Shipping method ID
    };
    parcel_items: {
      description: string;
      quantity: number;
      weight: string;
      value: string; // In EUR
      // hs_code?: string; // For international shipping
      // origin_country?: string; // For international shipping
    }[];
  };
}

interface CreatedParcelResponse {
  parcel: {
    id: number;
    tracking_number: string;
    label: {
      label_printer: string; // URL for the label PDF
    };
    // ... other fields
  }
}

class SendcloudService {
  private apiClient: AxiosInstance;
  private servicePointApiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create({
      baseURL: 'https://panel.sendcloud.sc/api/v2',
      auth: {
        username: SENDCLOUD_PUBLIC_KEY,
        password: SENDCLOUD_SECRET_KEY,
      },
    });

    this.servicePointApiClient = axios.create({
      baseURL: 'https://servicepoints.sendcloud.sc/api/v2',
      // No auth needed for public service point lookup
    });
  }

  async getServicePoints(country: string, postalCode: string): Promise<SendcloudServicePoint[]> {
    try {
      const response = await this.servicePointApiClient.get<{ service_points: SendcloudServicePoint[] }>('/service-points', {
        params: {
          country,
          postal_code: postalCode,
          carrier: 'mondial_relay,chronopost,colissimo', // Example carriers
        },
      });
      return response.data.service_points || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Sendcloud ServicePoint API Error:', error.response?.data);
      }
      throw new Error('Failed to fetch service points from Sendcloud.');
    }
  }

  async createParcel(payload: CreateParcelPayload['parcel']): Promise<CreatedParcelResponse['parcel']> {
    try {
      const response = await this.apiClient.post<CreatedParcelResponse>('/parcels', { parcel: payload });
      return response.data.parcel;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Sendcloud Create Parcel API Error:', JSON.stringify(error.response?.data, null, 2));
      }
      throw new Error('Failed to create parcel with Sendcloud.');
    }
  }

  async syncSenderAddress(address: IShippingAddress): Promise<SendcloudSenderAddress> {
    const payload = {
      sender_address: {
        company_name: address.companyName || address.name,
        contact_name: address.name,
        street: address.address,
        house_number: address.houseNumber,
        city: address.city,
        postal_code: address.postalCode,
        country: address.country,
        telephone: address.telephone || '',
        email: '', // L'API ne semble pas requérir l'email ici.
      }
    };

    try {
      const response = await this.apiClient.post<{ sender_address: SendcloudSenderAddress }>('/sender_addresses', payload);
      return response.data.sender_address;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Sendcloud API Error:', error.response?.data);
      }
      throw new Error('Failed to sync sender address with Sendcloud.');
    }
  }

  // Future methods will go here
  // e.g., getServicePoints, createParcel, etc.
}

export const sendcloudService = new SendcloudService(); 