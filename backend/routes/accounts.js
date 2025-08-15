/**
 * Accounts API Routes
 * Handles account management operations including CRUD and portfolio calculations
 */

const express = require('express');
const router = express.Router();
const database = require('../utils/database');
const PortfolioCalculator = require('../utils/portfolioCalculator');

/**
 * GET /api/accounts
 * Retrieve all accounts with portfolio summaries
 */
router.get('/', async (req, res) => {
  try {
    console.log('📊 Fetching all accounts...');
    
    const accounts = await database.read('accounts');
    const stocks = await database.read('stocks');
    
    // Calculate updated portfolio summaries for each account
    const accountsWithSummary = await Promise.all(
      accounts.map(async (account) => {
        const accountStocks = stocks.filter(stock => stock.AccountName === account.AccountName);
        const summary = PortfolioCalculator.calculateAccountSummary(accountStocks);
        
        return {
          ...account,
          ...summary,
          stockCount: accountStocks.length
        };
      })
    );
    
    res.json({
      success: true,
      data: accountsWithSummary,
      total: accountsWithSummary.length
    });
    
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch accounts',
      message: error.message
    });
  }
});

/**
 * GET /api/accounts/:accountName
 * Retrieve specific account with its holdings
 */
router.get('/:accountName', async (req, res) => {
  try {
    const { accountName } = req.params;
    console.log(`📊 Fetching account: ${accountName}`);
    
    const account = await database.findOne('accounts', acc => acc.AccountName === accountName);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    const accountStocks = await database.find('stocks', stock => stock.AccountName === accountName);
    const summary = PortfolioCalculator.calculateAccountSummary(accountStocks);
    
    res.json({
      success: true,
      data: {
        account: { ...account, ...summary },
        holdings: accountStocks,
        summary: summary
      }
    });
    
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch account',
      message: error.message
    });
  }
});

/**
 * POST /api/accounts/check-name
 * Check if account name is unique
 */
router.post('/check-name', async (req, res) => {
  try {
    const { accountName } = req.body;
    
    if (!accountName || accountName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Account name is required'
      });
    }
    
    const exists = await database.exists('accounts', acc => 
      acc.AccountName.toLowerCase() === accountName.toLowerCase().trim()
    );
    
    res.json({
      success: true,
      data: {
        isUnique: !exists,
        accountName: accountName.trim()
      }
    });
    
  } catch (error) {
    console.error('Error checking account name:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check account name',
      message: error.message
    });
  }
});

/**
 * POST /api/accounts
 * Create a new account with scraped holdings
 */
router.post('/', async (req, res) => {
  try {
    const { accountName, broker, holdings } = req.body;
    
    // Validation
    if (!accountName || !broker || !holdings || !Array.isArray(holdings)) {
      return res.status(400).json({
        success: false,
        error: 'Account name, broker, and holdings are required'
      });
    }
    
    // Check if account name already exists
    const existingAccount = await database.exists('accounts', acc => 
      acc.AccountName.toLowerCase() === accountName.toLowerCase().trim()
    );
    
    if (existingAccount) {
      return res.status(409).json({
        success: false,
        error: 'Account name already exists'
      });
    }
    
    console.log(`📊 Creating new account: ${accountName}`);
    
    // Calculate account summary from holdings
    const summary = PortfolioCalculator.calculateAccountSummary(holdings);
    
    // Create account record
    const accountData = {
      AccountName: accountName.trim(),
      broker: broker,
      InvestedValue: summary.InvestedValue,
      CurrentValue: summary.CurrentValue,
      PnL: summary.PnL,
      'PnL%': summary['PnL%'],
      stockCount: holdings.length,
      createdAt: new Date().toISOString()
    };
    
    const createdAccount = await database.insert('accounts', accountData);
    
    // Add stocks with account reference
    const stocksWithAccount = holdings.map(holding => ({
      AccountName: accountName.trim(),
      StockName: holding.stockName,
      avgValue: holding.avgValue,
      mktValue: holding.mktValue,
      invested: holding.invested,
      current: holding.current,
      PnL: holding.PnL,
      'PnL%': holding['PnL%'],
      qty: holding.qty,
      sector: holding.sector || 'Unknown',
      subsector: holding.subsector || 'Unknown',
      scrapedAt: holding.scrapedAt || new Date().toISOString()
    }));
    
    await database.bulkInsert('stocks', stocksWithAccount);
    
    console.log(`✅ Account created successfully: ${accountName} with ${holdings.length} holdings`);
    
    res.status(201).json({
      success: true,
      data: {
        account: createdAccount,
        holdings: stocksWithAccount,
        summary: summary
      },
      message: 'Account created successfully'
    });
    
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create account',
      message: error.message
    });
  }
});

