import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

const API_BASE = 'http://localhost:8080/api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', nomUtilisateur: '', poste: '', motDePasse: '', confirmation: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.motDePasse !== form.confirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (form.motDePasse.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        nomUtilisateur: form.nomUtilisateur,
        poste: form.poste,
        motDePasse: form.motDePasse,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue lors de l\'inscription.');
    } finally {
      setLoading(false);
    }
  };

  const field = (label, key, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        required={key !== 'poste'}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '0.65rem 1rem', borderRadius: '8px',
          border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box'
        }}
        onFocus={e => e.target.style.borderColor = '#3b82f6'}
        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
      />
    </div>
  );

  if (success) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #e0e7ff 100%)'
      }}>
        <div style={{
          backgroundColor: 'white', borderRadius: '16px', padding: '3rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)', maxWidth: '420px', textAlign: 'center'
        }}>
          <CheckCircle size={56} color="#10b981" style={{ marginBottom: '1rem' }} />
          <h2 style={{ color: '#1e293b', marginBottom: '0.75rem' }}>Compte créé avec succès !</h2>
          <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Votre compte a bien été créé. Un administrateur doit l'activer avant que vous puissiez vous connecter.
          </p>
          <button onClick={() => navigate('/login')} style={{
            padding: '0.7rem 2rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', fontWeight: 700
          }}>
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #e0e7ff 100%)', padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '16px', padding: '2.5rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)', width: '100%', maxWidth: '480px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Créer un compte</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>Veille et Automatisation des Appels d'Offres marocains</p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
            padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem'
          }}>
            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: '#b91c1c', margin: 0, fontSize: '0.85rem' }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            {field('Prénom', 'prenom', 'text', 'Votre prénom')}
            {field('Nom', 'nom', 'text', 'Votre nom')}
          </div>
          {field('Email', 'email', 'email', 'votre@email.com')}
          {field('Nom d\'utilisateur', 'nomUtilisateur', 'text', 'nomutilisateur123')}
          {field('Poste (optionnel)', 'poste', 'text', 'Ex: Chargé de marchés')}

          {/* Mot de passe avec affichage */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.motDePasse}
                onChange={e => setForm({ ...form, motDePasse: e.target.value })}
                required minLength={6} placeholder="Minimum 6 caractères"
                style={{ width: '100%', padding: '0.65rem 2.5rem 0.65rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {field('Confirmer le mot de passe', 'confirmation', showPassword ? 'text' : 'password', '••••••••')}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: loading ? '#93c5fd' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white', fontWeight: 700, fontSize: '0.9rem', marginTop: '0.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
          }}>
            <UserPlus size={17} />
            {loading ? 'Création en cours...' : 'Créer mon compte'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
          Déjà un compte ?{' '}
          <Link to="/login" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
