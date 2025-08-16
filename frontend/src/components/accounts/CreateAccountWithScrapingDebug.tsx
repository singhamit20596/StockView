import React, { useState } from 'react';
import { Button, Card, LoadingSpinner } from '../UI';
import { scrapingAPI } from '../../services/api';
import { ScrapingSession } from '../../types';

interface CreateAccountWithScrapingDebugProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateAccountWithScrapingDebug: React.FC<CreateAccountWithScrapingDebugProps> = ({
  onClose,
  onSuccess,
}) => {
  const [session, setSession] = useState<ScrapingSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setDebugLogs(prev => [...prev, logMessage]);
  };

  const testScraping = async () => {
    try {
      setLoading(true);
      setError(null);
      addDebugLog('🚀 Starting test scraping session');

      // Step 1: Initiate scraping
      addDebugLog('📝 Step 1: Initiating scraping session');
      const response = await scrapingAPI.initiate('groww', 'Test Account Debug');
      const sessionData = response.data.data;
      setSession(sessionData);
      addDebugLog(`✅ Session created: ${sessionData.sessionId}`);
      addDebugLog(`📊 Initial status: ${sessionData.status}`);

      // Step 2: Start polling
      addDebugLog('🔄 Step 2: Starting status polling');
      pollSession(sessionData.sessionId);

    } catch (err: any) {
      addDebugLog(`❌ Error: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pollSession = (sessionId: string) => {
    addDebugLog(`🔄 Starting polling for session: ${sessionId}`);
    let pollCount = 0;

    const pollInterval = setInterval(async () => {
      pollCount++;
      addDebugLog(`📊 Poll #${pollCount} - Checking session status`);

      try {
        const response = await scrapingAPI.getSession(sessionId);
        const sessionData = response.data.data;
        setSession(sessionData);

        addDebugLog(`📈 Status: ${sessionData.status}`);
        addDebugLog(`💼 Holdings: ${sessionData.holdings?.length || 0}`);

        if (sessionData.status === 'logged_in') {
          addDebugLog('🔐 Login detected! Starting scraping...');
          clearInterval(pollInterval);
          startScraping(sessionId);
        } else if (sessionData.status === 'completed' || sessionData.status === 'scraping_completed') {
          addDebugLog(`🎉 Scraping completed! Found ${sessionData.holdings?.length || 0} holdings`);
          
          if (sessionData.holdings && sessionData.holdings.length > 0) {
            addDebugLog('📋 Holdings summary:');
            sessionData.holdings.slice(0, 5).forEach((holding, idx) => {
              addDebugLog(`  ${idx + 1}. ${holding.stockName}: ₹${holding.invested} → ₹${holding.current} (${holding['PnL%']}%)`);
            });
          }
          
          clearInterval(pollInterval);
          addDebugLog('✅ Test completed successfully!');
        } else if (sessionData.status === 'error') {
          addDebugLog(`❌ Error detected: ${sessionData.message || 'Unknown error'}`);
          clearInterval(pollInterval);
          setError(sessionData.message || 'Scraping failed');
        }

        // Stop polling after 90 attempts (270 seconds / 4.5 minutes)
        if (pollCount >= 90) {
          addDebugLog('⏰ Polling timeout reached after 4.5 minutes');
          clearInterval(pollInterval);
          setError('Polling timeout after 4.5 minutes');
        }

      } catch (err: any) {
        addDebugLog(`❌ Poll error: ${err.message}`);
        if (pollCount >= 20) { // Allow more poll errors with increased attempts
          clearInterval(pollInterval);
          setError('Too many polling errors');
        }
      }
    }, 3000); // Poll every 3 seconds
  };

  const startScraping = async (sessionId: string) => {
    try {
      addDebugLog('📊 Initiating scraping process...');
      const response = await scrapingAPI.scrapeData(sessionId);
      const sessionData = response.data.data;
      setSession(sessionData);
      addDebugLog(`🔍 Scraping response: ${sessionData.status}`);
    } catch (err: any) {
      addDebugLog(`❌ Scraping error: ${err.message}`);
      setError(`Scraping failed: ${err.message}`);
    }
  };

  const manualLoginCheck = async () => {
    if (!session) return;
    
    try {
      addDebugLog('🔍 Manual login check...');
      const response = await scrapingAPI.checkLogin(session.sessionId);
      const sessionData = response.data.data;
      setSession(sessionData);
      addDebugLog(`🔐 Login status: ${sessionData.status}`);
    } catch (err: any) {
      addDebugLog(`❌ Login check error: ${err.message}`);
    }
  };

  const manualScrape = async () => {
    if (!session) return;
    
    try {
      addDebugLog('📊 Manual scraping trigger...');
      const response = await scrapingAPI.scrapeData(session.sessionId);
      const sessionData = response.data.data;
      setSession(sessionData);
      addDebugLog(`🔍 Manual scrape result: ${sessionData.status}`);
      addDebugLog(`💼 Holdings found: ${sessionData.holdings?.length || 0}`);
    } catch (err: any) {
      addDebugLog(`❌ Manual scrape error: ${err.message}`);
    }
  };

  const clearLogs = () => {
    setDebugLogs([]);
  };

  return (
    <Card className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Scraping Debug Console</h2>
        <Button onClick={onClose} variant="secondary">Close</Button>
      </div>

      {/* Control Panel */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Debug Controls</h3>
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={testScraping} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? <LoadingSpinner size="sm" /> : '🚀'} Start Test Scraping
          </Button>
          
          {session && (
            <>
              <Button onClick={manualLoginCheck} variant="secondary">
                🔍 Check Login
              </Button>
              <Button onClick={manualScrape} variant="secondary">
                📊 Manual Scrape
              </Button>
            </>
          )}
          
          <Button onClick={clearLogs} variant="secondary">
            🗑️ Clear Logs
          </Button>
        </div>
      </div>

      {/* Session Info */}
      {session && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Session Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Session ID:</strong> {session.sessionId}</div>
            <div><strong>Status:</strong> <span className="font-mono">{session.status}</span></div>
            <div><strong>Account:</strong> {session.accountName}</div>
            <div><strong>Broker:</strong> {session.broker}</div>
            <div><strong>Holdings:</strong> {session.holdings?.length || 0}</div>
            <div><strong>Created:</strong> {new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Holdings Preview */}
      {session?.holdings && session.holdings.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Holdings Preview ({session.holdings.length} stocks)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Stock</th>
                  <th className="text-left p-2">Qty</th>
                  <th className="text-left p-2">Invested</th>
                  <th className="text-left p-2">Current</th>
                  <th className="text-left p-2">P&L</th>
                  <th className="text-left p-2">%</th>
                </tr>
              </thead>
              <tbody>
                {session.holdings.slice(0, 10).map((holding, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2 font-medium">{holding.stockName}</td>
                    <td className="p-2">{holding.qty}</td>
                    <td className="p-2">₹{holding.invested.toFixed(2)}</td>
                    <td className="p-2">₹{holding.current.toFixed(2)}</td>
                    <td className={`p-2 ${holding.PnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{holding.PnL.toFixed(2)}
                    </td>
                    <td className={`p-2 ${holding['PnL%'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {holding['PnL%'].toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Debug Logs */}
      <div className="p-4 bg-black rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Debug Console</h3>
          <span className="text-gray-400 text-sm">{debugLogs.length} logs</span>
        </div>
        <div className="h-96 overflow-y-auto bg-gray-900 p-4 rounded font-mono text-sm">
          {debugLogs.length === 0 ? (
            <div className="text-gray-500">No logs yet. Start a test to see debug output.</div>
          ) : (
            debugLogs.map((log, idx) => (
              <div key={idx} className="text-green-400 mb-1 leading-tight">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
};
