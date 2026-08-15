import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Mail, FileText, CheckCircle2, AlertCircle, X, FolderOpen } from 'lucide-react';

const API_BASE = 'http://localhost:8080/api';

export default function Dashboard() {
  const [marches, setMarches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState(null);
  
  // States pour la lecture des documents
  const [selectedMarche, setSelectedMarche] = useState(null);
  const [viewDocument, setViewDocument] = useState(null);

  const fetchMarches = async () => {
    try {
      const response = await axios.get(`${API_BASE}/marches`);
      setMarches(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des marchés", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarches();
  }, []);

  const runScraper = async () => {
    setAlertMessage({ type: 'info', text: 'Extraction en cours, veuillez patienter (le robot navigue sur le portail)...' });
    try {
      await axios.post(`${API_BASE}/run-scraper`);
      setAlertMessage({ type: 'success', text: 'Extraction terminée ! Actualisation du tableau de bord dans 3 secondes...' });
      setTimeout(() => {
        fetchMarches();
        setAlertMessage(null);
      }, 3000);
    } catch (e) {
      setAlertMessage({ type: 'error', text: 'Erreur lors du démarrage du scraper.' });
    }
  };

  const runAlerts = async () => {
    setAlertMessage({ type: 'info', text: 'Vérification des alertes email démarrée sur le serveur.' });
    try {
      await axios.post(`${API_BASE}/run-alerts`);
    } catch (e) {
      setAlertMessage({ type: 'error', text: 'Erreur de connexion au serveur.' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Liste des Appels d'Offres Extraits</h2>
          <p className="text-muted">Consultez et suivez les marchés publics enregistrés par le robot.</p>
        </div>
        <div className="page-header-actions">
          <button onClick={runScraper} className="btn btn-outline">
            <Play size={18} /> Lancer l'Extraction
          </button>
          <button onClick={runAlerts} className="btn btn-outline">
            <Mail size={18} /> Tester les Alertes
          </button>
        </div>
      </div>

      {alertMessage && (
        <div className={`alert ${alertMessage.type === 'error' ? 'alert-danger' : 'alert-info'}`}>
          {alertMessage.type === 'info' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {alertMessage.text}
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement des données...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Statut</th>
                <th>Acheteur</th>
                <th>Objet</th>
                <th>Date Limite</th>
                <th>Lieu</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {marches.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem 0' }} className="text-muted">
                    Aucun marché trouvé dans la base de données.
                  </td>
                </tr>
              ) : (
                marches.map((marche) => (
                  <tr key={marche.id}>
                    <td className="text-bold">{marche.reference}</td>
                    <td>
                      <span className={`badge ${marche.statut === 'Ouvert' ? 'badge-success' : 'badge-secondary'}`}>
                        {marche.statut}
                      </span>
                    </td>
                    <td>{marche.acheteurPublic}</td>
                    <td style={{ maxWidth: '400px', whiteSpace: 'normal', lineHeight: '1.4' }}>
                      {marche.objet}
                    </td>
                    <td>{formatDate(marche.dateLimiteRemise)}</td>
                    <td>{marche.lieuExecution}</td>
                    <td>
                      <button 
                        onClick={() => setSelectedMarche(marche)} 
                        className="btn btn-sm btn-outline"
                        style={{ marginRight: '0.5rem', marginBottom: '0.5rem' }}
                        title="Consulter les documents extraits"
                      >
                        <FolderOpen size={16} /> Fichiers ({marche.nomsFichiers ? marche.nomsFichiers.length : 0})
                      </button>
                      <a href={marche.urlDce} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary">
                        <FileText size={16} /> Portail
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modale de visualisation des documents */}
      {selectedMarche && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-md)', width: '90%', maxWidth: '1000px', height: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3>Documents du marché {selectedMarche.reference}</h3>
              <button onClick={() => { setSelectedMarche(null); setViewDocument(null); }} className="btn btn-outline" style={{ border: 'none', background: '#f1f5f9' }}><X size={20} /></button>
            </div>
            
            {!viewDocument ? (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {selectedMarche.nomsFichiers && selectedMarche.nomsFichiers.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem' }}>
                    {selectedMarche.nomsFichiers.map((fichier, idx) => {
                      const lower = fichier.toLowerCase();
                      const isPdf = lower.endsWith('.pdf');
                      const isWord = lower.endsWith('.doc') || lower.endsWith('.docx');
                      const isExcel = lower.endsWith('.xls') || lower.endsWith('.xlsx');
                      
                      let bgColor = '#f1f5f9';
                      let iconColor = '#64748b';
                      if (isPdf) { bgColor = '#fee2e2'; iconColor = '#ef4444'; }
                      else if (isWord) { bgColor = '#e0f2fe'; iconColor = '#0ea5e9'; }
                      else if (isExcel) { bgColor = '#dcfce7'; iconColor = '#22c55e'; }

                      return (
                        <div 
                          key={idx} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            padding: '1rem', 
                            backgroundColor: '#f8fafc', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '0.75rem',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => { 
                            e.currentTarget.style.borderColor = 'var(--primary-color)'; 
                            e.currentTarget.style.backgroundColor = '#f1f5f9'; 
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
                          }}
                          onMouseLeave={(e) => { 
                            e.currentTarget.style.borderColor = '#e2e8f0'; 
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          onClick={() => setViewDocument(fichier)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                            <div style={{ 
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: '44px', height: '44px', borderRadius: '10px',
                              backgroundColor: bgColor,
                              color: iconColor,
                              flexShrink: 0
                            }}>
                              <FileText size={22} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem', wordBreak: 'break-word', lineHeight: '1.4' }}>
                                {fichier}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                                Document officiel du DCE
                              </span>
                            </div>
                          </div>
                          <div style={{ paddingLeft: '1rem' }}>
                            <button className="btn btn-outline btn-sm" style={{ whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                              Ouvrir
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <FolderOpen size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                    <p>Le robot n'a pas encore téléchargé les documents pour ce marché ou aucun fichier PDF/Word n'a été trouvé.</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <button onClick={() => setViewDocument(null)} className="btn btn-outline btn-sm">← Retour à la liste des fichiers</button>
                </div>
                <iframe 
                  src={`${API_BASE}/documents/view?reference=${encodeURIComponent(selectedMarche.reference)}&nomFichier=${encodeURIComponent(viewDocument)}`} 
                  style={{ flex: 1, width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
                  title="Visualiseur Document"
                />
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
