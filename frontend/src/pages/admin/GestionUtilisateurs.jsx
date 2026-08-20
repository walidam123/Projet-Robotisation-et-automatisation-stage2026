import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Search, UserPlus, Edit2, Trash2, CheckCircle, XCircle, Shield, User, ChevronLeft, ChevronRight, X } from 'lucide-react';

const API_BASE = 'http://localhost:8080/api';

const ROLE_LABELS = { ADMIN: 'Admin', MEMBRE: 'Membre' };
const ROLE_COLORS = { ADMIN: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' }, MEMBRE: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' } };

export default function GestionUtilisateurs() {
  const { getAuthHeader } = useAuth();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {type: 'create'|'edit'|'delete', user?}
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/users`, {
        headers: getAuthHeader(),
        params: { search, page, size: 10 }
      });
      setUtilisateurs(res.data.utilisateurs);
      setTotalPages(res.data.totalPages);
      setTotalElements(res.data.totalElements);
    } catch (err) {
      console.error('Erreur chargement utilisateurs', err);
    } finally {
      setLoading(false);
    }
  }, [search, page, getAuthHeader]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => { setPage(0); fetchUsers(); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleActiverDesactiver = async (user) => {
    const endpoint = user.actif ? 'desactiver' : 'activer';
    await axios.patch(`${API_BASE}/admin/users/${user.id}/${endpoint}`, {}, { headers: getAuthHeader() });
    fetchUsers();
  };

  const handleSupprimer = async () => {
    setFormLoading(true);
    await axios.delete(`${API_BASE}/admin/users/${modal.user.id}`, { headers: getAuthHeader() });
    setModal(null);
    fetchUsers();
    setFormLoading(false);
  };

  const handleSave = async () => {
    setFormError('');
    setFormLoading(true);
    try {
      if (modal.type === 'create') {
        await axios.post(`${API_BASE}/admin/users`, formData, { headers: getAuthHeader() });
      } else {
        await axios.put(`${API_BASE}/admin/users/${modal.user.id}`, formData, { headers: getAuthHeader() });
      }
      setModal(null);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erreur lors de la sauvegarde.');
    } finally {
      setFormLoading(false);
    }
  };

  const openCreate = () => {
    setFormData({ nom: '', prenom: '', email: '', nomUtilisateur: '', poste: '', motDePasse: '', roles: ['MEMBRE'] });
    setFormError('');
    setModal({ type: 'create' });
  };

  const openEdit = (user) => {
    setFormData({ nom: user.nom, prenom: user.prenom, email: user.email, nomUtilisateur: user.nomUtilisateur, poste: user.poste || '', roles: [...(user.roles || [])] });
    setFormError('');
    setModal({ type: 'edit', user });
  };

  const toggleRole = (role) => {
    const current = formData.roles || [];
    setFormData({ ...formData, roles: current.includes(role) ? current.filter(r => r !== role) : [...current, role] });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h2>Gestion des Utilisateurs</h2>
          <p className="text-muted">{totalElements} utilisateur(s) au total</p>
        </div>
        <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          <UserPlus size={18} /> Nouvel utilisateur
        </button>
      </div>

      {/* Barre de recherche */}
      <div style={{ position: 'relative', maxWidth: '400px' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, prénom ou nom d'utilisateur..."
          style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.2rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Tableau */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Utilisateur', 'Email', 'Poste', 'Rôles', 'Statut', 'Actions'].map(h => (
                <th key={h} style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Chargement...</td></tr>
            ) : utilisateurs.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Aucun utilisateur trouvé.</td></tr>
            ) : utilisateurs.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ padding: '0.8rem 1rem' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{user.prenom} {user.nom}</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>@{user.nomUtilisateur}</div>
                </td>
                <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: '#64748b' }}>{user.email}</td>
                <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: '#64748b' }}>{user.poste || '—'}</td>
                <td style={{ padding: '0.8rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {(user.roles || []).map(r => (
                      <span key={r} style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', backgroundColor: ROLE_COLORS[r]?.bg, color: ROLE_COLORS[r]?.color, border: `1px solid ${ROLE_COLORS[r]?.border}` }}>{ROLE_LABELS[r] || r}</span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '0.8rem 1rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px', backgroundColor: user.actif ? '#f0fdf4' : '#fef2f2', color: user.actif ? '#16a34a' : '#dc2626', border: `1px solid ${user.actif ? '#bbf7d0' : '#fecaca'}` }}>
                    {user.actif ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {user.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td style={{ padding: '0.8rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={() => handleActiverDesactiver(user)} title={user.actif ? 'Désactiver' : 'Activer'}
                      style={{ padding: '0.4rem', borderRadius: '6px', border: `1px solid ${user.actif ? '#fecaca' : '#bbf7d0'}`, backgroundColor: user.actif ? '#fef2f2' : '#f0fdf4', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      {user.actif ? <XCircle size={15} color="#ef4444" /> : <CheckCircle size={15} color="#16a34a" />}
                    </button>
                    <button onClick={() => openEdit(user)} title="Modifier"
                      style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Edit2 size={15} color="#3b82f6" />
                    </button>
                    <button onClick={() => { setModal({ type: 'delete', user }); }} title="Supprimer"
                      style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={15} color="#ef4444" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Page {page + 1} sur {totalPages}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={{ padding: '0.4rem 0.7rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                style={{ padding: '0.4rem 0.7rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.5 : 1, display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Créer / Modifier */}
      {modal && modal.type !== 'delete' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '2rem', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>{modal.type === 'create' ? 'Nouvel utilisateur' : 'Modifier l\'utilisateur'}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>

            {formError && <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.7rem 1rem', marginBottom: '1rem', color: '#b91c1c', fontSize: '0.85rem' }}>{formError}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1rem' }}>
              {[['Prénom', 'prenom'], ['Nom', 'nom'], ['Email', 'email'], ['Nom d\'utilisateur', 'nomUtilisateur'], ['Poste', 'poste']].map(([label, key]) => (
                <div key={key} style={{ gridColumn: key === 'email' || key === 'poste' ? 'span 2' : 'auto' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>{label}</label>
                  <input type="text" value={formData[key] || ''} onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              {modal.type === 'create' && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Mot de passe</label>
                  <input type="password" value={formData.motDePasse || ''} onChange={e => setFormData({ ...formData, motDePasse: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              )}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Rôles</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {['ADMIN', 'MEMBRE'].map(role => (
                    <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', border: `1px solid ${(formData.roles || []).includes(role) ? ROLE_COLORS[role].border : '#e2e8f0'}`, backgroundColor: (formData.roles || []).includes(role) ? ROLE_COLORS[role].bg : 'white' }}>
                      <input type="checkbox" checked={(formData.roles || []).includes(role)} onChange={() => toggleRole(role)} style={{ display: 'none' }} />
                      {role === 'ADMIN' ? <Shield size={14} color={ROLE_COLORS[role].color} /> : <User size={14} color={ROLE_COLORS[role].color} />}
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: ROLE_COLORS[role].color }}>{ROLE_LABELS[role]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>Annuler</button>
              <button onClick={handleSave} disabled={formLoading} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                {formLoading ? 'Sauvegarde...' : modal.type === 'create' ? 'Créer' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression */}
      {modal?.type === 'delete' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '2rem', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Trash2 size={24} color="#ef4444" />
            </div>
            <h3 style={{ color: '#1e293b', margin: '0 0 0.5rem' }}>Supprimer l'utilisateur ?</h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 1.5rem' }}>
              Cette action supprimera définitivement <strong>{modal.user.prenom} {modal.user.nom}</strong>, sa configuration robot et tous ses appels d'offres.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => setModal(null)} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
              <button onClick={handleSupprimer} disabled={formLoading} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                {formLoading ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
