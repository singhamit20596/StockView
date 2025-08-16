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
   * Navigate to holdings page after login
   * @returns {Promise<boolean>}
   */
  async navigateToHoldings() {
    try {
      if (!this.page) {
        throw new Error('Browser not initialized');
      }
      
      console.log('📊 [NAVIGATE] Navigating to holdings page...');
      
      // Primary URL from environment variable
      const primaryHoldingsUrl = process.env.GROWW_HOLDINGS_URL || 'https://groww.in/stocks/user/holdings';
      
      // Try multiple possible holdings URLs for Groww in order of preference
      const holdingsUrls = [
        'https://groww.in/stocks/user/holdings',  // Correct URL first
        primaryHoldingsUrl,
        'https://groww.in/portfolio/holdings',
        'https://groww.in/user/portfolio',
        'https://groww.in/dashboard/holdings'
      ].filter((url, index, array) => array.indexOf(url) === index); // Remove duplicates
      
      for (const url of holdingsUrls) {
        try {
          console.log('📊 [NAVIGATE] Trying URL:', url);
          await this.page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 10000 
          });
          
          // Check if we landed on a valid holdings page
          const hasHoldingsContent = await this.page.evaluate(() => {
            const bodyText = document.body.innerText.toLowerCase();
            return bodyText.includes('holdings') || 
                   bodyText.includes('portfolio') || 
                   bodyText.includes('stocks');
          });
          
          if (hasHoldingsContent) {
            console.log('✅ [NAVIGATE] Successfully navigated to holdings page:', url);
            return true;
          }
        } catch (err) {
          console.log('❌ [NAVIGATE] Failed to navigate to:', url, err.message);
          continue;
        }
      }
      
      console.log('❌ [NAVIGATE] Could not navigate to any holdings page');
      return false;
      
    } catch (error) {
      console.error('❌ [NAVIGATE] Navigation error:', error);
      return false;
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
      
      console.log('📊 [SCRAPING] Starting holdings scraping process...');
      
      // First, navigate to holdings page
      const navigated = await this.navigateToHoldings();
      if (!navigated) {
        throw new Error('Could not navigate to holdings page');
      }
      
      console.log('📊 [SCRAPING] Waiting for holdings data to load...');
      
      // Advanced wait strategy - wait for actual content, not just selectors
      console.log('🔄 [LOADING] Waiting for page to fully load and stabilize...');
      
      // Wait for network to be idle and page to stabilize
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Enhanced diagnostic check
      await this.performDiagnosticCheck();
      
      // Check if page has any financial content
      const hasFinancialContent = await this.page.evaluate(() => {
        const bodyText = document.body.innerText;
        const hasRupeeSymbol = bodyText.includes('₹');
        const hasPercentage = bodyText.includes('%');
        const hasStockTerms = /holdings|portfolio|stocks|equity|shares/i.test(bodyText);
        
        console.log('🔍 [CONTENT CHECK] Financial indicators:', {
          hasRupeeSymbol,
          hasPercentage,
          hasStockTerms,
          bodyLength: bodyText.length
        });
        
        return hasRupeeSymbol && hasStockTerms;
      });
      
      if (!hasFinancialContent) {
        console.log('⚠️ [LOADING] No financial content detected. Taking screenshot for debugging...');
        await this.takeScreenshot('no-financial-content.png');
        
        // Try refreshing the page once
        console.log('🔄 [LOADING] Refreshing page to reload content...');
        await this.page.reload({ waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      console.log('📈 Holdings page loaded. Starting advanced data extraction...');
      
      // First, let's debug what's actually on the page
      const pageInfo = await this.page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          bodyText: document.body.innerText.substring(0, 1000),
          elementCount: document.querySelectorAll('*').length,
          divCount: document.querySelectorAll('div').length,
          tableCount: document.querySelectorAll('table').length,
          hasRupeeSymbol: document.body.innerText.includes('₹'),
          hasPercentage: document.body.innerText.includes('%')
        };
      });
      
      console.log('📊 [DEBUG] Page info:', JSON.stringify(pageInfo, null, 2));
      
      // Take screenshot for debugging
      await this.takeScreenshot('holdings-page-before-scroll.png');
      
      // Scroll to load all holdings
      await this.autoScroll();
      
      // Take another screenshot after scrolling
      await this.takeScreenshot('holdings-page-after-scroll.png');
      
      // Extract holdings data with advanced content-based algorithm
      const holdings = await this.page.evaluate(() => {
        const stockData = [];
        
        console.log('🔍 [ADVANCED EXTRACT] Starting intelligent content-based extraction...');
        console.log('🔍 [DEBUGGER] ='.repeat(80));
        console.log('🔍 [DEBUGGER] STEP 1: INITIAL PAGE ANALYSIS');
        console.log('🔍 [DEBUGGER] ='.repeat(80));
        
        // Get all text content from the page
        const pageText = document.body.innerText;
        console.log('🔍 [DEBUGGER] Page text length:', pageText.length);
        console.log('🔍 [DEBUGGER] Page sample (first 1000 chars):', pageText.substring(0, 1000));
        console.log('🔍 [DEBUGGER] Page contains ₹ symbol:', pageText.includes('₹') ? 'YES' : 'NO');
        console.log('🔍 [DEBUGGER] Page contains % symbol:', pageText.includes('%') ? 'YES' : 'NO');
        
        // Debug: Check for common stock-related keywords
        const stockKeywords = ['holdings', 'portfolio', 'stocks', 'equity', 'shares', 'investment'];
        const foundKeywords = stockKeywords.filter(keyword => 
          pageText.toLowerCase().includes(keyword.toLowerCase())
        );
        console.log('🔍 [DEBUGGER] Stock keywords found:', foundKeywords);
        
        // Debug: Look for number patterns
        const numberPatterns = pageText.match(/\d+/g) || [];
        console.log('🔍 [DEBUGGER] Total numbers found:', numberPatterns.length);
        console.log('🔍 [DEBUGGER] Sample numbers:', numberPatterns.slice(0, 20));
        
        // Advanced Strategy 1: Find all elements containing rupee symbols
        const allElements = document.querySelectorAll('*');
        const financialElements = [];
        
        console.log('🔍 [DEBUGGER] ='.repeat(80));
        console.log('🔍 [DEBUGGER] STEP 2: ELEMENT SCANNING');
        console.log('🔍 [DEBUGGER] ='.repeat(80));
        console.log('🔍 [DEBUGGER] Total elements to scan:', allElements.length);
        
        // Advanced multi-strategy approach for complete extraction
        let scannedElements = 0;
        let financialElementsFound = 0;
        
        allElements.forEach((element, index) => {
          scannedElements++;
          
          if (scannedElements % 1000 === 0) {
            console.log(`🔍 [DEBUGGER] Scanned ${scannedElements}/${allElements.length} elements...`);
          }
          
          const text = element.innerText || element.textContent || '';
          
          // Skip empty or very small elements
          if (text.length < 10) return;
          
          // Skip if element is too nested (likely not a data container)
          if (element.children.length > 15) return;
          
          // Look for financial patterns with enhanced detection
          const hasRupee = text.includes('₹');
          const hasPercentage = text.includes('%');
          const hasNumbers = /\d+/.test(text);
          const isContainer = element.children.length > 0 && element.children.length <= 10;
          
          // Enhanced stock name detection patterns
          const hasCompanyName = /[A-Z][A-Z\s&]{2,}/.test(text) || 
                                 /\b[A-Z]{2,}\b/.test(text) ||
                                 /Limited|Ltd|Corporation|Corp|Inc/i.test(text);
          
          // Financial score calculation with enhanced criteria
          let financialScore = 0;
          if (hasRupee) financialScore += 4; // Higher weight for rupee
          if (hasPercentage) financialScore += 3;
          if (hasNumbers) financialScore += 2;
          if (hasCompanyName) financialScore += 3;
          if (isContainer) financialScore += 1;
          
          // Look for quantity indicators
          const hasQuantity = /qty|quantity|shares/i.test(text);
          if (hasQuantity) financialScore += 2;
          
          // Look for price indicators
          const hasPriceTerms = /price|value|amount|ltp|avg/i.test(text);
          if (hasPriceTerms) financialScore += 2;
          
          // Avoid header/navigation elements but don't penalize too much
          const isNavigational = /holdings|portfolio|dashboard|menu|header|nav/i.test(element.className) ||
                                 /holdings|portfolio|dashboard|menu|header|nav/i.test(element.id);
          if (isNavigational && !hasRupee) financialScore -= 1;
          
          // Boost score for table rows or list items
          const isDataRow = /tr|li|row|item/i.test(element.tagName) || 
                           /row|item|entry/i.test(element.className);
          if (isDataRow && hasRupee) financialScore += 2;
          
          if (financialScore >= 5 && text.length < 1000) {
            financialElementsFound++;
            
            if (financialElementsFound <= 10) { // Debug first 10 candidates
              console.log(`🔍 [DEBUGGER] Financial element ${financialElementsFound}:`, {
                score: financialScore,
                tag: element.tagName,
                className: element.className.substring(0, 50),
                textSample: text.substring(0, 150),
                hasRupee,
                hasPercentage,
                hasCompanyName,
                textLength: text.length
              });
            }
            
            financialElements.push({
              element,
              text: text.trim(),
              score: financialScore,
              className: element.className,
              tagName: element.tagName,
              hasRupee,
              hasPercentage,
              hasCompanyName
            });
          }
        });
        
        console.log('🔍 [DEBUGGER] Element scanning complete:');
        console.log(`🔍 [DEBUGGER] - Total elements scanned: ${scannedElements}`);
        console.log(`🔍 [DEBUGGER] - Financial elements found: ${financialElementsFound}`);
        console.log(`🔍 [DEBUGGER] - Elements with score >= 5: ${financialElements.length}`);
        
        // Sort by score and take top candidates
        financialElements.sort((a, b) => b.score - a.score);
        const topElements = financialElements.slice(0, 50); // Increased to top 50 candidates
        
        console.log('🔍 [DEBUGGER] ='.repeat(80));
        console.log('🔍 [DEBUGGER] STEP 3: TOP CANDIDATES ANALYSIS');
        console.log('🔍 [DEBUGGER] ='.repeat(80));
        console.log('🔍 [DEBUGGER] Top 10 financial elements by score:');
        
        topElements.slice(0, 10).forEach((el, idx) => {
          console.log(`🔍 [DEBUGGER] #${idx + 1} Score: ${el.score}, Tag: ${el.tagName}, Text: "${el.text.substring(0, 100)}..."`);
        });
        
        // Advanced Strategy 2: Smart grouping and extraction with enhanced debugging
        console.log('🔍 [DEBUGGER] ='.repeat(80));
        console.log('🔍 [DEBUGGER] STEP 4: DATA EXTRACTION & PROCESSING');
        console.log('🔍 [DEBUGGER] ='.repeat(80));
        
        const processedStocks = new Set();
        let processingAttempts = 0;
        let successfulExtractions = 0;
        
        topElements.forEach((item, index) => {
          try {
            processingAttempts++;
            const { element, text, score } = item;
            
            console.log(`🔍 [DEBUGGER] Processing candidate ${index + 1}/${topElements.length}`);
            console.log(`🔍 [DEBUGGER] Score: ${score}, Text length: ${text.length}`);
            console.log(`🔍 [DEBUGGER] Raw text: "${text.substring(0, 200)}..."`);
            
            // Split text into lines for better analysis
            const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            console.log(`🔍 [DEBUGGER] Split into ${lines.length} lines:`, lines.slice(0, 10));
            
            // Enhanced stock name extraction with multiple patterns
            let stockName = '';
            const stockNamePatterns = [
              // Pattern 1: All caps company names
              /^[A-Z][A-Z0-9\s&]{2,40}$/,
              // Pattern 2: Title case company names
              /^[A-Z][a-zA-Z0-9\s&]{2,40}$/,
              // Pattern 3: Mixed case with Ltd, Limited, Corp
              /^[A-Za-z][A-Za-z0-9\s&]*(Limited|Ltd|Corporation|Corp|Inc)/i,
              // Pattern 4: Stock ticker symbols
              /^[A-Z]{2,10}$/
            ];
            
            // Try each pattern
            for (const pattern of stockNamePatterns) {
              for (const line of lines) {
                if (pattern.test(line) && 
                    !line.match(/^(QTY|QUANTITY|LTP|AVG|CURRENT|INVESTED|PORTFOLIO|HOLDINGS|WATCHLIST)$/i) &&
                    !line.includes('₹') && !line.includes('%') && !line.match(/^\d+$/)) {
                  stockName = line.trim();
                  console.log(`🔍 [DEBUGGER] Found stock name with pattern ${stockNamePatterns.indexOf(pattern) + 1}: "${stockName}"`);
                  break;
                }
              }
              if (stockName) break;
            }
            
            // Fallback: Look for any reasonable company name
            if (!stockName) {
              for (const line of lines) {
                if (line.length >= 3 && line.length <= 50 &&
                    !line.includes('₹') && !line.includes('%') &&
                    !line.match(/^\d+/) && !line.match(/^(qty|quantity|ltp|avg|current|invested|portfolio|holdings)/i) &&
                    /[A-Za-z]/.test(line)) {
                  stockName = line.trim();
                  console.log(`🔍 [DEBUGGER] Found stock name (fallback): "${stockName}"`);
                  break;
                }
              }
            }
            
            if (!stockName || stockName.length < 2) {
              console.log(`🔍 [DEBUGGER] ❌ No valid stock name found in candidate ${index + 1}`);
              return;
            }
            
            if (processedStocks.has(stockName)) {
              console.log(`🔍 [DEBUGGER] ❌ Duplicate stock name: ${stockName}`);
              return;
            }
            
            console.log(`🔍 [DEBUGGER] ✅ Processing stock: "${stockName}"`);
            
            // Enhanced number extraction with detailed logging
            const allNumbers = text.match(/[\d,]+(?:\.\d{1,2})?/g) || [];
            const cleanNumbers = allNumbers.map(num => {
              const cleaned = num.replace(/,/g, '');
              return parseFloat(cleaned);
            }).filter(num => !isNaN(num) && num > 0);
            
            console.log(`🔍 [DEBUGGER] Raw numbers found: [${allNumbers.join(', ')}]`);
            console.log(`🔍 [DEBUGGER] Clean numbers: [${cleanNumbers.join(', ')}]`);
            
            // Enhanced rupee value extraction
            const rupeeMatches = text.match(/₹\s*([\d,]+(?:\.\d{1,2})?)/g) || [];
            const rupeeValues = rupeeMatches.map(match => {
              const cleanValue = match.replace(/[₹,\s]/g, '');
              return parseFloat(cleanValue);
            }).filter(val => !isNaN(val) && val > 0);
            
            console.log(`🔍 [DEBUGGER] Rupee matches: [${rupeeMatches.join(', ')}]`);
            console.log(`🔍 [DEBUGGER] Rupee values: [${rupeeValues.join(', ')}]`);
            
            // Enhanced percentage extraction
            const percentMatches = text.match(/([+-]?\d+(?:\.\d{1,2})?)%/g) || [];
            const percentValues = percentMatches.map(match => {
              return parseFloat(match.replace('%', ''));
            });
            
            console.log(`🔍 [DEBUGGER] Percent matches: [${percentMatches.join(', ')}]`);
            console.log(`🔍 [DEBUGGER] Percent values: [${percentValues.join(', ')}]`);
            
            // Enhanced smart value mapping with detailed debugging
            let quantity = 0, invested = 0, current = 0, pnl = 0, pnlPercent = 0;
            
            console.log(`🔍 [DEBUGGER] Starting value mapping for ${stockName}:`);
            
            // Strategy 1: Find quantity (usually the smallest meaningful number)
            const potentialQuantities = cleanNumbers.filter(num => num > 0 && num < 10000 && num % 1 === 0);
            if (potentialQuantities.length > 0) {
              quantity = Math.min(...potentialQuantities);
              console.log(`🔍 [DEBUGGER] Quantity candidates: [${potentialQuantities.join(', ')}], Selected: ${quantity}`);
            } else {
              // Fallback: Look for fractional quantities
              const fractionalQuantities = cleanNumbers.filter(num => num > 0 && num < 1000);
              if (fractionalQuantities.length > 0) {
                quantity = Math.min(...fractionalQuantities);
                console.log(`🔍 [DEBUGGER] Fractional quantity candidates: [${fractionalQuantities.join(', ')}], Selected: ${quantity}`);
              }
            }
            
            // Strategy 2: Map rupee values intelligently
            if (rupeeValues.length >= 2) {
              // Sort rupee values to identify patterns
              const sortedRupees = [...rupeeValues].sort((a, b) => b - a);
              console.log(`🔍 [DEBUGGER] Sorted rupee values: [${sortedRupees.join(', ')}]`);
              
              // Largest is likely current value, second largest is likely invested
              current = sortedRupees[0];
              invested = sortedRupees[1];
              
              console.log(`🔍 [DEBUGGER] Initial mapping - Current: ₹${current}, Invested: ₹${invested}`);
              
              // Calculate P&L
              pnl = current - invested;
              console.log(`🔍 [DEBUGGER] Calculated P&L: ₹${pnl}`);
              
              // If we have a third value, check if it matches our P&L calculation
              if (sortedRupees.length >= 3) {
                const potentialPnL = sortedRupees[2];
                console.log(`🔍 [DEBUGGER] Third rupee value (potential P&L): ₹${potentialPnL}`);
                
                // Use provided P&L if it's close to calculated (within 20% tolerance)
                if (Math.abs(potentialPnL - Math.abs(pnl)) < Math.abs(pnl) * 0.2) {
                  pnl = current > invested ? potentialPnL : -potentialPnL;
                  console.log(`🔍 [DEBUGGER] Using provided P&L: ₹${pnl}`);
                }
              }
            } else if (rupeeValues.length === 1 && cleanNumbers.length >= 3) {
              // Single rupee value scenario
              console.log(`🔍 [DEBUGGER] Single rupee value scenario`);
              const largeNumbers = cleanNumbers.filter(num => num >= 100);
              console.log(`🔍 [DEBUGGER] Large numbers (≥100): [${largeNumbers.join(', ')}]`);
              
              if (largeNumbers.length >= 2) {
                // Assume largest numbers are financial values
                const sortedLarge = [...largeNumbers].sort((a, b) => b - a);
                current = sortedLarge[0];
                invested = sortedLarge[1];
                pnl = current - invested;
                console.log(`🔍 [DEBUGGER] Mapped from large numbers - Current: ${current}, Invested: ${invested}, P&L: ${pnl}`);
              }
            } else {
              console.log(`🔍 [DEBUGGER] ⚠️ Insufficient rupee values for mapping: ${rupeeValues.length} found`);
            }
            
            // Strategy 3: Handle percentage
            if (percentValues.length > 0) {
              pnlPercent = percentValues[0];
              console.log(`🔍 [DEBUGGER] Using provided percentage: ${pnlPercent}%`);
            } else if (invested > 0 && pnl !== 0) {
              pnlPercent = (pnl / invested) * 100;
              console.log(`🔍 [DEBUGGER] Calculated percentage: ${pnlPercent.toFixed(2)}%`);
            }
            
            // Strategy 4: Calculate individual prices
            const avgPrice = quantity > 0 ? invested / quantity : 0;
            const currentPrice = quantity > 0 ? current / quantity : 0;
            
            console.log(`🔍 [DEBUGGER] Final calculations for ${stockName}:`);
            console.log(`🔍 [DEBUGGER] - Quantity: ${quantity}`);
            console.log(`🔍 [DEBUGGER] - Invested: ₹${invested} (Avg Price: ₹${avgPrice.toFixed(2)})`);
            console.log(`🔍 [DEBUGGER] - Current: ₹${current} (Current Price: ₹${currentPrice.toFixed(2)})`);
            console.log(`🔍 [DEBUGGER] - P&L: ₹${pnl} (${pnlPercent.toFixed(2)}%)`);
            
            // Enhanced validation with detailed reasoning
            const validationReasons = [];
            let isValid = true;
            
            if (!stockName || stockName.length < 2) {
              validationReasons.push('Invalid stock name');
              isValid = false;
            }
            
            if (invested <= 0 && current <= 0) {
              validationReasons.push('No financial values found');
              isValid = false;
            }
            
            if (quantity <= 0) {
              validationReasons.push('No quantity found');
              // Don't invalidate, but note it
            }
            
            if (avgPrice > 100000 || currentPrice > 100000) {
              validationReasons.push('Unrealistic stock prices (>₹100k)');
              isValid = false;
            }
            
            console.log(`🔍 [DEBUGGER] Validation for ${stockName}: ${isValid ? 'PASSED' : 'FAILED'}`);
            if (!isValid) {
              console.log(`🔍 [DEBUGGER] Validation failures: ${validationReasons.join(', ')}`);
              return;
            }
            
            if (validationReasons.length > 0) {
              console.log(`🔍 [DEBUGGER] Validation warnings: ${validationReasons.join(', ')}`);
            }
            
            // Create and validate stock entry
            const stockEntry = {
              stockName: stockName,
              avgValue: Number(avgPrice.toFixed(2)),
              mktValue: Number(currentPrice.toFixed(2)),
              invested: Number(invested.toFixed(2)),
              current: Number(current.toFixed(2)),
              PnL: Number(pnl.toFixed(2)),
              'PnL%': Number(pnlPercent.toFixed(2)),
              qty: quantity,
              sector: 'Unknown',
              subsector: 'Unknown',
              scrapedAt: new Date().toISOString(),
              debugInfo: {
                candidateIndex: index + 1,
                score: score,
                rawText: text.substring(0, 200),
                extractedNumbers: cleanNumbers,
                extractedRupees: rupeeValues,
                extractedPercents: percentValues
              }
            };
            
            console.log(`🔍 [DEBUGGER] ✅ Successfully created stock entry for ${stockName}:`);
            console.log(`🔍 [DEBUGGER] Entry details:`, JSON.stringify(stockEntry, null, 2));
            
            stockData.push(stockEntry);
            processedStocks.add(stockName);
            successfulExtractions++;
            
            console.log(`🔍 [DEBUGGER] Stock ${successfulExtractions} added to results. Total stocks: ${stockData.length}`);
            
          } catch (error) {
            console.error(`🔍 [DEBUGGER] ❌ Error processing candidate ${index + 1}:`, error);
            console.error(`🔍 [DEBUGGER] Error details:`, {
              message: error.message,
              stack: error.stack,
              candidateText: item.text.substring(0, 100)
            });
          }
        });
        
        console.log('🔍 [DEBUGGER] ='.repeat(80));
        console.log('🔍 [DEBUGGER] STEP 5: EXTRACTION SUMMARY');
        console.log('🔍 [DEBUGGER] ='.repeat(80));
        console.log(`🔍 [DEBUGGER] Processing complete:`);
        console.log(`🔍 [DEBUGGER] - Candidates processed: ${processingAttempts}`);
        console.log(`🔍 [DEBUGGER] - Successful extractions: ${successfulExtractions}`);
        console.log(`🔍 [DEBUGGER] - Final stock count: ${stockData.length}`);
        console.log(`🔍 [DEBUGGER] - Unique stocks: ${processedStocks.size}`);
        
        if (stockData.length > 0) {
          console.log(`🔍 [DEBUGGER] Successfully extracted stocks:`);
          stockData.forEach((stock, idx) => {
            console.log(`🔍 [DEBUGGER] ${idx + 1}. ${stock.stockName} - ₹${stock.invested} → ₹${stock.current} (${stock['PnL%']}%)`);
          });
        } else {
          console.log(`🔍 [DEBUGGER] ❌ No stocks were successfully extracted`);
          console.log(`🔍 [DEBUGGER] Debug info for troubleshooting:`);
          console.log(`🔍 [DEBUGGER] - Total financial elements found: ${financialElements.length}`);
          console.log(`🔍 [DEBUGGER] - Top elements analyzed: ${topElements.length}`);
          console.log(`🔍 [DEBUGGER] - Processing attempts: ${processingAttempts}`);
        }
        
        console.log('🔍 [DEBUGGER] ='.repeat(80));
        console.log(`🔍 [DEBUGGER] Final extraction result: ${stockData.length} stocks found`);
        return stockData;
      });
      
      console.log(`✅ Successfully extracted ${holdings.length} holdings`);
      
      // Log detailed scraping results on server side
      console.log('🔍 [SCRAPING SUMMARY] Detailed extraction results:');
      console.log('='.repeat(60));
      if (holdings.length > 0) {
        holdings.forEach((stock, index) => {
          console.log(`📈 Stock ${index + 1}: ${stock.stockName}`);
          console.log(`   💰 Invested: ₹${stock.invested} | Current: ₹${stock.current}`);
          console.log(`   📊 P&L: ₹${stock.PnL} (${stock['PnL%']}%)`);
          console.log(`   🔢 Quantity: ${stock.qty} | Avg: ₹${stock.avgValue} | LTP: ₹${stock.mktValue}`);
          console.log('   ' + '-'.repeat(40));
        });
        
        // Calculate totals
        const totalInvested = holdings.reduce((sum, stock) => sum + stock.invested, 0);
        const totalCurrent = holdings.reduce((sum, stock) => sum + stock.current, 0);
        const totalPnL = totalCurrent - totalInvested;
        const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
        
        console.log('💼 PORTFOLIO SUMMARY:');
        console.log(`   📊 Total Stocks: ${holdings.length}`);
        console.log(`   💰 Total Invested: ₹${totalInvested.toFixed(2)}`);
        console.log(`   💎 Current Value: ₹${totalCurrent.toFixed(2)}`);
        console.log(`   📈 Total P&L: ₹${totalPnL.toFixed(2)} (${totalPnLPercent.toFixed(2)}%)`);
      } else {
        console.log('❌ No holdings were extracted');
      }
      console.log('='.repeat(60));
      
      // Add some additional data processing with error handling
      console.log('🔄 [PROCESSING] Starting data validation and processing...');
      
      const processedHoldings = holdings.map((holding, index) => {
        try {
          const processed = {
            ...holding,
            avgValue: Number(holding.avgValue) || 0,
            mktValue: Number(holding.mktValue) || 0,
            invested: Number(holding.invested) || 0,
            current: Number(holding.current) || 0,
            PnL: Number(holding.PnL) || 0,
            'PnL%': Number(holding['PnL%']) || 0,
            qty: Number(holding.qty) || 0,
            scrapedAt: new Date().toISOString()
          };
          
          // Ensure all values are properly formatted
          processed.avgValue = Number(processed.avgValue.toFixed(2));
          processed.mktValue = Number(processed.mktValue.toFixed(2));
          processed.invested = Number(processed.invested.toFixed(2));
          processed.current = Number(processed.current.toFixed(2));
          processed.PnL = Number(processed.PnL.toFixed(2));
          processed['PnL%'] = Number(processed['PnL%'].toFixed(2));
          
          console.log(`✅ [PROCESSING] Processed stock ${index + 1}: ${processed.stockName}`);
          return processed;
        } catch (error) {
          console.error(`❌ [PROCESSING] Error processing stock ${index + 1}:`, error);
          console.error(`❌ [PROCESSING] Stock data:`, holding);
          return null;
        }
      }).filter(holding => holding !== null); // Remove any failed processing
      
      console.log(`🔄 [PROCESSING] Successfully processed ${processedHoldings.length}/${holdings.length} holdings`);
      
      if (processedHoldings.length === 0) {
        console.log('⚠️ [PROCESSING] No holdings survived processing - checking original data...');
        console.log('📊 [PROCESSING] Original holdings data:', JSON.stringify(holdings, null, 2));
      }
      
      console.log('🚀 [RETURN] Returning processed holdings to caller...');
      return processedHoldings;
      
    } catch (error) {
      console.error('💥 [SCRAPING ERROR] Holdings scraping failed:', error);
      console.error('💥 [SCRAPING ERROR] Error stack:', error.stack);
      console.error('💥 [SCRAPING ERROR] Current page URL:', this.page ? this.page.url() : 'No page available');
      
      // Try to get page info for debugging
      try {
        if (this.page) {
          const pageInfo = await this.page.evaluate(() => ({
            url: window.location.href,
            title: document.title,
            bodyLength: document.body.innerText.length
          }));
          console.error('💥 [SCRAPING ERROR] Page info at error:', pageInfo);
        }
      } catch (debugError) {
        console.error('💥 [SCRAPING ERROR] Could not get debug info:', debugError.message);
      }
      
      throw error;
    }
  }

  /**
   * Auto-scroll to load all holdings with progressive loading detection and advanced debugging
   * @returns {Promise<void>}
   */
  async autoScroll() {
    try {
      console.log('🔄 [SCROLL] Starting advanced progressive scroll to load all holdings...');
      console.log('🔄 [SCROLL] ='.repeat(60));
      
      // Initial page state
      const initialState = await this.page.evaluate(() => ({
        scrollHeight: document.body.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        scrollTop: window.pageYOffset,
        totalElements: document.querySelectorAll('*').length,
        visibleText: document.body.innerText.length
      }));
      
      console.log('🔄 [SCROLL] Initial page state:', initialState);
      
      let previousHoldingsCount = 0;
      let previousScrollHeight = initialState.scrollHeight;
      let stableCount = 0;
      const maxStableAttempts = 5; // Increased stability checks
      let totalScrollAttempts = 0;
      
      // Phase 1: Progressive scrolling with content detection
      console.log('🔄 [SCROLL] Phase 1: Progressive content loading...');
      
      for (let attempt = 0; attempt < 15; attempt++) { // Increased attempts
        totalScrollAttempts++;
        
        // Get current scroll position and page info
        const beforeScroll = await this.page.evaluate(() => ({
          scrollTop: window.pageYOffset,
          scrollHeight: document.body.scrollHeight,
          elementCount: document.querySelectorAll('*').length,
          rupeeCount: (document.body.innerText.match(/₹/g) || []).length,
          percentCount: (document.body.innerText.match(/%/g) || []).length
        }));
        
        // Scroll down by viewport height
        await this.page.evaluate(() => {
          window.scrollBy(0, window.innerHeight * 0.8); // Scroll 80% of viewport
        });
        
        // Wait for content to load and render
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased wait time
        
        // Get state after scroll
        const afterScroll = await this.page.evaluate(() => ({
          scrollTop: window.pageYOffset,
          scrollHeight: document.body.scrollHeight,
          elementCount: document.querySelectorAll('*').length,
          rupeeCount: (document.body.innerText.match(/₹/g) || []).length,
          percentCount: (document.body.innerText.match(/%/g) || []).length,
          isAtBottom: window.innerHeight + window.scrollY >= document.body.scrollHeight - 100
        }));
        
        console.log(`🔄 [SCROLL] Attempt ${attempt + 1}:`);
        console.log(`🔄 [SCROLL] - Scroll: ${beforeScroll.scrollTop} → ${afterScroll.scrollTop}`);
        console.log(`🔄 [SCROLL] - Height: ${beforeScroll.scrollHeight} → ${afterScroll.scrollHeight}`);
        console.log(`🔄 [SCROLL] - Elements: ${beforeScroll.elementCount} → ${afterScroll.elementCount}`);
        console.log(`🔄 [SCROLL] - Rupee symbols: ${beforeScroll.rupeeCount} → ${afterScroll.rupeeCount}`);
        console.log(`🔄 [SCROLL] - At bottom: ${afterScroll.isAtBottom}`);
        
        // Check for new content
        const contentChanged = afterScroll.scrollHeight > beforeScroll.scrollHeight ||
                              afterScroll.elementCount > beforeScroll.elementCount ||
                              afterScroll.rupeeCount > beforeScroll.rupeeCount;
        
        if (contentChanged) {
          console.log(`🔄 [SCROLL] ✅ New content detected in attempt ${attempt + 1}`);
          stableCount = 0;
          previousScrollHeight = afterScroll.scrollHeight;
        } else {
          stableCount++;
          console.log(`🔄 [SCROLL] No new content. Stable count: ${stableCount}/${maxStableAttempts}`);
        }
        
        // If content is stable and we're at bottom, break
        if (stableCount >= maxStableAttempts && afterScroll.isAtBottom) {
          console.log(`🔄 [SCROLL] Content stable and reached bottom. Stopping progressive scroll.`);
          break;
        }
        
        // If we can't scroll further, break
        if (afterScroll.scrollTop === beforeScroll.scrollTop && afterScroll.isAtBottom) {
          console.log(`🔄 [SCROLL] Cannot scroll further. Reached absolute bottom.`);
          break;
        }
      }
      
      // Phase 2: Comprehensive deep scroll to ensure all content is loaded
      console.log('🔄 [SCROLL] Phase 2: Comprehensive deep scroll...');
      
      // Go back to top
      await this.page.evaluate(() => window.scrollTo(0, 0));
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Slow, thorough scroll through entire page
      await this.page.evaluate(async () => {
        return new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 150; // Smaller increments for thoroughness
          let attempts = 0;
          const maxAttempts = 100; // Prevent infinite scrolling
          
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            const currentScroll = window.pageYOffset;
            
            console.log(`Deep scroll attempt ${attempts + 1}: ${currentScroll}/${scrollHeight}`);
            
            window.scrollBy(0, distance);
            totalHeight += distance;
            attempts++;
            
            // Check if we've reached the bottom or max attempts
            if (totalHeight >= scrollHeight || attempts >= maxAttempts) {
              console.log(`Deep scroll complete. Total height: ${totalHeight}, Attempts: ${attempts}`);
              clearInterval(timer);
              resolve();
            }
          }, 300); // Slower scroll for better content loading
        });
      });
      
      // Phase 3: Final stabilization and verification
      console.log('🔄 [SCROLL] Phase 3: Final stabilization...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Get final page state
      const finalState = await this.page.evaluate(() => ({
        scrollHeight: document.body.scrollHeight,
        totalElements: document.querySelectorAll('*').length,
        rupeeSymbols: (document.body.innerText.match(/₹/g) || []).length,
        percentSymbols: (document.body.innerText.match(/%/g) || []).length,
        textLength: document.body.innerText.length,
        financialKeywords: {
          holdings: (document.body.innerText.toLowerCase().match(/holdings/g) || []).length,
          portfolio: (document.body.innerText.toLowerCase().match(/portfolio/g) || []).length,
          stocks: (document.body.innerText.toLowerCase().match(/stocks/g) || []).length
        }
      }));
      
      console.log('🔄 [SCROLL] ='.repeat(60));
      console.log('🔄 [SCROLL] SCROLLING SUMMARY:');
      console.log(`🔄 [SCROLL] - Total scroll attempts: ${totalScrollAttempts}`);
      console.log(`🔄 [SCROLL] - Initial vs Final scroll height: ${initialState.scrollHeight} → ${finalState.scrollHeight}`);
      console.log(`🔄 [SCROLL] - Initial vs Final elements: ${initialState.totalElements} → ${finalState.totalElements}`);
      console.log(`🔄 [SCROLL] - Rupee symbols found: ${finalState.rupeeSymbols}`);
      console.log(`🔄 [SCROLL] - Percent symbols found: ${finalState.percentSymbols}`);
      console.log(`🔄 [SCROLL] - Total text length: ${finalState.textLength} characters`);
      console.log(`🔄 [SCROLL] - Financial keywords:`, finalState.financialKeywords);
      console.log('🔄 [SCROLL] ='.repeat(60));
      
      console.log(`✅ [SCROLL] Advanced scrolling complete. Page ready for extraction.`);
      
    } catch (error) {
      console.error('❌ [SCROLL] Auto-scroll error:', error);
      throw error;
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
        // Create debug directory if it doesn't exist
        const fs = require('fs');
        const path = require('path');
        const debugDir = path.join(__dirname, '..', 'debug');
        
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        
        const screenshotPath = path.join(debugDir, filename);
        await this.page.screenshot({ 
          path: screenshotPath,
          fullPage: true 
        });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
      }
    } catch (error) {
      console.error('Screenshot error:', error);
    }
  }

  /**
   * Perform comprehensive diagnostic check for scraping
   */
  async performDiagnosticCheck() {
    try {
      console.log('🔍 [DIAGNOSTIC] Starting comprehensive page analysis...');
      
      const diagnosticInfo = await this.page.evaluate(() => {
        const bodyText = document.body.innerText;
        const hasRupeeSymbol = bodyText.includes('₹');
        const hasPercentage = bodyText.includes('%');
        const hasStockTerms = /holdings|portfolio|stocks|equity|shares/i.test(bodyText);
        
        // Count financial elements
        const financialElementCount = document.querySelectorAll('*').length;
        const rupeeElements = Array.from(document.querySelectorAll('*')).filter(el => 
          el.innerText && el.innerText.includes('₹')
        ).length;
        
        // Look for specific Groww indicators
        const growwIndicators = {
          hasGrowwLogo: bodyText.toLowerCase().includes('groww'),
          hasLoginElements: !!document.querySelector('[data-testid*="login"], .login, #login'),
          hasPortfolioElements: !!document.querySelector('[data-testid*="portfolio"], .portfolio, .holdings'),
          hasStockListElements: !!document.querySelector('table, .stock-list, .holding-item, [data-testid*="stock"]')
        };
        
        return {
          pageInfo: {
            hasRupeeSymbol,
            hasPercentage,
            hasStockTerms,
            bodyLength: bodyText.length,
            title: document.title,
            url: window.location.href
          },
          elementCounts: {
            total: financialElementCount,
            withRupee: rupeeElements
          },
          growwIndicators,
          sampleText: bodyText.substring(0, 500)
        };
      });
      
      console.log('🔍 [DIAGNOSTIC] Page Analysis Results:');
      console.log('🔍 [DIAGNOSTIC] ='.repeat(60));
      console.log('🔍 [DIAGNOSTIC] Page Info:', JSON.stringify(diagnosticInfo.pageInfo, null, 2));
      console.log('🔍 [DIAGNOSTIC] Element Counts:', JSON.stringify(diagnosticInfo.elementCounts, null, 2));
      console.log('🔍 [DIAGNOSTIC] Groww Indicators:', JSON.stringify(diagnosticInfo.growwIndicators, null, 2));
      console.log('🔍 [DIAGNOSTIC] Sample Text:', diagnosticInfo.sampleText);
      console.log('🔍 [DIAGNOSTIC] ='.repeat(60));
      
      // Take diagnostic screenshot
      await this.takeScreenshot('diagnostic-check.png');
      
      return diagnosticInfo;
      
    } catch (error) {
      console.error('🔍 [DIAGNOSTIC] Error during diagnostic check:', error);
      return null;
    }
  }

  /**
   * Check if user is logged in to Groww
   * @returns {Promise<boolean>}
   */
  async isGrowwLoggedIn() {
    try {
      if (!this.page) {
        console.log('🔍 [LOGIN CHECK] No page available');
        return false;
      }
      
      const currentUrl = this.page.url();
      console.log('🔍 [LOGIN CHECK] Current URL:', currentUrl);
      
      // Check if we're on a logged-in page (not login page)
      const isNotLoginPage = !currentUrl.includes('/login') && !currentUrl.includes('/auth');
      console.log('🔍 [LOGIN CHECK] Is not login page:', isNotLoginPage);
      
      // Enhanced selectors for Groww user elements
      const hasUserElements = await this.page.evaluate(() => {
        const userIndicators = [
          // Common Groww selectors
          '[data-testid="user-profile"]',
          '[data-testid="header-user-menu"]',
          '[data-testid="user-dropdown"]',
          '.user-profile',
          '.header-user-menu',
          '.user-dropdown',
          // Portfolio/Holdings page indicators
          '[data-testid="portfolio"]',
          '[data-testid="holdings"]',
          '.portfolio-section',
          '.holdings-section',
          // Dashboard indicators
          '.dashboard',
          '[data-testid="dashboard"]',
          // User name or avatar indicators
          '.user-avatar',
          '.user-name',
          '[data-testid="user-avatar"]',
          // Navigation indicators for logged-in users
          'a[href*="/portfolio"]',
          'a[href*="/holdings"]',
          'a[href*="/orders"]',
          // Logout button as indicator
          '[data-testid="logout"]',
          'button[title*="Logout"]',
          'button[title*="logout"]'
        ];
        
        const foundElements = userIndicators.filter(selector => 
          document.querySelector(selector) !== null
        );
        
        console.log('🔍 [LOGIN CHECK] Found user elements:', foundElements);
        return foundElements.length > 0;
      });
      
      console.log('🔍 [LOGIN CHECK] Has user elements:', hasUserElements);
      
      // Additional check: Look for specific text content that indicates login
      const hasLoggedInContent = await this.page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        const loggedInIndicators = [
          'portfolio',
          'holdings',
          'watchlist',
          'logout',
          'dashboard'
        ];
        
        const foundContent = loggedInIndicators.filter(text => 
          bodyText.includes(text)
        );
        
        console.log('🔍 [LOGIN CHECK] Found logged-in content:', foundContent);
        return foundContent.length >= 2; // At least 2 indicators
      });
      
      console.log('🔍 [LOGIN CHECK] Has logged-in content:', hasLoggedInContent);
      
      // Check for specific Groww logged-in URL patterns
      const hasLoggedInUrl = /groww\.in\/(dashboard|portfolio|holdings|watchlist|orders|stocks)/i.test(currentUrl);
      console.log('🔍 [LOGIN CHECK] Has logged-in URL pattern:', hasLoggedInUrl);
      
      const isLoggedIn = (isNotLoginPage && hasUserElements) || hasLoggedInContent || hasLoggedInUrl;
      console.log('🔍 [LOGIN CHECK] Final result - Is logged in:', isLoggedIn);
      
      return isLoggedIn;
      
    } catch (error) {
      console.error('🔍 [LOGIN CHECK] Error:', error);
      return false;
    }
  }
}

module.exports = ScrapingService;
