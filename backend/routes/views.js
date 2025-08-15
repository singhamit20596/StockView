/**
 * Views API Routes
 * Handles view management operations including creation, aggregation, and calculations
 */

const express = require('express');
const router = express.Router();
const database = require('../utils/database');
const PortfolioCalculator = require('../utils/portfolioCalculator');

/**
 * GET /api/views
 * Retrieve all views with summaries
 */
router.get('/', async (req, res) => {
  try {
    console.log('📊 Fetching all views...');
    
    const views = await database.read('views');
    const accounts = await database.read('accounts');
    
    // Group views by ViewName and calculate summaries
    const viewMap = new Map();
    
    views.forEach(viewRecord => {
      const viewName = viewRecord.ViewName;
      if (!viewMap.has(viewName)) {
        viewMap.set(viewName, {
          viewName,
          accounts: new Set(),
          holdings: [],
          updatedAt: viewRecord.updatedAt
        });
      }
      
      const view = viewMap.get(viewName);
      view.accounts.add(viewRecord.AccountName);
      view.holdings.push(viewRecord);
      
      // Update timestamp to latest
      if (new Date(viewRecord.updatedAt) > new Date(view.updatedAt)) {
        view.updatedAt = viewRecord.updatedAt;
      }
    });
    
    // Convert to array and calculate summaries
    const viewsWithSummary = Array.from(viewMap.values()).map(view => {
      const summary = PortfolioCalculator.calculateViewSummary(view.holdings);
      
      // Get account summaries for the view
      const viewAccounts = Array.from(view.accounts);
      const accountSummaries = accounts
        .filter(acc => viewAccounts.includes(acc.AccountName))
        .map(acc => ({
          accountName: acc.AccountName,
          investedValue: acc.InvestedValue || 0,
          currentValue: acc.CurrentValue || 0,
          pnl: acc.PnL || 0,
          pnlPercentage: acc['PnL%'] || 0,
          updatedAt: acc.updatedAt
        }));
      
      return {
        viewName: view.viewName,
        accounts: viewAccounts,
        accountCount: viewAccounts.length,
        stockCount: view.holdings.length,
        viewSummary: summary,
        accountSummaries,
        updatedAt: view.updatedAt,
        createdAt: view.holdings[0]?.createdAt || view.updatedAt
      };
    });
    
    res.json({
      success: true,
      data: viewsWithSummary,
      total: viewsWithSummary.length
    });
    
  } catch (error) {
    console.error('Error fetching views:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch views',
      message: error.message
    });
  }
});

/**
 * GET /api/views/:viewName
 * Retrieve specific view with detailed holdings
 */
router.get('/:viewName', async (req, res) => {
  try {
    const { viewName } = req.params;
    console.log(`📊 Fetching view: ${viewName}`);
    
    const viewRecords = await database.find('views', view => view.ViewName === viewName);
    
    if (viewRecords.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'View not found'
      });
    }
    
    const accounts = [...new Set(viewRecords.map(record => record.AccountName))];
    const summary = PortfolioCalculator.calculateViewSummary(viewRecords);
    const holdingsWithPercentage = PortfolioCalculator.calculateStockPercentages(viewRecords);
    
    res.json({
      success: true,
      data: {
        viewName,
        accounts,
        holdings: holdingsWithPercentage,
        summary,
        accountCount: accounts.length,
        stockCount: viewRecords.length,
        updatedAt: Math.max(...viewRecords.map(r => new Date(r.updatedAt).getTime()))
      }
    });
    
  } catch (error) {
    console.error('Error fetching view:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch view',
      message: error.message
    });
  }
});

/**
 * POST /api/views/check-name
 * Check if view name is unique
 */
