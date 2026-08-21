import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Mail, Briefcase, Calendar, Shield, Edit2, Save, X, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:8080/api';

export default function Profile() {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // États pour l'édition
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE}/auth/me`);
      setProfile(res.data);
      setFormData({
        nom: res.data.nom,
        prenom: res.data.prenom,
        email: res.data.email,
        poste: res.data.poste || '',
        motDePasse: '' // champ vide par défaut
      });
    } catch (error) {
      console.error('Erreur de chargement du profil', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await axios.put(`${API_BASE}/auth/me`, formData);
      setSuccess('Profil mis à jour avec succès.');
      setIsEditing(false);
      
      // Recharger les infos depuis le backend
      await fetchProfile();

      // (Optionnel) Mettre à jour le contexte global
      // Note: le JWT n'est pas modifié ici, mais si tu as une fonction updateUser tu pourrais l'appeler.
      
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la mise à jour du profil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Chargement du profil...</div>;
  }

  if (!profile) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>Erreur : Impossible de charger le profil.</div>;
  }

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <User size={28} color="#3b82f6" />
          Mon Profil
        </h2>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)} 
            className="btn btn-outline" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white' }}
          >
            <Edit2 size={16} /> Modifier
          </button>
        )}
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #4ade80', color: '#15803d', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          {success}
        </div>
      )}
      
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700 }}>
            {profile.prenom?.[0]?.toUpperCase()}{profile.nom?.[0]?.toUpperCase()}
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.4rem', color: '#0f172a' }}>{profile.prenom} {profile.nom}</h3>
            <span style={{ color: '#64748b', fontSize: '0.95rem' }}>@{profile.nomUtilisateur}</span>
          </div>
        </div>

        {!isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Mail size={20} color="#94a3b8" />
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Email</div>
                <div style={{ color: '#334155' }}>{profile.email}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Briefcase size={20} color="#94a3b8" />
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Poste / Fonction</div>
                <div style={{ color: '#334155' }}>{profile.poste || 'Non renseigné'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Shield size={20} color="#94a3b8" />
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Rôles et Accès</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {(profile.roles || []).map(r => (
                    <span key={r} style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: r === 'ADMIN' ? '#fef3c7' : '#eff6ff', color: r === 'ADMIN' ? '#92400e' : '#1d4ed8' }}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Calendar size={20} color="#94a3b8" />
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Membre depuis le</div>
                <div style={{ color: '#334155' }}>
                  {profile.dateCreation ? new Date(profile.dateCreation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Prénom</label>
                <input 
                  type="text" 
                  value={formData.prenom} 
                  onChange={e => setFormData({...formData, prenom: e.target.value})} 
                  required 
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Nom</label>
                <input 
                  type="text" 
                  value={formData.nom} 
                  onChange={e => setFormData({...formData, nom: e.target.value})} 
                  required 
                  className="form-control"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="#94a3b8" style={{ position: 'absolute', top: 11, left: 12 }} />
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  required 
                  className="form-control"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Poste / Fonction</label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={18} color="#94a3b8" style={{ position: 'absolute', top: 11, left: 12 }} />
                <input 
                  type="text" 
                  value={formData.poste} 
                  onChange={e => setFormData({...formData, poste: e.target.value})} 
                  className="form-control"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Ex: Acheteur public, Ingénieur..."
                />
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }} />

            <div className="form-group">
              <label>Nouveau mot de passe <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Laisser vide pour ne pas modifier)</span></label>
              <div style={{ position: 'relative' }}>
                <Key size={18} color="#94a3b8" style={{ position: 'absolute', top: 11, left: 12 }} />
                <input 
                  type="password" 
                  value={formData.motDePasse} 
                  onChange={e => setFormData({...formData, motDePasse: e.target.value})} 
                  className="form-control"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="••••••••"
                  minLength="6"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setIsEditing(false)} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <X size={16} /> Annuler
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
