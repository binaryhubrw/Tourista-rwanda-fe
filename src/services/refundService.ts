import type { PaymentMethod, Refund, RefundReturn } from '@/types';
import { api } from './apiClient';

export type RefundRequestInput = {
  bookingId: string;
  reason: string;
  proof?: string;
  amountRwf?: number;
  receiveMethod: PaymentMethod;
  receiveAccount: string;
  receiveName: string;
};

export async function getRefunds(scope?: 'traveller'): Promise<Refund[]> {
  return api.get<Refund[]>(scope ? `/refunds/?scope=${scope}` : '/refunds/');
}

export async function getRefundById(id: string): Promise<Refund> {
  return api.get<Refund>(`/refunds/${id}/`);
}

export async function requestRefund(input: RefundRequestInput): Promise<Refund> {
  return api.post<Refund>('/refunds/', input);
}

export async function approveRefund(id: string, note?: string): Promise<Refund> {
  return api.post<Refund>(`/refunds/${id}/approve/`, { note });
}

export async function rejectRefund(id: string, note?: string): Promise<Refund> {
  return api.post<Refund>(`/refunds/${id}/reject/`, { note });
}

export async function completeRefund(id: string, input: Omit<RefundReturn, 'sentTo' | 'sentToName' | 'sentAt' | 'reference'>): Promise<Refund> {
  return api.post<Refund>(`/refunds/${id}/complete/`, {
    method: input.method,
    senderName: input.senderName,
    senderAccount: input.senderAccount,
    senderAddress: input.senderAddress,
    proof: input.proof,
  });
}

export async function cancelRefund(id: string): Promise<Refund> {
  return api.post<Refund>(`/refunds/${id}/cancel/`, {});
}
