import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Config from './pages/Config';

const Sidebar = () => {
  const location = useLocation();
  return (
    <div className="sidebar">
      <Link to="/" className="brand">
        🤖 Robot Scraper
      </Link>
      <div className="nav-links">
        <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          Tableau de bord
        </Link>
        <Link to="/config" className={`nav-item ${location.pathname === '/config' ? 'active' : ''}`}>
          <Settings size={20} />
          Configuration
        </Link>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/config" element={<Config />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