router.post('/check-name', async (req, res) => {
  try {
    const { viewName } = req.body;
    
    if (!viewName || viewName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'View name is required'
      });
    }
    
    const exists = await database.exists('views', view => 
      view.ViewName.toLowerCase() === viewName.toLowerCase().trim()
    );
    
    res.json({
      success: true,
      data: {
        isUnique: !exists,
        viewName: viewName.trim()
      }
    });
    
  } catch (error) {
    console.error('Error checking view name:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check view name',
      message: error.message
    });
  }
});

/**
 * POST /api/views/preview
 * Preview combined holdings for selected accounts (before creating view)
 */
router.post('/preview', async (req, res) => {
  try {
    const { accountNames } = req.body;
    
    if (!accountNames || !Array.isArray(accountNames) || accountNames.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Account names array is required'
      });
    }
    
    console.log(`📊 Previewing view for accounts: ${accountNames.join(', ')}`);
    
    // Get all stocks for selected accounts
    const allStocks = await database.read('stocks');
    const accountStocks = accountNames.map(accountName => ({
      accountName,
      stocks: allStocks.filter(stock => stock.AccountName === accountName)
    }));
    
    // Validate all accounts exist and have stocks
    const missingAccounts = accountStocks
      .filter(acc => acc.stocks.length === 0)
      .map(acc => acc.accountName);
    
    if (missingAccounts.length > 0) {
      return res.status(400).json({
        success: false,
        error: `No stocks found for accounts: ${missingAccounts.join(', ')}`
      });
    }
    
    // Calculate combined holdings
    const combinedHoldings = PortfolioCalculator.calculateViewHoldings(accountStocks);
    const summary = PortfolioCalculator.calculateViewSummary(combinedHoldings);
    const holdingsWithPercentage = PortfolioCalculator.calculateStockPercentages(combinedHoldings);
    
    res.json({
      success: true,
      data: {
        accounts: accountNames,
        holdings: holdingsWithPercentage,
        summary,
        accountCount: accountNames.length,
        stockCount: combinedHoldings.length
      }
    });
    
  } catch (error) {
    console.error('Error previewing view:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview view',
      message: error.message
    });
  }
});

/**
 * POST /api/views
 * Create a new view with combined holdings
 */
router.post('/', async (req, res) => {
  try {
    const { viewName, accountNames } = req.body;
    
    // Validation
    if (!viewName || !accountNames || !Array.isArray(accountNames) || accountNames.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'View name and account names are required'
      });
    }
    
    // Check if view name already exists
    const existingView = await database.exists('views', view => 
      view.ViewName.toLowerCase() === viewName.toLowerCase().trim()
    );
    
    if (existingView) {
      return res.status(409).json({
        success: false,
        error: 'View name already exists'
      });
    }
    
    console.log(`📊 Creating new view: ${viewName} for accounts: ${accountNames.join(', ')}`);
    
    // Get all stocks for selected accounts
    const allStocks = await database.read('stocks');
    const accountStocks = accountNames.map(accountName => ({
      accountName,
      stocks: allStocks.filter(stock => stock.AccountName === accountName)
    }));
    
    // Validate all accounts exist and have stocks
    const missingAccounts = accountStocks
      .filter(acc => acc.stocks.length === 0)
      .map(acc => acc.accountName);
    
    if (missingAccounts.length > 0) {
      return res.status(400).json({
        success: false,
        error: `No stocks found for accounts: ${missingAccounts.join(', ')}`
      });
    }
    
    // Calculate combined holdings
    const combinedHoldings = PortfolioCalculator.calculateViewHoldings(accountStocks);
    const summary = PortfolioCalculator.calculateViewSummary(combinedHoldings);
    
    // Create view records in database
    const viewRecords = [];
    const currentTimestamp = new Date().toISOString();
    
    for (const holding of combinedHoldings) {
      for (const accountName of holding.accounts) {
        const viewRecord = {
          ViewName: viewName.trim(),
          AccountName: accountName,
          StockName: holding.stockName,
          avgPrice: holding.avgPrice,
          mktPrice: holding.mktPrice,
          investedValue: holding.invested,
          currentValue: holding.current,
          PnL: holding.PnL,
          'PnL%': holding['PnL%'],
          qty: holding.qty,
          sector: holding.sector,
          subsector: holding.subsector,
          viewSummary: summary,
          createdAt: currentTimestamp
        };
        viewRecords.push(viewRecord);
      }
    }
    
    // Insert all view records
    await database.bulkInsert('views', viewRecords);
    
    console.log(`✅ View created successfully: ${viewName} with ${combinedHoldings.length} unique holdings`);
    
    res.status(201).json({
      success: true,
      data: {
        viewName: viewName.trim(),
        accounts: accountNames,
        holdings: combinedHoldings,
        summary,
        accountCount: accountNames.length,
        stockCount: combinedHoldings.length,
        createdAt: currentTimestamp
      },
      message: 'View created successfully'
    });
    
  } catch (error) {
    console.error('Error creating view:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create view',
      message: error.message
    });
  }
});

