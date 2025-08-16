/**
 * Scraping API Routes
 * Handles web scraping operations for different brokers
 */

const express = require('express');
const router = express.Router();
const ScrapingService = require('../services/scrapingService');

// Store scraping sessions globally (in production, use Redis or database)
const scrapingSessions = new Map();

/**
 * POST /api/scraping/initiate
 * Initiate scraping session and navigate to broker login
 */
router.post('/initiate', async (req, res) => {
  try {
    const { broker, accountName } = req.body;
    
    if (!broker || !accountName) {
      return res.status(400).json({
        success: false,
        error: 'Broker and account name are required'
      });
    }
    
    // Currently only supporting Groww
    if (broker.toLowerCase() !== 'groww') {
      return res.status(400).json({
        success: false,
        error: 'Currently only Groww broker is supported'
      });
    }
    
    console.log(`🚀 Initiating scraping session for ${broker} - ${accountName}`);
    
    const scrapingService = new ScrapingService();
    const sessionId = `${accountName}_${Date.now()}`;
    
    // Store session
    scrapingSessions.set(sessionId, {
      service: scrapingService,
      broker,
      accountName,
      status: 'initializing',
      createdAt: new Date().toISOString()
    });
    
    try {
      // Initialize browser and navigate to login
      await scrapingService.initiateGrowwLogin();
      
      // Update session status
      scrapingSessions.set(sessionId, {
        ...scrapingSessions.get(sessionId),
        status: 'login_ready',
        loginInitiatedAt: new Date().toISOString()
      });
      
      res.json({
        success: true,
        data: {
          sessionId,
          status: 'login_ready',
          message: 'Browser launched and login page loaded. Please complete manual login.',
          broker,
          accountName
        }
      });
      
    } catch (error) {
      // Clean up session on error
      scrapingSessions.delete(sessionId);
      throw error;
    }
    
  } catch (error) {
    console.error('Error initiating scraping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate scraping',
      message: error.message
    });
  }
});

/**
 * POST /api/scraping/check-login/:sessionId
 * Check if user has completed manual login
 */
router.post('/check-login/:sessionId', async (req, res) => {
  console.log('🔍 [API] ='.repeat(80));
  console.log('🔍 [API] CHECK-LOGIN REQUEST');
  console.log('🔍 [API] ='.repeat(80));
  
  try {
    const { sessionId } = req.params;
    console.log(`🔍 [API] Session ID: ${sessionId}`);
    
    const session = scrapingSessions.get(sessionId);
    console.log(`🔍 [API] Session found: ${session ? 'YES' : 'NO'}`);
    
    if (!session) {
      console.log(`🔍 [API] ❌ Session not found for ID: ${sessionId}`);
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    console.log(`🔍 [API] Current session status: ${session.status}`);
    console.log(`🔍 [API] Session broker: ${session.broker}`);
    console.log(`🔍 [API] Account name: ${session.accountName}`);
    
    // Check if user is logged in based on broker
    let isLoggedIn = false;
    if (session.broker === 'groww') {
      console.log(`🔍 [API] Checking Groww login status...`);
      isLoggedIn = await session.scrapingService.isGrowwLoggedIn();
      console.log(`🔍 [API] Groww login status: ${isLoggedIn ? 'LOGGED IN' : 'NOT LOGGED IN'}`);
    }
    
    if (isLoggedIn) {
      session.status = 'logged_in';
      console.log(`🔍 [API] ✅ Login confirmed. Session status updated to: ${session.status}`);
      
      const response = {
        success: true,
        data: {
          status: 'logged_in',
          message: 'Login confirmed. Ready to scrape holdings.',
          broker: session.broker,
          accountName: session.accountName
        }
      };
      
      console.log(`� [API] Sending success response:`, JSON.stringify(response, null, 2));
      res.json(response);
    } else {
      console.log(`🔍 [API] ⏳ Login not yet completed. Maintaining current status.`);
      
      const response = {
        success: true,
        data: {
          status: 'awaiting_login',
          message: 'Please complete manual login in the browser.',
          broker: session.broker,
          accountName: session.accountName
        }
      };
      
      console.log(`🔍 [API] Sending waiting response:`, JSON.stringify(response, null, 2));
      res.json(response);
    }
    
  } catch (error) {
    console.error('🔍 [API] ❌ Error checking login:', error);
    console.error('🔍 [API] Error stack:', error.stack);
    
    const errorResponse = {
      success: false,
      error: 'Failed to check login status',
      message: error.message
    };
    
    console.log(`🔍 [API] Sending error response:`, JSON.stringify(errorResponse, null, 2));
    res.status(500).json(errorResponse);
  } finally {
    console.log('🔍 [API] ='.repeat(80));
  }
});

/**
 * POST /api/scraping/scrape/:sessionId
 * Scrape holdings data after successful login
 */
router.post('/scrape/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = scrapingSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Scraping session not found'
      });
    }
    
    if (session.status !== 'logged_in') {
      return res.status(400).json({
        success: false,
        error: 'User must be logged in before scraping. Complete login first.'
      });
    }
    
    console.log(`📊 Starting holdings scraping for session: ${sessionId}`);
    
    // Update session status
    scrapingSessions.set(sessionId, {
      ...session,
      status: 'scraping',
      scrapingStartedAt: new Date().toISOString()
    });
    
    try {
      console.log(`📊 [SCRAPE API] Starting holdings scraping for session: ${sessionId}`);
      console.log(`📊 [SCRAPE API] Session details:`, {
        broker: session.broker,
        accountName: session.accountName,
        status: session.status
      });
      
      const holdings = await session.service.scrapeGrowwHoldings();
      
      console.log(`📊 [SCRAPE API] Scraping service returned ${holdings ? holdings.length : 0} holdings`);
      
      if (!holdings || holdings.length === 0) {
        console.log(`⚠️ [SCRAPE API] Warning: No holdings found. This could indicate:`);
        console.log(`⚠️ [SCRAPE API] 1. Empty portfolio`);
        console.log(`⚠️ [SCRAPE API] 2. Page structure changed`);
        console.log(`⚠️ [SCRAPE API] 3. Login session expired`);
        console.log(`⚠️ [SCRAPE API] 4. Incorrect page navigation`);
      }
      
      console.log(`📊 [SCRAPE API] Holdings data:`, JSON.stringify(holdings, null, 2));
      
      // Update session status
      scrapingSessions.set(sessionId, {
        ...session,
        status: 'scraping_completed',
        holdings: holdings || [],
        scrapingCompletedAt: new Date().toISOString()
      });
      
      const holdingsCount = holdings ? holdings.length : 0;
      console.log(`✅ [SCRAPE API] Scraping completed for session: ${sessionId} - ${holdingsCount} holdings found`);
      
      // Prepare response data
      const responseData = {
        sessionId,
        status: 'scraping_completed',
        holdings: holdings || [],
        totalHoldings: holdingsCount,
        accountName: session.accountName,
        broker: session.broker,
        scrapedAt: new Date().toISOString()
      };
      
      console.log(`🚀 [SCRAPE API] Sending response to client:`, JSON.stringify(responseData, null, 2));
      
      const message = holdingsCount > 0 
        ? `Successfully scraped ${holdingsCount} holdings. Please review and confirm.`
        : `Scraping completed but no holdings found. This could mean your portfolio is empty or there was an issue accessing the data.`;
      
      res.json({
        success: true,
        data: responseData,
        message
      });
      
    } catch (error) {
      console.error(`💥 [SCRAPE API] Error during scraping for session ${sessionId}:`, error);
      console.error(`💥 [SCRAPE API] Error stack:`, error.stack);
      
      // Update session with error
      scrapingSessions.set(sessionId, {
        ...session,
        status: 'scraping_error',
        error: error.message,
        errorOccurredAt: new Date().toISOString()
      });
      
      throw error;
    }
    
  } catch (error) {
    console.error(`💥 [SCRAPE API] Critical error during scraping:`, error);
    console.error(`💥 [SCRAPE API] Error type:`, error.constructor.name);
    console.error(`💥 [SCRAPE API] Error message:`, error.message);
    console.error(`💥 [SCRAPE API] Error stack:`, error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Failed to scrape holdings',
      message: error.message,
      errorType: error.constructor.name
    });
  }
});

