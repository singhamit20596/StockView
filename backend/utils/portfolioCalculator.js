/**
 * Portfolio Calculation Utilities
 * Handles portfolio calculations, aggregations, and view computations
 */

class PortfolioCalculator {
  /**
   * Calculate account summary from stocks
   * @param {Array} stocks - Array of stock holdings for an account
   * @returns {Object} Account summary with totals
   */
  static calculateAccountSummary(stocks) {
    if (!stocks || stocks.length === 0) {
      return {
        InvestedValue: 0,
        CurrentValue: 0,
        PnL: 0,
        'PnL%': 0,
        totalStocks: 0
      };
    }

    const summary = stocks.reduce((acc, stock) => {
      acc.InvestedValue += stock.invested || 0;
      acc.CurrentValue += stock.current || 0;
      acc.PnL += stock.PnL || 0;
      return acc;
    }, {
      InvestedValue: 0,
      CurrentValue: 0,
      PnL: 0
    });

    // Calculate overall P&L percentage
    summary['PnL%'] = summary.InvestedValue > 0 
      ? ((summary.PnL / summary.InvestedValue) * 100) 
      : 0;
    
    summary.totalStocks = stocks.length;

    // Round to 2 decimal places
    Object.keys(summary).forEach(key => {
      if (typeof summary[key] === 'number' && key !== 'totalStocks') {
        summary[key] = Number(summary[key].toFixed(2));
      }
    });

    return summary;
  }

  /**
   * Calculate combined holdings for view creation
   * @param {Array} accountStocks - Array of stocks grouped by account
   * @returns {Array} Combined and aggregated stock holdings
   */
  static calculateViewHoldings(accountStocks) {
    const stockMap = new Map();

    // Process each account's stocks
    accountStocks.forEach(({ accountName, stocks }) => {
      stocks.forEach(stock => {
        const stockKey = stock.stockName;
        
        if (stockMap.has(stockKey)) {
          // Aggregate existing stock
          const existing = stockMap.get(stockKey);
          
          // Combine quantities
          const totalQty = existing.qty + stock.qty;
          
          // Calculate weighted average price
          const totalInvested = existing.invested + stock.invested;
          const avgPrice = totalQty > 0 ? totalInvested / totalQty : 0;
          
          // Use the most recent market price (from account with latest update)
          const mktPrice = new Date(stock.updatedAt) > new Date(existing.updatedAt) 
            ? stock.mktValue 
            : existing.mktValue;
          
          // Calculate new values
          const currentValue = totalQty * mktPrice;
          const pnl = currentValue - totalInvested;
          const pnlPercentage = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
          
          stockMap.set(stockKey, {
            stockName: stock.stockName,
            avgPrice: avgPrice,
            mktPrice: mktPrice,
            invested: totalInvested,
            current: currentValue,
            PnL: pnl,
            'PnL%': pnlPercentage,
            qty: totalQty,
            sector: stock.sector,
            subsector: stock.subsector,
            updatedAt: stock.updatedAt > existing.updatedAt ? stock.updatedAt : existing.updatedAt,
            accounts: [...existing.accounts, accountName]
          });
        } else {
          // Add new stock
          stockMap.set(stockKey, {
            stockName: stock.stockName,
            avgPrice: stock.avgValue,
            mktPrice: stock.mktValue,
            invested: stock.invested,
            current: stock.current,
            PnL: stock.PnL,
            'PnL%': stock['PnL%'],
            qty: stock.qty,
            sector: stock.sector,
            subsector: stock.subsector,
            updatedAt: stock.updatedAt,
            accounts: [accountName]
          });
        }
      });
    });

    // Convert map to array and round values
    return Array.from(stockMap.values()).map(stock => ({
      ...stock,
      avgPrice: Number(stock.avgPrice.toFixed(2)),
      mktPrice: Number(stock.mktPrice.toFixed(2)),
      invested: Number(stock.invested.toFixed(2)),
      current: Number(stock.current.toFixed(2)),
      PnL: Number(stock.PnL.toFixed(2)),
      'PnL%': Number(stock['PnL%'].toFixed(2)),
      qty: Number(stock.qty)
    }));
  }

  /**
   * Calculate view summary from view holdings
   * @param {Array} viewHoldings - Array of aggregated view holdings
   * @returns {Object} View summary with totals
   */
  static calculateViewSummary(viewHoldings) {
    if (!viewHoldings || viewHoldings.length === 0) {
      return {
        totalInvestedValue: 0,
        totalCurrentValue: 0,
        totalQty: 0,
        totalPnL: 0,
        'totalPnL%': 0,
        totalStocks: 0
      };
    }

    const summary = viewHoldings.reduce((acc, holding) => {
      acc.totalInvestedValue += holding.invested || 0;
      acc.totalCurrentValue += holding.current || 0;
      acc.totalQty += holding.qty || 0;
      acc.totalPnL += holding.PnL || 0;
      return acc;
    }, {
      totalInvestedValue: 0,
      totalCurrentValue: 0,
      totalQty: 0,
      totalPnL: 0
    });

    // Calculate overall P&L percentage
    summary['totalPnL%'] = summary.totalInvestedValue > 0 
      ? ((summary.totalPnL / summary.totalInvestedValue) * 100) 
      : 0;
    
    summary.totalStocks = viewHoldings.length;

    // Round to 2 decimal places
    Object.keys(summary).forEach(key => {
      if (typeof summary[key] === 'number' && key !== 'totalQty' && key !== 'totalStocks') {
        summary[key] = Number(summary[key].toFixed(2));
      }
    });

    return summary;
  }

