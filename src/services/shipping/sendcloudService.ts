import axios, { AxiosInstance } from 'axios';
import { loadEnv } from '@/lib/loadEnv';

const { SENDCLOUD_PUBLIC_KEY, SENDCLOUD_SECRET_KEY } = loadEnv();

// Manually create the Basic Auth token
const token = Buffer.from(
  `${SENDCLOUD_PUBLIC_KEY}:${SENDCLOUD_SECRET_KEY}`,
  'utf-8'
).toString('base64');

const authHeaders = {
  'Authorization': `Basic ${token}`,
  'Content-Type': 'application/json',
};

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

interface ShippingMethod {
  id: number;
  name: string;
  carrier: string;
  min_weight: string;
  max_weight: string;
}

interface CreateParcelPayload {
  parcel: {
    name: string; // Recipient name
    address: string;
    house_number: string;
    city: string;
    postal_code: string;
    country: string;
    email: string; // Recipient email
    telephone: string; // Recipient phone
    to_service_point: number; // Service Point ID
    
    // For marketplace model, we pass the sender address directly
    from_address: {
      from_name: string;
      from_company_name?: string;
      from_street: string;
      from_house_number: string;
      from_city: string;
      from_postal_code: string;
      from_country: string;
      from_telephone?: string;
      from_email: string;
    };

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
      headers: authHeaders,
    });
    
    this.servicePointApiClient = axios.create({
      baseURL: 'https://servicepoints.sendcloud.sc/api/v2',
      headers: authHeaders,
    });
  }

  async getShippingMethodsForServicePoint(servicePointId: number): Promise<ShippingMethod[]> {
    try {
      const response = await this.apiClient.get('/shipping_methods', {
        params: { service_point_id: servicePointId },
      });
      return response.data.shipping_methods;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Sendcloud getShippingMethods API Error:', JSON.stringify(error.response?.data, null, 2));
      }
      throw new Error('Failed to fetch shipping methods from Sendcloud.');
    }
  }

  async getServicePoints(country: string, postalCode: string): Promise<SendcloudServicePoint[]> {
    try {
      const response = await this.servicePointApiClient.get('/service-points', {
        params: {
          country,
          postal_code: postalCode,
          carrier: 'mondial_relay,chronopost,colissimo',
        },
      });
      return response.data;
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

  // Future methods will go here
  // e.g., getServicePoints, createParcel, etc.
}

export const sendcloudService = new SendcloudService(); 