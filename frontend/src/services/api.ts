import axios from 'axios';
import { Account, View, ScrapingSession, DashboardData, AccountAnalytics, ViewAnalytics } from '../types';

const API_BASE_URL = 'http://localhost:5002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Accounts API
export const accountsAPI = {
  getAll: () => api.get<Account[]>('/accounts'),
  getById: (id: string) => api.get<Account>(`/accounts/${id}`),
  create: (account: Omit<Account, 'id'>) => api.post<Account>('/accounts', account),
  update: (id: string, account: Partial<Account>) => api.put<Account>(`/accounts/${id}`, account),
  delete: (id: string) => api.delete(`/accounts/${id}`),
};

// Views API
export const viewsAPI = {
  getAll: () => api.get<View[]>('/views'),
  getById: (id: string) => api.get<View>(`/views/${id}`),
  create: (view: Omit<View, 'id' | 'createdAt'>) => api.post<View>('/views', view),
  update: (id: string, view: Partial<View>) => api.put<View>(`/views/${id}`, view),
  delete: (id: string) => api.delete(`/views/${id}`),
  preview: (accountIds: string[]) => api.post<View>('/views/preview', { accountIds }),
};

// Scraping API
export const scrapingAPI = {
  startSession: (broker: string) => api.post<ScrapingSession>('/scraping/start', { broker }),
  getSession: (sessionId: string) => api.get<ScrapingSession>(`/scraping/session/${sessionId}`),
  login: (sessionId: string, credentials: { username: string; password: string }) =>
    api.post<ScrapingSession>(`/scraping/login`, { sessionId, ...credentials }),
  scrapeData: (sessionId: string, accountId: string) =>
    api.post<ScrapingSession>(`/scraping/scrape`, { sessionId, accountId }),
  endSession: (sessionId: string) => api.post(`/scraping/end`, { sessionId }),
};

// Dashboard API
export const dashboardAPI = {
  getOverview: () => api.get<DashboardData>('/dashboard/overview'),
  getAccountAnalytics: (accountId: string) => api.get<AccountAnalytics>(`/dashboard/account/${accountId}`),
  getViewAnalytics: (viewId: string) => api.get<ViewAnalytics>(`/dashboard/view/${viewId}`),
};

export default api;