/**
 * DELETE /api/views/:viewName
 * Delete a view (keeps accounts and stocks intact)
 */
router.delete('/:viewName', async (req, res) => {
  try {
    const { viewName } = req.params;
    
    console.log(`🗑️ Deleting view: ${viewName}`);
    
    // Check if view exists
    const existingView = await database.findOne('views', view => view.ViewName === viewName);
    
    if (!existingView) {
      return res.status(404).json({
        success: false,
        error: 'View not found'
      });
    }
    
    // Delete all records for this view
    const deletedCount = await database.delete('views', view => view.ViewName === viewName);
    
    console.log(`✅ View deleted: ${viewName} (${deletedCount} records removed)`);
    
    res.json({
      success: true,
      data: {
        deletedView: viewName,
        deletedRecordsCount: deletedCount
      },
      message: 'View deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting view:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete view',
      message: error.message
    });
  }
});

/**
 * GET /api/views/:viewName/holdings
 * Get detailed holdings for a view with individual stock breakdowns
 */
router.get('/:viewName/holdings', async (req, res) => {
  try {
    const { viewName } = req.params;
    
    const viewRecords = await database.find('views', view => view.ViewName === viewName);
    
    if (viewRecords.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No holdings found for this view'
      });
    }
    
    // Group by stock and aggregate
    const stockMap = new Map();
    
    viewRecords.forEach(record => {
      const stockKey = record.StockName;
      if (stockMap.has(stockKey)) {
        const existing = stockMap.get(stockKey);
        existing.accounts.push(record.AccountName);
        existing.totalQty += record.qty;
        existing.totalInvested += record.investedValue;
        existing.totalCurrent += record.currentValue;
      } else {
        stockMap.set(stockKey, {
          stockName: record.StockName,
          avgPrice: record.avgPrice,
          mktPrice: record.mktPrice,
          sector: record.sector,
          subsector: record.subsector,
          accounts: [record.AccountName],
          totalQty: record.qty,
          totalInvested: record.investedValue,
          totalCurrent: record.currentValue,
          updatedAt: record.updatedAt
        });
      }
    });
    
    // Calculate aggregated values and add portfolio percentages
    const aggregatedHoldings = Array.from(stockMap.values()).map(stock => ({
      ...stock,
      PnL: stock.totalCurrent - stock.totalInvested,
      'PnL%': stock.totalInvested > 0 ? ((stock.totalCurrent - stock.totalInvested) / stock.totalInvested) * 100 : 0,
      accountCount: stock.accounts.length
    }));
    
    const holdingsWithPercentage = PortfolioCalculator.calculateStockPercentages(
      aggregatedHoldings.map(h => ({ ...h, current: h.totalCurrent }))
    );
    
    res.json({
      success: true,
      data: holdingsWithPercentage,
      total: holdingsWithPercentage.length
    });
    
  } catch (error) {
    console.error('Error fetching view holdings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch view holdings',
      message: error.message
    });
  }
});

module.exports = router;
