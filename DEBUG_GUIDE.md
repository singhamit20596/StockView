# StockView Debugging Guide

## 🐛 Debug Configuration Setup Complete!

### Available Debug Configurations:

1. **Debug React App** - Debug the frontend React application
2. **Debug Backend Server** - Debug the Node.js backend server
3. **Debug Chrome (Frontend)** - Debug frontend in Chrome browser
4. **Debug Full Stack** - Debug both frontend and backend simultaneously

### 🚀 How to Start Debugging:

#### Method 1: VS Code Debug Panel
1. Open VS Code Debug panel (Ctrl+Shift+D / Cmd+Shift+D)
2. Select configuration from dropdown:
   - "Debug React App" for frontend
   - "Debug Backend Server" for backend
   - "Debug Full Stack" for both
3. Press F5 or click the green play button

#### Method 2: Browser DevTools (Recommended for Frontend)
1. Open Chrome and navigate to: http://localhost:3001
2. Open DevTools (F12)
3. Go to Sources tab
4. The `debugger;` statements will automatically pause execution

### 🔍 Debugging Features Added:

#### Breakpoints Added:
- **Polling Status Check**: Pauses when checking session status
- **Login Detection**: Pauses when login is detected and scraping starts
- **Scraping Errors**: Pauses when scraping fails

#### Enhanced Logging:
- All API calls are logged with 🔍 [DEBUG] prefix
- Session data is fully logged for inspection
- Error details are captured and logged

### 📊 Debug Information Available:

When debugger pauses, you can inspect:
- `sessionData` - Full session object from backend
- `sessionData.status` - Current scraping status
- `sessionData.holdings` - Scraped holdings data (if available)
- `pollCount` - Number of polling attempts
- `sessionId` - Unique session identifier

### 🛠 VS Code Debug Features:

1. **Breakpoints**: Click line numbers to add/remove breakpoints
2. **Watch Variables**: Add variables to watch panel
3. **Call Stack**: See function call hierarchy
4. **Debug Console**: Execute JavaScript in current context
5. **Step Controls**: Step Over (F10), Step Into (F11), Step Out (Shift+F11)

### 🌐 Browser DevTools Features:

1. **Console**: View all debug logs and execute JavaScript
2. **Network**: Monitor API calls to backend
3. **Sources**: Set breakpoints and step through code
4. **Application**: Inspect localStorage, sessionStorage, cookies

### 📝 Common Debug Scenarios:

#### 1. Scraping Stuck After Login:
- Check if `sessionData.status` changes from 'logged_in' to 'scraping'
- Verify `scrapingAPI.scrapeData()` call completes successfully
- Monitor backend logs for scraping process

#### 2. Polling Issues:
- Watch `pollCount` to see how many attempts have been made
- Check if `sessionData.status` is updating correctly
- Verify API responses in Network tab

#### 3. Error Handling:
- Breakpoints trigger on all error conditions
- Error objects are fully logged with stack traces
- Check both frontend and backend error logs

### 🎯 Quick Debug Commands:

Use these in the Debug Console or Browser Console:
```javascript
// Check current session
console.log(session);

// Check current step
console.log(step);

// Check form data
console.log(formData);

// Manual API call test
scrapingAPI.getSession('your-session-id').then(console.log);
```

### 🔄 Restart Debugging:
- Press Ctrl+Shift+F5 (Cmd+Shift+F5) to restart debug session
- Or use "Restart" button in debug toolbar

## 🚨 Debugging is now active! 
Open http://localhost:3001 in Chrome and test the scraping functionality. The debugger will pause at key points for inspection.
