import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { Views } from './pages/Views';
import { Sync } from './pages/Sync';
import { InteractionTest } from './components/InteractionTest';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="views" element={<Views />} />
          <Route path="analytics" element={<div className="p-8 text-center">Analytics page coming soon...</div>} />
          <Route path="sync" element={<Sync />} />
          <Route path="test" element={<InteractionTest />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
