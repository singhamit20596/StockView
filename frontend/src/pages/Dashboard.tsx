import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CurrencyDollarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { StatCard, Card, LoadingSpinner } from '../components/UI';
import { dashboardAPI } from '../services/api';
import { DashboardData } from '../types';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getOverview();
      
      // Map backend response to expected frontend format
      const backendData = response.data.data as any; // Backend returns wrapped structure
      const mappedData: DashboardData = {
        totalValue: backendData.overview?.overallSummary?.totalCurrent || 0,
        totalInvestment: backendData.overview?.overallSummary?.totalInvested || 0,
        totalGain: backendData.overview?.overallSummary?.totalPnL || 0,
        totalGainPercent: backendData.overview?.overallSummary?.totalPnLPercentage || 0,
        topGainers: [], // TODO: Extract from accountPerformance or add to backend
        topLosers: [], // TODO: Extract from accountPerformance or add to backend
        sectorBreakdown: backendData.overallSectorBreakdown || []
      };
      
      setData(mappedData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'No data available'}</p>
        <button
          onClick={fetchDashboardData}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Portfolio Dashboard</h1>
        <p className="mt-2 text-gray-600">Overview of your investment portfolio</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Portfolio Value"
          value={formatCurrency(data.totalValue)}
          icon={CurrencyDollarIcon}
        />
        <StatCard
          title="Total Investment"
          value={formatCurrency(data.totalInvestment)}
          icon={ChartBarIcon}
        />
        <StatCard
          title="Total Gain/Loss"
          value={formatCurrency(data.totalGain)}
          change={{
            value: data.totalGainPercent,
            type: data.totalGain >= 0 ? 'increase' : 'decrease',
          }}
          icon={data.totalGain >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon}
        />
        <StatCard
          title="Return %"
          value={`${(data.totalGainPercent || 0).toFixed(2)}%`}
          change={{
            value: data.totalGainPercent || 0,
            type: (data.totalGainPercent || 0) >= 0 ? 'increase' : 'decrease',
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Breakdown */}
        <Card title="Portfolio Breakdown by Sector">
          {data.sectorBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.sectorBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ sector, percentage }) => `${sector}: ${(percentage || 0).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.sectorBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No sector data available
            </div>
          )}
        </Card>

        {/* Top Performers */}
        <Card title="Top Performers">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Top Gainers</h4>
              {data.topGainers.length > 0 ? (
                <div className="space-y-2">
                  {data.topGainers.slice(0, 5).map((stock, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{stock.symbol}</p>
                        <p className="text-xs text-gray-500">{stock.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">
                          +{(stock.changePercent || 0).toFixed(2)}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(stock.totalValue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No gainers found</p>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Top Losers</h4>
              {data.topLosers.length > 0 ? (
                <div className="space-y-2">
                  {data.topLosers.slice(0, 5).map((stock, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{stock.symbol}</p>
                        <p className="text-xs text-gray-500">{stock.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-600">
                          {(stock.changePercent || 0).toFixed(2)}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(stock.totalValue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No losers found</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
