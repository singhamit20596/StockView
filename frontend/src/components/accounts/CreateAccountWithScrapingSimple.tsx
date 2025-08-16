import React, { useState } from 'react';
import { Button, Card, LoadingSpinner } from '../UI';
import { scrapingAPI } from '../../services/api';
import { ScrapingSession } from '../../types';

interface CreateAccountWithScrapingSimpleProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateAccountWithScrapingSimple: React.FC<CreateAccountWithScrapingSimpleProps> = ({
  onClose,
  onSuccess,
}) => {
  const [session, setSession] = useState<ScrapingSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'scraping' | 'completed' | 'error'>('form');
  const [formData, setFormData] = useState({
    name: '',
    broker: 'groww',
  });

  const handleStartScraping = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Account name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setStep('scraping');

      console.log('🚀 Starting scraping session for account:', formData.name);
      
      // Initiate scraping session
      const response = await scrapingAPI.initiate(formData.broker, formData.name);
      const sessionData = response.data.data;
      setSession(sessionData);

      console.log('✅ Scraping session created:', sessionData);
      
      // Start polling for completion
      pollSession(sessionData.sessionId);
      
    } catch (err: any) {
      console.error('❌ Failed to start scraping:', err);
      setError(err.response?.data?.error || 'Failed to start scraping session');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const pollSession = (sessionId: string) => {
    console.log('� [DEBUG] Starting polling for session:', sessionId);
    let pollCount = 0;

    const pollInterval = setInterval(async () => {
      pollCount++;
      console.log(`� [DEBUG] Poll #${pollCount} for session:`, sessionId);

      try {
        const response = await scrapingAPI.getSession(sessionId);
        const sessionData = response.data.data;
        setSession(sessionData);

        console.log('🔍 [DEBUG] Session status:', sessionData.status);
        console.log('🔍 [DEBUG] Full session data:', sessionData);

        // Add debugger breakpoint for inspection
        debugger;

        if (sessionData.status === 'completed' || sessionData.status === 'scraping_completed') {
          console.log('🎉 [DEBUG] Scraping completed!');
          clearInterval(pollInterval);
          setStep('completed');
          onSuccess();
        } else if (sessionData.status === 'error') {
          console.error('❌ [DEBUG] Scraping error:', sessionData.message);
          clearInterval(pollInterval);
          setError(sessionData.message || 'Scraping failed');
          setStep('error');
        } else if (sessionData.status === 'logged_in') {
          console.log('✅ [DEBUG] Login detected, starting scraping...');
          debugger; // Debug breakpoint for scraping start
          try {
            const scrapeResponse = await scrapingAPI.scrapeData(sessionId);
            console.log('🔍 [DEBUG] Scrape data response:', scrapeResponse);
          } catch (err) {
            console.error('❌ [DEBUG] Failed to start scraping:', err);
            debugger; // Debug breakpoint for scraping errors
          }
        }

        // Stop after 90 attempts (270 seconds / 4.5 minutes with 3-second intervals)
        if (pollCount >= 90) {
          clearInterval(pollInterval);
          setError('Polling timeout after 4.5 minutes - please try again');
          setStep('error');
        }

      } catch (err: any) {
        console.error('Poll error:', err);
        if (pollCount >= 20) { // Allow more poll errors with increased attempts
          clearInterval(pollInterval);
          setError('Too many polling errors');
          setStep('error');
        }
      }
    }, 3000); // Poll every 3 seconds
  };

  if (step === 'form') {
    return (
      <Card className="max-w-md mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
          <p className="mt-2 text-gray-600">Import your portfolio data from Groww</p>
        </div>

        <form onSubmit={handleStartScraping} className="space-y-4">
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
              placeholder="e.g., My Primary Account"
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
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex space-x-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Starting...' : 'Create Account with Data Import'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  if (step === 'scraping') {
    return (
      <Card className="max-w-md mx-auto">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Importing Your Portfolio Data</h3>
          <p className="mt-2 text-gray-600">
            {session?.status === 'login_ready' && 'Please login to Groww in the browser window that opened.'}
            {session?.status === 'awaiting_login' && 'Waiting for you to complete login...'}
            {session?.status === 'logged_in' && 'Login successful! Starting data import...'}
            {session?.status === 'scraping' && 'Importing your holdings data...'}
            {!session?.status && 'Initializing...'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Status: {session?.status || 'Initializing...'}
          </p>
        </div>

        {session?.holdings && session.holdings.length > 0 && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-700">
              ✅ Found {session.holdings.length} holdings!
            </p>
          </div>
        )}
      </Card>
    );
  }

  if (step === 'completed') {
    return (
      <Card className="max-w-md mx-auto">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            ✅
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Account Created Successfully!</h3>
          <p className="mt-2 text-gray-600">
            Your account "{formData.name}" has been created with imported portfolio data.
          </p>
          {session?.holdings && (
            <p className="text-sm text-gray-500 mt-1">
              {session.holdings.length} holdings imported from Groww
            </p>
          )}
          <div className="mt-6">
            <Button onClick={onSuccess}>
              View Accounts
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">Import Failed</h3>
        <p className="mt-2 text-gray-600">{error}</p>
        <div className="flex space-x-3 justify-center mt-4">
          <Button onClick={() => { setStep('form'); setError(null); }}>
            Try Again
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
};