/**
 * GET /api/scraping/session/:sessionId
 * Get scraping session status and data
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = scrapingSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Scraping session not found'
      });
    }
    
    // Return session data without the service instance
    const { service, ...sessionData } = session;
    
    res.json({
      success: true,
      data: {
        sessionId,
        ...sessionData
      }
    });
    
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session data',
      message: error.message
    });
  }
});

/**
 * DELETE /api/scraping/session/:sessionId
 * Close scraping session and cleanup browser
 */
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = scrapingSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Scraping session not found'
      });
    }
    
    console.log(`🔒 Closing scraping session: ${sessionId}`);
    
    try {
      // Close browser
      await session.service.close();
    } catch (error) {
      console.error('Error closing browser:', error);
    }
    
    // Remove session
    scrapingSessions.delete(sessionId);
    
    res.json({
      success: true,
      data: {
        sessionId,
        message: 'Scraping session closed successfully'
      }
    });
    
  } catch (error) {
    console.error('Error closing session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to close session',
      message: error.message
    });
  }
});

/**
 * GET /api/scraping/sessions
 * Get all active scraping sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const activeSessions = Array.from(scrapingSessions.entries()).map(([sessionId, session]) => {
      const { service, ...sessionData } = session;
      return {
        sessionId,
        ...sessionData
      };
    });
    
    res.json({
      success: true,
      data: activeSessions,
      total: activeSessions.length
    });
    
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions',
      message: error.message
    });
  }
});

/**
 * POST /api/scraping/cleanup
 * Cleanup all expired or stale sessions
 */
router.post('/cleanup', async (req, res) => {
  try {
    const now = new Date();
    const expiredSessions = [];
    
    for (const [sessionId, session] of scrapingSessions.entries()) {
      const sessionAge = now - new Date(session.createdAt);
      const maxAge = 30 * 60 * 1000; // 30 minutes
      
      if (sessionAge > maxAge) {
        try {
          await session.service.close();
        } catch (error) {
          console.error(`Error closing expired session ${sessionId}:`, error);
        }
        
        scrapingSessions.delete(sessionId);
        expiredSessions.push(sessionId);
      }
    }
    
    console.log(`🧹 Cleanup completed. Removed ${expiredSessions.length} expired sessions`);
    
    res.json({
      success: true,
      data: {
        cleanedSessions: expiredSessions,
        remainingSessions: scrapingSessions.size
      },
      message: `Cleaned up ${expiredSessions.length} expired sessions`
    });
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup sessions',
      message: error.message
    });
  }
});

/**
 * GET /api/scraping/brokers
 * Get list of supported brokers
 */
router.get('/brokers', async (req, res) => {
  try {
    const supportedBrokers = [
      {
        id: 'groww',
        name: 'Groww',
        loginUrl: process.env.GROWW_LOGIN_URL,
        holdingsUrl: process.env.GROWW_HOLDINGS_URL,
        supported: true,
        description: 'Groww online trading platform'
      }
      // Future brokers can be added here
    ];
    
    res.json({
      success: true,
      data: supportedBrokers,
      total: supportedBrokers.length
    });
    
  } catch (error) {
    console.error('Error fetching brokers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch brokers',
      message: error.message
    });
  }
});

module.exports = router;
