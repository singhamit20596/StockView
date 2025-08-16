import axios from 'axios';
import { Account, View, ScrapingSession, DashboardData, AccountAnalytics, ViewAnalytics } from '../types';
import { ApiResponse } from '../types/api';

const API_BASE_URL = 'http://localhost:5002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Accounts API
export const accountsAPI = {
  getAll: () => api.get<ApiResponse<Account[]>>('/accounts'),
  getById: (id: string) => api.get<ApiResponse<Account>>(`/accounts/${id}`),
  create: (account: Omit<Account, 'id'>) => api.post<ApiResponse<Account>>('/accounts', account),
  update: (id: string, account: Partial<Account>) => api.put<ApiResponse<Account>>(`/accounts/${id}`, account),
  delete: (id: string) => api.delete<ApiResponse<{}>>(`/accounts/${id}`),
};

// Views API
export const viewsAPI = {
  getAll: () => api.get<ApiResponse<View[]>>('/views'),
  getById: (id: string) => api.get<ApiResponse<View>>(`/views/${id}`),
  create: (view: Omit<View, 'id' | 'createdAt'>) => api.post<ApiResponse<View>>('/views', view),
  update: (id: string, view: Partial<View>) => api.put<ApiResponse<View>>(`/views/${id}`, view),
  delete: (id: string) => api.delete<ApiResponse<{}>>(`/views/${id}`),
  preview: (accountIds: string[]) => api.post<ApiResponse<View>>('/views/preview', { accountIds }),
};

// Scraping API
export const scrapingAPI = {
  initiate: (broker: string, accountName: string) => api.post<ApiResponse<ScrapingSession>>('/scraping/initiate', { broker, accountName }),
  getSession: (sessionId: string) => api.get<ApiResponse<ScrapingSession>>(`/scraping/session/${sessionId}`),
  checkLogin: (sessionId: string) => api.post<ApiResponse<ScrapingSession>>(`/scraping/check-login/${sessionId}`),
  scrapeData: (sessionId: string) => api.post<ApiResponse<ScrapingSession>>(`/scraping/scrape/${sessionId}`),
  endSession: (sessionId: string) => api.delete<ApiResponse<{}>>(`/scraping/session/${sessionId}`),
};

// Dashboard API
export const dashboardAPI = {
  getOverview: () => api.get<ApiResponse<DashboardData>>('/dashboard/overview'),
  getAccountAnalytics: (accountId: string) => api.get<ApiResponse<AccountAnalytics>>(`/dashboard/account/${accountId}`),
  getViewAnalytics: (viewId: string) => api.get<ApiResponse<ViewAnalytics>>(`/dashboard/view/${viewId}`),
};

export default api;
