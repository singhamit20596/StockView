import React, { useState, useEffect } from 'react';
import { CloudArrowDownIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Button, Card, LoadingSpinner } from '../components/UI';
import { scrapingAPI, accountsAPI } from '../services/api';
import { Account, ScrapingSession } from '../types';

interface SyncData {
  broker: string;
  username: string;
  password: string;
  accountId: string;
}

export const Sync: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<ScrapingSession | null>(null);
  const [syncData, setSyncData] = useState<SyncData>({
    broker: 'groww',
    username: '',
    password: '',
    accountId: '',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await accountsAPI.getAll();
      setAccounts(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const startScraping = async () => {
    try {
      setLoading(true);
      const response = await scrapingAPI.initiate(syncData.broker, syncData.accountId);
      setSession(response.data.data);
    } catch (err) {
      console.error('Failed to start scraping session:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    if (!session) return;
    
    try {
      setLoading(true);
      const response = await scrapingAPI.checkLogin(session.sessionId);
      setSession(response.data.data);
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrapeData = async () => {
    if (!session) return;
    
    try {
      setLoading(true);
      const response = await scrapingAPI.scrapeData(session.sessionId);
      setSession(response.data.data);
      
      // Refresh accounts data after scraping
      if (response.data.data.status === 'completed') {
        await fetchAccounts();
      }
    } catch (err) {
      console.error('Scraping failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    if (!session) return;
    
    try {
      await scrapingAPI.endSession(session.sessionId);
      setSession(null);
      setSyncData({
        broker: 'groww',
        username: '',
        password: '',
        accountId: '',
      });
    } catch (err) {
      console.error('Failed to end session:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'pending':
      case 'logging_in':
      case 'scraping':
        return 'text-yellow-600';
      case 'logged_in':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      default:
        return <LoadingSpinner size="sm" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sync Data</h1>
        <p className="mt-2 text-gray-600">Import portfolio data from your broker</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sync Form */}
        <Card title="Import from Broker">
          <div className="space-y-4">
            <div>
              <label htmlFor="broker" className="block text-sm font-medium text-gray-700">
                Broker
              </label>
              <select
                id="broker"
                value={syncData.broker}
                onChange={(e) => setSyncData({ ...syncData, broker: e.target.value })}
                disabled={!!session}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              >
                <option value="groww">Groww</option>
                <option value="zerodha">Zerodha (Coming Soon)</option>
                <option value="upstox">Upstox (Coming Soon)</option>
                <option value="angelone">Angel One (Coming Soon)</option>
              </select>
            </div>

            <div>
              <label htmlFor="account" className="block text-sm font-medium text-gray-700">
                Target Account
              </label>
              <select
                id="account"
                value={syncData.accountId}
                onChange={(e) => setSyncData({ ...syncData, accountId: e.target.value })}
                disabled={!!session}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                required
              >
                <option value="">Select an account</option>
                {accounts
                  .filter(account => account.broker === syncData.broker)
                  .map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
              </select>
            </div>

            {!session && (
              <>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username/Email
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={syncData.username}
                    onChange={(e) => setSyncData({ ...syncData, username: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={syncData.password}
                    onChange={(e) => setSyncData({ ...syncData, password: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>

                <Button
                  onClick={startScraping}
                  loading={loading}
                  disabled={!syncData.accountId || !syncData.username || !syncData.password}
                  className="w-full"
                >
                  <CloudArrowDownIcon className="h-4 w-4 mr-2" />
                  Start Import
                </Button>
              </>
            )}

            {session && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(session.status)}
                  <span className={`text-sm font-medium ${getStatusColor(session.status)}`}>
                    Status: {session.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {session.message && (
                  <p className="text-sm text-gray-600">{session.message}</p>
                )}

                <div className="flex space-x-2">
                  {session.status === 'pending' && (
                    <Button
                      onClick={login}
                      loading={loading}
                      className="flex-1"
                    >
                      Login
                    </Button>
                  )}

                  {session.status === 'logged_in' && (
                    <Button
                      onClick={scrapeData}
                      loading={loading}
                      className="flex-1"
                    >
                      Import Data
                    </Button>
                  )}

                  <Button
                    onClick={endSession}
                    variant="secondary"
                  >
                    End Session
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Instructions */}
        <Card title="How to Import Data">
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Before you start:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Make sure you have created an account for your broker</li>
                <li>Have your login credentials ready</li>
                <li>Ensure you have holdings in your broker account</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Import Process:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Select your broker and target account</li>
                <li>Enter your login credentials</li>
                <li>Click "Start Import" to begin the process</li>
                <li>Wait for the login to complete</li>
                <li>Click "Import Data" to fetch your holdings</li>
                <li>Your portfolio data will be updated automatically</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-yellow-800">Security Note</h4>
                  <p className="text-yellow-700 text-xs mt-1">
                    Your credentials are used only for this import session and are not stored.
                    The import uses automated browser sessions for data extraction.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Accounts */}
      {accounts.length > 0 && (
        <Card title="Your Accounts">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="border rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{account.name}</h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    account.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 capitalize mb-1">{account.broker}</p>
                <p className="text-xs text-gray-400">
                  Last synced: {account.lastSynced 
                    ? new Date(account.lastSynced).toLocaleDateString('en-IN')
                    : 'Never'
                  }
                </p>
                <p className="text-sm font-medium text-gray-900 mt-2">
                  {account.stocks.length} holdings
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
