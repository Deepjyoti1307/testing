import axios from 'axios';
import { SchedulePayload } from '../types/index.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT Bearer Token if present
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('reachinbox_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const AuthService = {
  getGoogleAuthUrl: async () => {
    const res = await apiClient.get('/auth/google/url');
    return res.data.url;
  },
  getCurrentUser: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data.user;
  },
  logout: async () => {
    localStorage.removeItem('reachinbox_token');
    await apiClient.post('/auth/logout');
  },
};

export const SenderService = {
  getSenders: async () => {
    const res = await apiClient.get('/senders');
    return res.data.senders;
  },
  provisionEthereal: async (name?: string) => {
    const res = await apiClient.post('/senders/provision-ethereal', { name });
    return res.data.sender;
  },
  getSenderStats: async (senderId: string) => {
    const res = await apiClient.get(`/senders/${senderId}/stats`);
    return res.data;
  },
};

export const EmailService = {
  getScheduledEmails: async (query?: string) => {
    const res = await apiClient.get('/emails/scheduled', { params: { q: query } });
    return res.data.emails;
  },
  getSentEmails: async (query?: string) => {
    const res = await apiClient.get('/emails/sent', { params: { q: query } });
    return res.data.emails;
  },
  searchEmails: async (query?: string, status?: string) => {
    const res = await apiClient.get('/emails/search', { params: { q: query, status } });
    return res.data.hits;
  },
  parseLeads: async (content: string) => {
    const res = await apiClient.post('/emails/parse-leads', { content });
    return res.data;
  },
  scheduleBatch: async (payload: SchedulePayload) => {
    const res = await apiClient.post('/emails/schedule', payload);
    return res.data;
  },
  cancelEmail: async (id: string) => {
    const res = await apiClient.delete(`/emails/${id}`);
    return res.data;
  },
};

export const SlackService = {
  getConnectUrl: async () => {
    const res = await apiClient.get('/slack/connect');
    return res.data.url;
  },
  getStatus: async () => {
    const res = await apiClient.get('/slack/status');
    return res.data;
  },
  connectWebhook: async (webhookUrl: string, channelName?: string) => {
    const res = await apiClient.post('/slack/webhook', { webhookUrl, channelName });
    return res.data;
  },
  sendTestAlert: async () => {
    const res = await apiClient.post('/slack/test');
    return res.data;
  },
  disconnect: async () => {
    const res = await apiClient.post('/slack/disconnect');
    return res.data;
  },
};
