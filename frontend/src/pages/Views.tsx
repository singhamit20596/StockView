import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { Button, Card, LoadingSpinner } from '../components/UI';
import { viewsAPI, accountsAPI } from '../services/api';
import { View, Account } from '../types';

interface ViewFormData {
  name: string;
  accountIds: string[];
}

export const Views: React.FC = () => {
  const [views, setViews] = useState<View[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingView, setEditingView] = useState<View | null>(null);
  const [previewData, setPreviewData] = useState<View | null>(null);
  const [formData, setFormData] = useState<ViewFormData>({
    name: '',
    accountIds: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [viewsResponse, accountsResponse] = await Promise.all([
        viewsAPI.getAll(),
        accountsAPI.getAll(),
      ]);
      setViews(viewsResponse.data.data || []);
      setAccounts(accountsResponse.data.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Views error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (formData.accountIds.length === 0) return;
    
    try {
      const response = await viewsAPI.preview(formData.accountIds);
      setPreviewData(response.data.data);
    } catch (err) {
      console.error('Preview error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingView) {
        await viewsAPI.update(editingView.id, formData);
      } else {
        await viewsAPI.create({
          ...formData,
          stocks: [],
          totalValue: 0,
          totalInvestment: 0,
          totalGain: 0,
          totalGainPercent: 0,
        });
      }
      await fetchData();
      setShowForm(false);
      setEditingView(null);
      setPreviewData(null);
      setFormData({ name: '', accountIds: [] });
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleEdit = (view: View) => {
    setEditingView(view);
    setFormData({
      name: view.name,
      accountIds: view.accountIds,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this view?')) {
      try {
        await viewsAPI.delete(id);
        await fetchData();
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  const handleAccountToggle = (accountId: string) => {
    const newAccountIds = formData.accountIds.includes(accountId)
      ? formData.accountIds.filter(id => id !== accountId)
      : [...formData.accountIds, accountId];
    
    setFormData({ ...formData, accountIds: newAccountIds });
    setPreviewData(null); // Clear preview when accounts change
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
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
          <h1 className="text-3xl font-bold text-gray-900">Views</h1>
          <p className="mt-2 text-gray-600">Combine multiple accounts for unified analysis</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create View
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* View Form */}
      {showForm && (
        <Card title={editingView ? 'Edit View' : 'Create New View'}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                View Name
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
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Accounts
              </label>
              <div className="space-y-2">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`account-${account.id}`}
                      checked={formData.accountIds.includes(account.id)}
                      onChange={() => handleAccountToggle(account.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`account-${account.id}`} className="ml-3 text-sm text-gray-700">
                      {account.name} ({account.broker})
                    </label>
                  </div>
                ))}
              </div>
              {formData.accountIds.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handlePreview}
                  className="mt-3"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Preview Combined Data
                </Button>
              )}
            </div>

            {/* Preview Data */}
            {previewData && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Preview</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Value</p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(previewData.totalValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Gain/Loss</p>
                    <p className={`text-lg font-semibold ${
                      previewData.totalGain >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(previewData.totalGain)} ({previewData.totalGainPercent.toFixed(2)}%)
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Unique Holdings: {previewData.stocks.length}</p>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <Button type="submit" disabled={formData.accountIds.length === 0}>
                {editingView ? 'Update' : 'Create'} View
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingView(null);
                  setPreviewData(null);
                  setFormData({ name: '', accountIds: [] });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Views List */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {views.map((view) => (
          <Card key={view.id}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{view.name}</h3>
                <p className="text-sm text-gray-500">
                  Created: {formatDate(view.createdAt)}
                </p>
                <p className="text-xs text-gray-400">
                  {view.accountIds.length} account{view.accountIds.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(view)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(view.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Portfolio Value</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(view.totalValue)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Total Gain/Loss</p>
                <p className={`text-lg font-semibold ${
                  view.totalGain >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(view.totalGain)} ({view.totalGainPercent.toFixed(2)}%)
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">
                Accounts ({view.accountIds.length})
              </p>
              <div className="space-y-1">
                {view.accountIds.map(accountId => {
                  const account = accounts.find(a => a.id === accountId);
                  return account ? (
                    <div key={accountId} className="text-xs text-gray-600">
                      {account.name} ({account.broker})
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-gray-900 mb-2">
                Holdings ({view.stocks.length})
              </p>
              {view.stocks.length > 0 ? (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {view.stocks.slice(0, 3).map((stock, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-gray-600">{stock.symbol}</span>
                      <span className={`font-medium ${
                        stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stock.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                  {view.stocks.length > 3 && (
                    <p className="text-xs text-gray-400">...and {view.stocks.length - 3} more</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No holdings data</p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {views.length === 0 && !loading && (
        <div className="text-center py-12">
          <EyeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No views</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create views to combine and analyze multiple accounts together.
          </p>
          <div className="mt-6">
            <Button onClick={() => setShowForm(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create View
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
