import { API_URL } from './env';
import { supabase } from './supabase';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type PaymentDetails = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  reference: string | null;
  merchantName: string;
  expiresAt: string;
};

type TransferParty = { email: string; name: string | null };

export type Transfer = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  reference: string | null;
  createdAt: string;
  sender: TransferParty;
  recipient: TransferParty;
};

export type KycStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type Overview = {
  success: true;
  balance: number;
  currency: string;
  kycStatus: KycStatus;
  transfers: Transfer[];
};

export type KycProfile = {
  kycStatus: KycStatus;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  kycRejectReason: string | null;
};

export type KycSubmission = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  idFrontPath: string;
  idBackPath: string;
  selfiePath: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(body.error || 'Anfrage fehlgeschlagen', response.status);
  }

  return body as T;
}

export const api = {
  getOverview: () => request<Overview>('/api/transfer'),
  sendTransfer: (input: { recipientEmail: string; amount: number; reference?: string }) =>
    request<{ success: true; transfer: Transfer }>('/api/transfer', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  // Testmodus: ändert nur den Kontostand in der Datenbank, kein echtes Geld
  walletAction: (input: { type: 'DEPOSIT' | 'WITHDRAWAL'; amount: number }) =>
    request<{ success: true; transfer: Transfer }>('/api/wallet', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getKyc: () => request<{ success: true; kyc: KycProfile }>('/api/kyc'),
  submitKyc: (input: KycSubmission) =>
    request<{ success: true; kyc: KycProfile }>('/api/kyc', { method: 'POST', body: JSON.stringify(input) }),
  getPayment: (id: string) => request<{ success: true; payment: PaymentDetails }>(`/api/pay/${id}`),
  confirmPayment: (id: string) =>
    request<{ success: boolean; payment: PaymentDetails }>(`/api/pay/${id}/confirm`, { method: 'POST' }),
};
