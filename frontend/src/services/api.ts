import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const EmailService = {
  getScheduledEmails: async (search?: string) => {
    const res = await apiClient.get('/emails/scheduled', { params: { q: search } });
    return res.data;
  },
  getSentEmails: async (search?: string) => {
    const res = await apiClient.get('/emails/sent', { params: { q: search } });
    return res.data;
  },
  scheduleBatch: async (payload: any) => {
    const res = await apiClient.post('/emails/schedule', payload);
    return res.data;
  },
};

export const AuthService = {
  getCurrentUser: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  logout: async () => {
    const res = await apiClient.post('/auth/logout');
    return res.data;
  },
};

export const SlackService = {
  getStatus: async () => {
    const res = await apiClient.get('/slack/status');
    return res.data;
  },
};
