# StockView - Investment Portfolio Management

A comprehensive full-stack investment portfolio management application that helps you track, analyze, and manage your stock investments across multiple broker accounts.

## 🚀 Features

### Core Functionality
- **Multi-Account Management**: Manage multiple broker accounts (Groww, Zerodha, Upstox, Angel One)
- **Automated Data Sync**: Web scraping integration to automatically fetch portfolio data from brokers
- **Portfolio Views**: Combine multiple accounts for unified portfolio analysis
- **Real-time Analytics**: Dashboard with comprehensive portfolio metrics and analytics
- **Performance Tracking**: Track gains/losses, portfolio value, and investment performance

### Dashboard & Analytics
- Portfolio overview with total value, gains/losses, and returns
- Sector-wise portfolio breakdown with interactive charts
- Top gainers and losers analysis
- Account-wise and view-wise analytics
- Historical performance tracking

### Account Management
- Create and manage multiple broker accounts
- Track account status and last sync timestamps
- Individual account portfolio summaries
- Holdings management and tracking

### Data Import & Sync
- Automated web scraping from supported brokers
- Secure credential handling (not stored permanently)
- Session-based import process
- Real-time sync status updates

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js framework
- **JSON File Database** for data persistence
- **Puppeteer** for web scraping automation
- **CORS** enabled for cross-origin requests

### Frontend
- **React** with TypeScript for type safety
- **TailwindCSS** for responsive UI design
- **Recharts** for data visualization
- **Heroicons** for consistent iconography
- **React Router** for navigation
- **Axios** for API communication

## 📁 Project Structure

```
StockView/
├── backend/                 # Backend API server
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic services
│   ├── utils/              # Utility functions
│   ├── data/               # JSON data storage
│   └── server.js           # Main server file
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client services
│   │   ├── types/          # TypeScript type definitions
│   │   └── App.tsx         # Main application component
│   └── public/             # Static assets
├── shared/                 # Shared utilities and types
└── package.json            # Root package configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd StockView
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Start the development servers**
   ```bash
   npm run dev
   ```
   This will start both backend (port 3001) and frontend (port 3000) simultaneously.

### Manual Setup

If you prefer to run services separately:

1. **Start the backend server**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Start the frontend application**
   ```bash
   cd frontend
   npm install
   npm start
   ```

## 📖 Usage Guide

### 1. Account Setup
- Navigate to the "Accounts" page
- Click "Add Account" to create a new broker account
- Fill in account details (name, broker, status)
- Save the account for future data syncing

### 2. Data Import
- Go to the "Sync Data" page
- Select your broker and target account
- Enter your broker login credentials
- Follow the step-by-step import process:
  1. Start import session
  2. Complete broker login
  3. Import portfolio data
  4. Review imported holdings

### 3. Portfolio Views
- Visit the "Views" page to create combined portfolio views
- Select multiple accounts to analyze together
- Preview combined data before saving
- Use views for comprehensive portfolio analysis

### 4. Analytics & Dashboard
- The Dashboard provides an overview of your entire portfolio
- View sector breakdowns, top performers, and key metrics
- Access detailed analytics for individual accounts or views
- Track performance over time

## 🔧 Configuration

### Backend Configuration
The backend server runs on port 3001 by default. Key configuration files:
- `backend/server.js` - Main server configuration
- `backend/package.json` - Dependencies and scripts

### Frontend Configuration
The React app runs on port 3000 by default. Key configuration files:
- `frontend/src/services/api.ts` - API endpoint configuration
- `frontend/tailwind.config.js` - TailwindCSS customization
- `frontend/package.json` - Dependencies and scripts

## 🔒 Security & Privacy

### Data Protection
- Portfolio data is stored locally in JSON files
- No sensitive data is transmitted to external servers
- Login credentials are used only for import sessions and not stored

### Web Scraping Security
- Uses headless browser automation for data extraction
- Implements session management for secure broker interactions
- Follows responsible scraping practices with proper delays

## 🎨 UI/UX Features

### Responsive Design
- Mobile-first approach with TailwindCSS
- Adaptive navigation for desktop and mobile
- Consistent design system with custom color palette

### Interactive Elements
- Real-time loading states and progress indicators
- Interactive charts and data visualizations
- Form validation and error handling
- Intuitive navigation and user flows

## 🛣 API Endpoints

### Accounts API
- `GET /api/accounts` - Fetch all accounts
- `POST /api/accounts` - Create new account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

### Views API
- `GET /api/views` - Fetch all views
- `POST /api/views` - Create new view
- `POST /api/views/preview` - Preview combined account data

### Scraping API
- `POST /api/scraping/start` - Start scraping session
- `POST /api/scraping/login` - Authenticate with broker
- `POST /api/scraping/scrape` - Import portfolio data

### Dashboard API
- `GET /api/dashboard/overview` - Portfolio overview
- `GET /api/dashboard/account/:id` - Account analytics
- `GET /api/dashboard/view/:id` - View analytics

## 🔄 Development Scripts

```bash
# Development (runs both frontend and backend)
npm run dev

# Production build
npm run build

# Start production servers
npm start

# Install all dependencies
npm run install:all

# Run tests
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- Built with modern web technologies and best practices
- Inspired by the need for comprehensive portfolio management
- Designed for Indian stock market and broker integration

---

For support or questions, please open an issue on the repository.
