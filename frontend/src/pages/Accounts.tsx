import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline';
import { Button, Card, LoadingSpinner } from '../components/UI';
import { accountsAPI } from '../services/api';
import { Account } from '../types';

interface AccountFormData {
  name: string;
  broker: string;
  isActive: boolean;
}

export const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    broker: 'groww',
    isActive: true,
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountsAPI.getAll();
      setAccounts(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch accounts');
      console.error('Accounts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await accountsAPI.update(editingAccount.id, formData);
      } else {
        await accountsAPI.create({
          ...formData,
          stocks: [],
          totalValue: 0,
          totalInvestment: 0,
          totalGain: 0,
          totalGainPercent: 0,
        });
      }
      await fetchAccounts();
      setShowForm(false);
      setEditingAccount(null);
      setFormData({ name: '', broker: 'groww', isActive: true });
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      broker: account.broker,
      isActive: account.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await accountsAPI.delete(id);
        await fetchAccounts();
      } catch (err) {
        console.error('Delete error:', err);
      }
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
          <p className="mt-2 text-gray-600">Manage your broker accounts</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Account Form */}
      {showForm && (
        <Card title={editingAccount ? 'Edit Account' : 'Add New Account'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Account Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="broker" className="block text-sm font-medium text-gray-700">
                Broker
              </label>
              <select
                id="broker"
                value={formData.broker}
                onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="groww">Groww</option>
                <option value="zerodha">Zerodha</option>
                <option value="upstox">Upstox</option>
                <option value="angelone">Angel One</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Active Account
              </label>
            </div>

            <div className="flex space-x-3">
              <Button type="submit">
                {editingAccount ? 'Update' : 'Create'} Account
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingAccount(null);
                  setFormData({ name: '', broker: 'groww', isActive: true });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Accounts List */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {accounts.map((account) => (
          <Card key={account.id}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <h3 className="text-lg font-medium text-gray-900">{account.name}</h3>
                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    account.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500 capitalize">{account.broker}</p>
                <p className="text-xs text-gray-400">Last synced: {formatDate(account.lastSynced)}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(account)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Portfolio Value</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(account.totalValue)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Total Gain/Loss</p>
                <p className={`text-lg font-semibold ${
                  account.totalGain >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(account.totalGain)} ({account.totalGainPercent.toFixed(2)}%)
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-gray-900 mb-2">Holdings ({account.stocks.length})</p>
              {account.stocks.length > 0 ? (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {account.stocks.slice(0, 5).map((stock, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-gray-600">{stock.symbol}</span>
                      <span className={`font-medium ${
                        stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stock.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                  {account.stocks.length > 5 && (
                    <p className="text-xs text-gray-400">...and {account.stocks.length - 5} more</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-4 text-gray-400">
                  <CloudArrowDownIcon className="h-8 w-8 mr-2" />
                  <span className="text-sm">No data synced yet</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {accounts.length === 0 && !loading && (
        <div className="text-center py-12">
          <CloudArrowDownIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No accounts</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first account.</p>
          <div className="mt-6">
            <Button onClick={() => setShowForm(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
