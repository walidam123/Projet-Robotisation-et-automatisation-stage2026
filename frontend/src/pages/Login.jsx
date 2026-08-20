import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

const API_BASE = 'http://localhost:8080/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifiant: '', motDePasse: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, form);
      login(res.data.token, {
        nomUtilisateur: res.data.nomUtilisateur,
        prenom: res.data.prenom,
        nom: res.data.nom,
        roles: res.data.roles,
        configId: res.data.configId,
      });
      // Redirection selon le rôle
      const roles = res.data.roles || [];
      if (roles.includes('MEMBRE')) {
        navigate('/');
      } else if (roles.includes('ADMIN')) {
        navigate('/admin/utilisateurs');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #e0e7ff 100%)'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '16px', padding: '2.5rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)', width: '100%', maxWidth: '420px'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🤖</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Robot Scraper</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>Plateforme de veille des marchés publics</p>
        </div>

        {/* Erreur */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
            padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem'
          }}>
            <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: '#b91c1c', margin: 0, fontSize: '0.88rem', lineHeight: 1.4 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
              Email ou nom d'utilisateur
            </label>
            <input
              type="text"
              value={form.identifiant}
              onChange={e => setForm({ ...form, identifiant: e.target.value })}
              required
              placeholder="email@exemple.com ou nomutilisateur"
              style={{
                width: '100%', padding: '0.7rem 1rem', borderRadius: '8px',
                border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none',
                transition: 'border-color 0.2s', boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.motDePasse}
                onChange={e => setForm({ ...form, motDePasse: e.target.value })}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '0.7rem 2.5rem 0.7rem 1rem', borderRadius: '8px',
                  border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none',
                  transition: 'border-color 0.2s', boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: loading ? '#93c5fd' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white', fontWeight: 700, fontSize: '0.95rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            transition: 'all 0.2s'
          }}>
            <LogIn size={18} />
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem', color: '#64748b' }}>
          Pas encore de compte ?{' '}
          <Link to="/register" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
            Créer un compte
          </Link>
        </div>
      </div>
    </div>
  );
}