  /**
   * Calculate sector-wise breakdown for dashboard
   * @param {Array} holdings - Array of stock holdings
   * @returns {Array} Sector breakdown with percentages
   */
  static calculateSectorBreakdown(holdings) {
    if (!holdings || holdings.length === 0) return [];

    const sectorMap = new Map();
    let totalValue = 0;

    // Aggregate by sector
    holdings.forEach(holding => {
      const sector = holding.sector || 'Unknown';
      const currentValue = holding.current || 0;
      
      totalValue += currentValue;
      
      if (sectorMap.has(sector)) {
        sectorMap.set(sector, sectorMap.get(sector) + currentValue);
      } else {
        sectorMap.set(sector, currentValue);
      }
    });

    // Convert to array with percentages
    return Array.from(sectorMap.entries())
      .map(([sector, value]) => ({
        sector,
        value: Number(value.toFixed(2)),
        percentage: totalValue > 0 ? Number(((value / totalValue) * 100).toFixed(2)) : 0
      }))
      .sort((a, b) => b.value - a.value);
  }

  /**
   * Calculate subsector-wise breakdown for dashboard
   * @param {Array} holdings - Array of stock holdings
   * @returns {Array} Subsector breakdown with percentages
   */
  static calculateSubsectorBreakdown(holdings) {
    if (!holdings || holdings.length === 0) return [];

    const subsectorMap = new Map();
    let totalValue = 0;

    // Aggregate by subsector
    holdings.forEach(holding => {
      const subsector = holding.subsector || 'Unknown';
      const currentValue = holding.current || 0;
      
      totalValue += currentValue;
      
      if (subsectorMap.has(subsector)) {
        subsectorMap.set(subsector, subsectorMap.get(subsector) + currentValue);
      } else {
        subsectorMap.set(subsector, currentValue);
      }
    });

    // Convert to array with percentages
    return Array.from(subsectorMap.entries())
      .map(([subsector, value]) => ({
        subsector,
        value: Number(value.toFixed(2)),
        percentage: totalValue > 0 ? Number(((value / totalValue) * 100).toFixed(2)) : 0
      }))
      .sort((a, b) => b.value - a.value);
  }

  /**
   * Calculate individual stock percentage in portfolio
   * @param {Array} holdings - Array of stock holdings
   * @returns {Array} Holdings with individual percentages
   */
  static calculateStockPercentages(holdings) {
    if (!holdings || holdings.length === 0) return [];

    const totalValue = holdings.reduce((sum, holding) => sum + (holding.current || 0), 0);

    return holdings.map(holding => ({
      ...holding,
      portfolioPercentage: totalValue > 0 
        ? Number(((holding.current / totalValue) * 100).toFixed(2))
        : 0
    })).sort((a, b) => b.current - a.current);
  }

  /**
   * Calculate market cap breakdown (requires market cap data in holdings)
   * @param {Array} holdings - Array of stock holdings with market cap info
   * @returns {Array} Market cap breakdown
   */
  static calculateMarketCapBreakdown(holdings) {
    if (!holdings || holdings.length === 0) return [];

    const capMap = new Map([
      ['Large Cap', 0],
      ['Mid Cap', 0],
      ['Small Cap', 0],
      ['Unknown', 0]
    ]);
    
    let totalValue = 0;

    holdings.forEach(holding => {
      const currentValue = holding.current || 0;
      const marketCap = holding.marketCap || 'Unknown';
      
      totalValue += currentValue;
      capMap.set(marketCap, capMap.get(marketCap) + currentValue);
    });

    return Array.from(capMap.entries())
      .map(([cap, value]) => ({
        marketCap: cap,
        value: Number(value.toFixed(2)),
        percentage: totalValue > 0 ? Number(((value / totalValue) * 100).toFixed(2)) : 0
      }))
      .filter(item => item.value > 0);
  }

  /**
   * Calculate performance metrics
   * @param {Array} holdings - Array of stock holdings
   * @returns {Object} Performance metrics
   */
  static calculatePerformanceMetrics(holdings) {
    if (!holdings || holdings.length === 0) {
      return {
        bestPerformer: null,
        worstPerformer: null,
        averageReturn: 0,
        totalGainers: 0,
        totalLosers: 0
      };
    }

    const sortedByPnL = [...holdings].sort((a, b) => (b['PnL%'] || 0) - (a['PnL%'] || 0));
    
    const gainers = holdings.filter(h => (h.PnL || 0) > 0);
    const losers = holdings.filter(h => (h.PnL || 0) < 0);
    
    const totalInvested = holdings.reduce((sum, h) => sum + (h.invested || 0), 0);
    const totalCurrent = holdings.reduce((sum, h) => sum + (h.current || 0), 0);
    const averageReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

    return {
      bestPerformer: sortedByPnL[0] || null,
      worstPerformer: sortedByPnL[sortedByPnL.length - 1] || null,
      averageReturn: Number(averageReturn.toFixed(2)),
      totalGainers: gainers.length,
      totalLosers: losers.length,
      neutralStocks: holdings.length - gainers.length - losers.length
    };
  }
}

module.exports = PortfolioCalculator;
