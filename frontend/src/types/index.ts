export interface Stock {
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number;
  totalValue: number;
  change: number;
  changePercent: number;
}

export interface Account {
  id: string;
  name: string;
  broker: string;
  isActive: boolean;
  lastSynced?: string;
  stocks: Stock[];
  totalValue: number;
  totalInvestment: number;
  totalGain: number;
  totalGainPercent: number;
}

export interface View {
  id: string;
  name: string;
  accountIds: string[];
  createdAt: string;
  stocks: Stock[];
  totalValue: number;
  totalInvestment: number;
  totalGain: number;
  totalGainPercent: number;
}

export interface ScrapingSession {
  id: string;
  broker: string;
  status: 'pending' | 'logging_in' | 'logged_in' | 'scraping' | 'completed' | 'error';
  message?: string;
  data?: any;
}

export interface DashboardData {
  totalValue: number;
  totalInvestment: number;
  totalGain: number;
  totalGainPercent: number;
  topGainers: Stock[];
  topLosers: Stock[];
  sectorBreakdown: { sector: string; value: number; percentage: number }[];
}

export interface AccountAnalytics extends DashboardData {
  accountId: string;
  accountName: string;
}

export interface ViewAnalytics extends DashboardData {
  viewId: string;
  viewName: string;
}
