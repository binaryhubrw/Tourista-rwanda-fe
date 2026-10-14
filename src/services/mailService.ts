import { api } from './apiClient';

export interface MailStatus {
  mode: 'smtp' | 'json';
  transport: string;
  from: string;
  verified: boolean | null;
  queued: number;
  sent: number;
  failed: number;
  lastError?: string;
  lastSentAt?: string;
}

export function getMailStatus() {
  return api.get<MailStatus>('/mail/status/');
}

export function sendTestMail(to?: string) {
  return api.post<{ to: string } & MailStatus>('/mail/test/', to ? { to } : {});
}
