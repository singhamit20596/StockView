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
  try {
    const { sessionId } = req.params;
    
    const session = scrapingSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Scraping session not found'
      });
    }
    
    console.log(`🔍 Checking login status for session: ${sessionId}`);
    
    try {
      const isLoggedIn = await session.service.isGrowwLoggedIn();
      
      if (isLoggedIn) {
        // Update session status
        scrapingSessions.set(sessionId, {
          ...session,
          status: 'logged_in',
          loginCompletedAt: new Date().toISOString()
        });
        
        res.json({
          success: true,
          data: {
            sessionId,
            status: 'logged_in',
            isLoggedIn: true,
            message: 'Login completed successfully. Ready to scrape holdings.'
          }
        });
      } else {
        res.json({
          success: true,
          data: {
            sessionId,
            status: 'awaiting_login',
            isLoggedIn: false,
            message: 'Please complete the login process in the browser.'
          }
        });
      }
      
    } catch (error) {
      console.error('Error checking login status:', error);
      res.json({
        success: true,
        data: {
          sessionId,
          status: 'login_error',
          isLoggedIn: false,
          message: 'Error checking login status. Please try again.'
        }
      });
    }
    
  } catch (error) {
    console.error('Error checking login:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check login status',
      message: error.message
    });
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
      const holdings = await session.service.scrapeGrowwHoldings();
      
      // Update session status
      scrapingSessions.set(sessionId, {
        ...session,
        status: 'scraping_completed',
        holdings,
        scrapingCompletedAt: new Date().toISOString()
      });
      
      console.log(`✅ Scraping completed for session: ${sessionId} - ${holdings.length} holdings found`);
      
      res.json({
        success: true,
        data: {
          sessionId,
          status: 'scraping_completed',
          holdings,
          totalHoldings: holdings.length,
          accountName: session.accountName,
          broker: session.broker,
          scrapedAt: new Date().toISOString()
        },
        message: `Successfully scraped ${holdings.length} holdings. Please review and confirm.`
      });
      
    } catch (error) {
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
    console.error('Error during scraping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scrape holdings',
      message: error.message
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
