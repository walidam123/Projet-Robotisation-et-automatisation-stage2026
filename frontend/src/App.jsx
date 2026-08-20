import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Settings, CalendarDays, Users, LogOut, ChevronRight } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Config from './pages/Config';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import GestionUtilisateurs from './pages/admin/GestionUtilisateurs';

// Route protégée - redirige vers /login si non connecté
function ProtectedRoute({ children, requireRole }) {
  const { user, loading, hasRole } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#94a3b8' }}>Chargement...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requireRole && !hasRole(requireRole)) return <Navigate to="/" replace />;
  return children;
}

const Sidebar = () => {
  const location = useLocation();
  const { user, logout, isMembre, isAdmin } = useAuth();
  const active = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="sidebar">
      <Link to={isMembre() ? '/' : '/admin/utilisateurs'} className="brand">
        🤖 Robot Scraper
      </Link>

      <div className="nav-links">
        {/* Navigation MEMBRE */}
        {isMembre() && (
          <>
            <Link to="/" className={`nav-item ${active('/')}`}>
              <CalendarDays size={20} /> Accueil
            </Link>
            <Link to="/marches" className={`nav-item ${active('/marches')}`}>
              <LayoutDashboard size={20} /> Appels d'Offres
            </Link>
            <Link to="/config" className={`nav-item ${active('/config')}`}>
              <Settings size={20} /> Configuration
            </Link>
          </>
        )}

        {/* Navigation ADMIN */}
        {isAdmin() && (
          <Link to="/admin/utilisateurs" className={`nav-item ${active('/admin/utilisateurs')}`}>
            <Users size={20} /> Gestion Utilisateurs
          </Link>
        )}
      </div>

      {/* Profil utilisateur + déconnexion */}
      {user && (
        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0', marginBottom: '0.5rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
              {user.prenom?.[0]?.toUpperCase()}{user.nom?.[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.prenom} {user.nom}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem' }}>
                {(user.roles || []).map(r => r === 'ADMIN' ? 'Admin' : 'Membre').join(' & ')}
              </div>
            </div>
          </div>
          <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(239,68,68,0.15)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      )}
    </div>
  );
};

function AppLayout({ children }) {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      {/* Routes publiques */}
      <Route path="/login" element={user ? <Navigate to={user.roles?.includes('MEMBRE') ? '/' : '/admin/utilisateurs'} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

      {/* Routes protégées MEMBRE */}
      <Route path="/" element={<ProtectedRoute requireRole="MEMBRE"><AppLayout><Home /></AppLayout></ProtectedRoute>} />
      <Route path="/marches" element={<ProtectedRoute requireRole="MEMBRE"><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/config" element={<ProtectedRoute requireRole="MEMBRE"><AppLayout><Config /></AppLayout></ProtectedRoute>} />

      {/* Routes protégées ADMIN */}
      <Route path="/admin/utilisateurs" element={<ProtectedRoute requireRole="ADMIN"><AppLayout><GestionUtilisateurs /></AppLayout></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
