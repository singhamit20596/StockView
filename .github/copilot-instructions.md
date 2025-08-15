# StockView - Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
StockView is a scalable web application for managing multiple investment accounts under one roof.

## Tech Stack
- Frontend: React with TailwindCSS, Recharts for analytics
- Backend: Node.js with Express
- Database: JSON-based local file storage
- Web Scraping: Puppeteer for broker data extraction
- UI Design: Inspired by Dolce & Gabbana beauty tools aesthetic

## Architecture Principles
- Modular folder structure: /frontend, /backend, /shared
- Reusable service functions for DB operations, scraping, calculations
- Async/await pattern for all DB operations with proper error handling
- Environment variables for configurations
- Prepared for easy broker expansion beyond Groww

## Database Schema
- **Accounts**: {AccountName(PK), InvestedValue, CurrentValue, PnL, PnL%, updatedAt}
- **Stocks**: {AccountName(FK), StockName(PK), avgValue, mktValue, invested, current, PnL, PnL%, qty, sector, subsector, updatedAt}
- **Views**: {ViewName(PK), AccountName(FK), StockName(FK), avgPrice, mktPrice, investedValue, currentValue, PnL, PnL%, qty, sector, subsector, updatedAt, viewSummary}

## Code Style Guidelines
- Use ES6+ features consistently
- Implement proper error boundaries in React
- Follow RESTful API design patterns
- Use descriptive variable and function names
- Add comprehensive JSDoc comments
- Implement input validation on both frontend and backend

## Key Features to Maintain
1. Account Management with Puppeteer scraping
2. View Creation for account grouping
3. Dashboard analytics with Recharts
4. Modular broker support (currently Groww)
5. Real-time portfolio calculations
