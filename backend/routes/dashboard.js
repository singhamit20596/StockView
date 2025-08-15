/**
 * Dashboard API Routes
 * Handles analytics and dashboard data for accounts and views
 */

const express = require('express');
const router = express.Router();
const database = require('../utils/database');
const PortfolioCalculator = require('../utils/portfolioCalculator');

/**
 * GET /api/dashboard/account/:accountId
 * Get analytics data for a specific account
 */
router.get('/account/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    
    console.log(`📊 Generating analytics for account: ${accountId}`);
    
    // Find account by ID
    const accounts = await database.read('accounts');
    const account = accounts.find(acc => acc.id === accountId);
    
    if (!account) {
      return res.status(404).json({ 
        success: false, 
        error: 'Account not found',
        accountId 
      });
    }

    // Get account stocks
    const accountStocks = account.stocks || [];
    
    if (accountStocks.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No holdings found for this account'
      });
    }
    
    // Calculate various analytics
    const sectorBreakdown = PortfolioCalculator.calculateSectorBreakdown(accountStocks);
    const subsectorBreakdown = PortfolioCalculator.calculateSubsectorBreakdown(accountStocks);
    const stockPercentages = PortfolioCalculator.calculateStockPercentages(accountStocks);
    const performanceMetrics = PortfolioCalculator.calculatePerformanceMetrics(accountStocks);
    const marketCapBreakdown = PortfolioCalculator.calculateMarketCapBreakdown(accountStocks);
    
    // Account summary
    const summary = PortfolioCalculator.calculateAccountSummary(accountStocks);
    
    // Top holdings (by current value)
    const topHoldings = stockPercentages.slice(0, 10);
    
    res.json({
      success: true,
      data: {
        accountId: account.id,
        accountName: account.name,
        summary,
        analytics: {
          sectorBreakdown,
          subsectorBreakdown,
          stockPercentages,
          topHoldings,
          performanceMetrics,
          marketCapBreakdown
        },
        metadata: {
          totalStocks: accountStocks.length,
          lastUpdated: Math.max(...accountStocks.map(s => new Date(s.updatedAt).getTime())),
          dataGeneratedAt: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error('Error generating account analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate analytics',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/view/:viewId
 * Get analytics data for a specific view
 */
router.get('/view/:viewId', async (req, res) => {
  try {
    const { viewId } = req.params;
    
    console.log(`📊 Generating analytics for view: ${viewId}`);
    
    // Find view by ID
    const views = await database.read('views');
    const view = views.find(v => v.id === viewId);
    
    if (!view) {
      return res.status(404).json({
        success: false,
        error: 'View not found'
      });
    }
    
    // Use the view's aggregated stocks
    const viewStocks = view.stocks || [];
    
    if (viewStocks.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No holdings found for this view'
      });
    }

    // Calculate analytics using the aggregated stocks
    const analytics = PortfolioCalculator.calculatePortfolioAnalytics(viewStocks);
    
    res.json({
      success: true,
      data: {
        viewId: view.id,
        viewName: view.name,
        ...analytics,
        accountIds: view.accountIds,
        metadata: {
          totalStocks: viewStocks.length,
          totalAccounts: view.accountIds.length,
          lastUpdated: view.createdAt,
          dataGeneratedAt: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error('Error generating view analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate analytics',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/overview
 * Get overall portfolio overview across all accounts
 */
router.get('/overview', async (req, res) => {
  try {
    console.log('📊 Generating portfolio overview...');
    
    const accounts = await database.read('accounts');
    const stocks = await database.read('stocks');
    const views = await database.read('views');
    
    // Calculate overall portfolio metrics
    const totalAccounts = accounts.length;
    const totalViews = [...new Set(views.map(v => v.ViewName))].length;
    const totalStocks = stocks.length;
    const uniqueStocks = [...new Set(stocks.map(s => s.StockName))].length;
    
    // Overall portfolio summary
    const overallSummary = accounts.reduce((acc, account) => {
      acc.totalInvested += account.InvestedValue || 0;
      acc.totalCurrent += account.CurrentValue || 0;
      acc.totalPnL += account.PnL || 0;
      return acc;
    }, { totalInvested: 0, totalCurrent: 0, totalPnL: 0 });
    
    overallSummary.totalPnLPercentage = overallSummary.totalInvested > 0 
      ? ((overallSummary.totalPnL / overallSummary.totalInvested) * 100) 
      : 0;
    
    // Round values
    Object.keys(overallSummary).forEach(key => {
      if (typeof overallSummary[key] === 'number') {
        overallSummary[key] = Number(overallSummary[key].toFixed(2));
      }
    });
    
    // Account performance
    const accountPerformance = accounts
      .map(account => ({
        accountName: account.AccountName,
        investedValue: account.InvestedValue || 0,
        currentValue: account.CurrentValue || 0,
        pnl: account.PnL || 0,
        pnlPercentage: account['PnL%'] || 0,
        updatedAt: account.updatedAt
      }))
      .sort((a, b) => b.currentValue - a.currentValue);
    
    // Overall sector breakdown across all stocks
    const overallSectorBreakdown = PortfolioCalculator.calculateSectorBreakdown(stocks);
    
    // Best and worst performing accounts
    const bestAccount = accounts.reduce((best, account) => 
      (account['PnL%'] || 0) > (best['PnL%'] || 0) ? account : best, accounts[0]);
    
    const worstAccount = accounts.reduce((worst, account) => 
      (account['PnL%'] || 0) < (worst['PnL%'] || 0) ? account : worst, accounts[0]);
    
    res.json({
      success: true,
      data: {
        overview: {
          totalAccounts,
          totalViews,
          totalStocks,
          uniqueStocks,
          overallSummary,
          bestPerformingAccount: bestAccount ? {
            name: bestAccount.AccountName,
            pnlPercentage: bestAccount['PnL%'] || 0
          } : null,
          worstPerformingAccount: worstAccount ? {
            name: worstAccount.AccountName,
            pnlPercentage: worstAccount['PnL%'] || 0
          } : null
        },
        accountPerformance,
        overallSectorBreakdown,
        metadata: {
          dataGeneratedAt: new Date().toISOString(),
          lastAccountUpdate: accounts.length > 0 
            ? Math.max(...accounts.map(a => new Date(a.updatedAt || 0).getTime()))
            : null
        }
      }
    });
    
  } catch (error) {
    console.error('Error generating overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate overview',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/comparison
 * Compare performance between accounts or views
 */
router.get('/comparison', async (req, res) => {
  try {
    const { type = 'accounts', entities } = req.query;
    
    if (!entities) {
      return res.status(400).json({
        success: false,
        error: 'Entities parameter is required (comma-separated list)'
      });
    }
    
    const entityList = entities.split(',').map(e => e.trim());
    
    console.log(`📊 Comparing ${type}: ${entityList.join(', ')}`);
    
    let comparisonData = [];
    
    if (type === 'accounts') {
      const accounts = await database.read('accounts');
      const stocks = await database.read('stocks');
      
      comparisonData = entityList.map(accountName => {
        const account = accounts.find(acc => acc.AccountName === accountName);
        const accountStocks = stocks.filter(stock => stock.AccountName === accountName);
        
        if (!account) {
          return {
            name: accountName,
            error: 'Account not found'
          };
        }
        
        const analytics = {
          sectorBreakdown: PortfolioCalculator.calculateSectorBreakdown(accountStocks),
          performanceMetrics: PortfolioCalculator.calculatePerformanceMetrics(accountStocks)
        };
        
        return {
          name: accountName,
          type: 'account',
          summary: {
            investedValue: account.InvestedValue || 0,
            currentValue: account.CurrentValue || 0,
            pnl: account.PnL || 0,
            pnlPercentage: account['PnL%'] || 0
          },
          stockCount: accountStocks.length,
          topSector: analytics.sectorBreakdown[0] || null,
          performance: analytics.performanceMetrics,
          updatedAt: account.updatedAt
        };
      });
      
    } else if (type === 'views') {
      const views = await database.read('views');
      
      comparisonData = entityList.map(viewName => {
        const viewRecords = views.filter(view => view.ViewName === viewName);
        
        if (viewRecords.length === 0) {
          return {
            name: viewName,
            error: 'View not found'
          };
        }
        
        const summary = PortfolioCalculator.calculateViewSummary(viewRecords);
        const accounts = [...new Set(viewRecords.map(r => r.AccountName))];
        
        return {
          name: viewName,
          type: 'view',
          summary: {
            investedValue: summary.totalInvestedValue,
            currentValue: summary.totalCurrentValue,
            pnl: summary.totalPnL,
            pnlPercentage: summary['totalPnL%']
          },
          stockCount: summary.totalStocks,
          accountCount: accounts.length,
          accounts,
          updatedAt: Math.max(...viewRecords.map(r => new Date(r.updatedAt).getTime()))
        };
      });
    }
    
    res.json({
      success: true,
      data: {
        type,
        comparison: comparisonData,
        metadata: {
          comparedEntities: entityList.length,
          dataGeneratedAt: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error('Error generating comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate comparison',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/trends
 * Get trend data (placeholder for future implementation with historical data)
 */
router.get('/trends', async (req, res) => {
  try {
    const { entity, entityType = 'account' } = req.query;
    
    if (!entity) {
      return res.status(400).json({
        success: false,
        error: 'Entity parameter is required'
      });
    }
    
    // For now, return placeholder trend data
    // In future, this would fetch historical data from database
    const trendData = {
      entity,
      entityType,
      trends: {
        valueOverTime: [], // Would contain historical value data
        pnlOverTime: [], // Would contain historical P&L data
        message: 'Trend data requires historical tracking. This will be implemented when historical data collection is added.'
      },
      metadata: {
        dataGeneratedAt: new Date().toISOString(),
        note: 'Trend analysis requires historical data collection to be implemented'
      }
    };
    
    res.json({
      success: true,
      data: trendData
    });
    
  } catch (error) {
    console.error('Error generating trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate trends',
      message: error.message
    });
  }
});

module.exports = router;
