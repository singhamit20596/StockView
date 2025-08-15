/**
 * Scraping Service Module
 * Handles web scraping for different brokers using Puppeteer
 */

const puppeteer = require('puppeteer');

class ScrapingService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.config = {
      headless: process.env.PUPPETEER_HEADLESS === 'true',
      timeout: parseInt(process.env.PUPPETEER_TIMEOUT) || 30000,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
  }

  /**
   * Initialize browser and page
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      if (!this.browser) {
        console.log('🚀 Launching browser for scraping...');
        this.browser = await puppeteer.launch(this.config);
        this.page = await this.browser.newPage();
        
        // Set viewport and user agent
        await this.page.setViewport({ width: 1366, height: 768 });
        await this.page.setUserAgent(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        
        // Set default navigation timeout
        this.page.setDefaultNavigationTimeout(this.config.timeout);
        
        console.log('✅ Browser initialized successfully');
      }
    } catch (error) {
      console.error('Browser initialization error:', error);
      throw error;
    }
  }

  /**
   * Navigate to Groww login page and wait for user authentication
   * @returns {Promise<boolean>} Success status
   */
  async initiateGrowwLogin() {
    try {
      await this.initialize();
      
      console.log('🔐 Navigating to Groww login page...');
      await this.page.goto(process.env.GROWW_LOGIN_URL, { 
        waitUntil: 'networkidle2' 
      });
      
      // Wait for the login form to load
      await this.page.waitForSelector('input[type="email"], input[type="text"]', { 
        timeout: 10000 
      });
      
      console.log('📋 Login page loaded. Please complete manual login...');
      
      // Wait for navigation after login (user will manually log in)
      // This will resolve when user successfully logs in and is redirected
      await this.page.waitForNavigation({ 
        waitUntil: 'networkidle2',
        timeout: 300000 // 5 minutes for user to login
      });
      
      console.log('✅ Login completed successfully');
      return true;
      
    } catch (error) {
      console.error('Groww login error:', error);
      throw error;
    }
  }

  /**
   * Navigate to holdings page and scrape stock data
   * @returns {Promise<Array>} Array of stock holdings
   */
  async scrapeGrowwHoldings() {
    try {
      if (!this.page) {
        throw new Error('Browser not initialized. Call initiateGrowwLogin first.');
      }
      
      console.log('📊 Navigating to holdings page...');
      await this.page.goto(process.env.GROWW_HOLDINGS_URL, { 
        waitUntil: 'networkidle2' 
      });
      
      // Wait for holdings table to load
      await this.page.waitForSelector('[data-testid="holding-card"], .holdings-row, .stock-holding', { 
        timeout: 15000 
      });
      
      console.log('📈 Holdings page loaded. Starting data extraction...');
      
      // Scroll to load all holdings
      await this.autoScroll();
      
      // Extract holdings data
      const holdings = await this.page.evaluate(() => {
        const stockData = [];
        
        // Multiple selectors to handle different UI layouts
        const holdingSelectors = [
          '[data-testid="holding-card"]',
          '.holdings-row',
          '.stock-holding',
          '.equity-holding-row'
        ];
        
        let holdingsElements = [];
        for (const selector of holdingSelectors) {
          holdingsElements = document.querySelectorAll(selector);
          if (holdingsElements.length > 0) break;
        }
        
        holdingsElements.forEach((element, index) => {
          try {
            // Extract stock name
            const nameSelectors = [
              '[data-testid="stock-name"]',
              '.stock-name',
              '.equity-name',
              'h3', 'h4'
            ];
            let stockName = '';
            for (const selector of nameSelectors) {
              const nameElement = element.querySelector(selector);
              if (nameElement) {
                stockName = nameElement.textContent.trim();
                break;
              }
            }
            
            // Extract values with fallback selectors
            const extractValue = (selectors, fallbackText = '0') => {
              for (const selector of selectors) {
                const element_val = element.querySelector(selector);
                if (element_val) {
                  return element_val.textContent.trim().replace(/[₹,]/g, '');
                }
              }
              return fallbackText;
            };
            
            // Current value selectors
            const currentSelectors = [
              '[data-testid="current-value"]',
              '.current-value',
              '.market-value',
              '.current-amt'
            ];
            
            // Invested value selectors
            const investedSelectors = [
              '[data-testid="invested-value"]',
              '.invested-value',
              '.invested-amt',
              '.cost-value'
            ];
            
            // P&L selectors
            const pnlSelectors = [
              '[data-testid="pnl-value"]',
              '.pnl-value',
              '.profit-loss',
              '.pnl-amt'
            ];
            
            // Quantity selectors
            const qtySelectors = [
              '[data-testid="quantity"]',
              '.quantity',
              '.qty',
              '.shares'
            ];
            
            // Average price selectors
            const avgPriceSelectors = [
              '[data-testid="avg-price"]',
              '.avg-price',
              '.average-price',
              '.cost-price'
            ];
            
            // Current price selectors
            const currentPriceSelectors = [
              '[data-testid="current-price"]',
              '.current-price',
              '.market-price',
              '.ltp'
            ];
            
            const currentValue = parseFloat(extractValue(currentSelectors)) || 0;
            const investedValue = parseFloat(extractValue(investedSelectors)) || 0;
            const pnlValue = parseFloat(extractValue(pnlSelectors)) || (currentValue - investedValue);
            const quantity = parseFloat(extractValue(qtySelectors)) || 0;
            const avgPrice = parseFloat(extractValue(avgPriceSelectors)) || (investedValue / quantity);
            const currentPrice = parseFloat(extractValue(currentPriceSelectors)) || (currentValue / quantity);
            
            // Calculate P&L percentage
            const pnlPercentage = investedValue > 0 ? ((pnlValue / investedValue) * 100) : 0;
            
            // Extract sector and subsector (may not be available on holdings page)
            const sector = extractValue(['.sector', '[data-testid="sector"]'], 'Unknown');
            const subsector = extractValue(['.subsector', '[data-testid="subsector"]'], 'Unknown');
            
            if (stockName && currentValue > 0) {
              stockData.push({
                stockName: stockName,
                avgValue: avgPrice,
                mktValue: currentPrice,
                invested: investedValue,
                current: currentValue,
                PnL: pnlValue,
                'PnL%': pnlPercentage,
                qty: quantity,
                sector: sector,
                subsector: subsector
              });
            }
          } catch (error) {
            console.error(`Error extracting data for holding ${index}:`, error);
          }
        });
        
        return stockData;
      });
      
      console.log(`✅ Successfully extracted ${holdings.length} holdings`);
      
      // Add some additional data processing
      const processedHoldings = holdings.map(holding => ({
        ...holding,
        avgValue: Number(holding.avgValue.toFixed(2)),
        mktValue: Number(holding.mktValue.toFixed(2)),
        invested: Number(holding.invested.toFixed(2)),
        current: Number(holding.current.toFixed(2)),
        PnL: Number(holding.PnL.toFixed(2)),
        'PnL%': Number(holding['PnL%'].toFixed(2)),
        qty: Number(holding.qty),
        scrapedAt: new Date().toISOString()
      }));
      
      return processedHoldings;
      
    } catch (error) {
      console.error('Holdings scraping error:', error);
      throw error;
    }
  }

  /**
   * Auto-scroll to load all holdings
   * @returns {Promise<void>}
   */
  async autoScroll() {
    try {
      await this.page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });
      
      // Wait a bit after scrolling
      await this.page.waitForTimeout(2000);
      
    } catch (error) {
      console.error('Auto-scroll error:', error);
    }
  }

  /**
   * Close browser instance
   * @returns {Promise<void>}
   */
  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        console.log('🔒 Browser closed successfully');
      }
    } catch (error) {
      console.error('Browser close error:', error);
    }
  }

  /**
   * Get current page screenshot for debugging
   * @param {string} filename - Screenshot filename
   * @returns {Promise<void>}
   */
  async takeScreenshot(filename = 'debug-screenshot.png') {
    try {
      if (this.page) {
        await this.page.screenshot({ 
          path: `./debug/${filename}`,
          fullPage: true 
        });
        console.log(`📸 Screenshot saved: ${filename}`);
      }
    } catch (error) {
      console.error('Screenshot error:', error);
    }
  }

  /**
   * Check if user is logged in to Groww
   * @returns {Promise<boolean>}
   */
  async isGrowwLoggedIn() {
    try {
      if (!this.page) return false;
      
      const currentUrl = this.page.url();
      
      // Check if we're on a logged-in page (not login page)
      const isNotLoginPage = !currentUrl.includes('/login');
      
      // Check for presence of user-specific elements
      const hasUserElements = await this.page.evaluate(() => {
        const userIndicators = [
          '[data-testid="user-profile"]',
          '.user-profile',
          '.header-user-menu',
          '.user-dropdown'
        ];
        
        return userIndicators.some(selector => 
          document.querySelector(selector) !== null
        );
      });
      
      return isNotLoginPage && hasUserElements;
      
    } catch (error) {
      console.error('Login check error:', error);
      return false;
    }
  }
}

module.exports = ScrapingService;