/**
 * PUT /api/accounts/:accountName
 * Update account holdings (re-scrape)
 */
router.put('/:accountName', async (req, res) => {
  try {
    const { accountName } = req.params;
    const { holdings } = req.body;
    
    if (!holdings || !Array.isArray(holdings)) {
      return res.status(400).json({
        success: false,
        error: 'Holdings data is required'
      });
    }
    
    console.log(`📊 Updating account: ${accountName}`);
    
    // Check if account exists
    const existingAccount = await database.findOne('accounts', acc => acc.AccountName === accountName);
    
    if (!existingAccount) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    // Calculate new summary
    const summary = PortfolioCalculator.calculateAccountSummary(holdings);
    
    // Update account with new summary
    await database.update(
      'accounts',
      acc => acc.AccountName === accountName,
      {
        InvestedValue: summary.InvestedValue,
        CurrentValue: summary.CurrentValue,
        PnL: summary.PnL,
        'PnL%': summary['PnL%'],
        stockCount: holdings.length,
        lastUpdated: new Date().toISOString()
      }
    );
    
    // Delete existing stocks for this account
    await database.delete('stocks', stock => stock.AccountName === accountName);
    
    // Add updated stocks
    const stocksWithAccount = holdings.map(holding => ({
      AccountName: accountName,
      StockName: holding.stockName,
      avgValue: holding.avgValue,
      mktValue: holding.mktValue,
      invested: holding.invested,
      current: holding.current,
      PnL: holding.PnL,
      'PnL%': holding['PnL%'],
      qty: holding.qty,
      sector: holding.sector || 'Unknown',
      subsector: holding.subsector || 'Unknown',
      scrapedAt: holding.scrapedAt || new Date().toISOString()
    }));
    
    await database.bulkInsert('stocks', stocksWithAccount);
    
    console.log(`✅ Account updated successfully: ${accountName} with ${holdings.length} holdings`);
    
    res.json({
      success: true,
      data: {
        account: { ...existingAccount, ...summary },
        holdings: stocksWithAccount,
        summary: summary
      },
      message: 'Account updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update account',
      message: error.message
    });
  }
});

/**
 * DELETE /api/accounts/:accountName
 * Delete account and its holdings
 */
router.delete('/:accountName', async (req, res) => {
  try {
    const { accountName } = req.params;
    
    console.log(`🗑️ Deleting account: ${accountName}`);
    
    // Check if account exists
    const existingAccount = await database.findOne('accounts', acc => acc.AccountName === accountName);
    
    if (!existingAccount) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    // Delete account stocks first
    const deletedStocks = await database.delete('stocks', stock => stock.AccountName === accountName);
    
    // Delete account
    const deletedAccounts = await database.delete('accounts', acc => acc.AccountName === accountName);
    
    console.log(`✅ Account deleted: ${accountName} (${deletedStocks} stocks removed)`);
    
    res.json({
      success: true,
      data: {
        deletedAccount: existingAccount,
        deletedStocksCount: deletedStocks
      },
      message: 'Account deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account',
      message: error.message
    });
  }
});

/**
 * GET /api/accounts/:accountName/holdings
 * Get detailed holdings for an account
 */
router.get('/:accountName/holdings', async (req, res) => {
  try {
    const { accountName } = req.params;
    
    const accountStocks = await database.find('stocks', stock => stock.AccountName === accountName);
    
    if (accountStocks.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No holdings found for this account'
      });
    }
    
    // Add portfolio percentages
    const holdingsWithPercentage = PortfolioCalculator.calculateStockPercentages(accountStocks);
    
    res.json({
      success: true,
      data: holdingsWithPercentage,
      total: holdingsWithPercentage.length
    });
    
  } catch (error) {
    console.error('Error fetching account holdings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch account holdings',
      message: error.message
    });
  }
});

module.exports = router;
