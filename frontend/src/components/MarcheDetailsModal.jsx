import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { X, FileText, FolderOpen, Loader } from 'lucide-react';
import * as docx from 'docx-preview';

const API_BASE = 'http://localhost:8080/api';

export default function MarcheDetailsModal({ selectedMarche, onClose }) {
  const [viewDocument, setViewDocument] = useState(null);
  const [loadingWord, setLoadingWord] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null); // Nouveau state pour l'URL du blob PDF
  const wordContainerRef = useRef(null);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getModificationDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    d.setDate(d.getDate() - 7);
    return formatDate(d);
  };

  const handleOpenDocument = async (fichier) => {
    setViewDocument(fichier);
    setPdfUrl(null); // Réinitialiser
    const lower = fichier.toLowerCase();
    
    if (lower.endsWith('.doc') || lower.endsWith('.docx') || lower.endsWith('.pdf')) {
      setLoadingWord(true);
      if (wordContainerRef.current) wordContainerRef.current.innerHTML = '';
      
      try {
        const url = `${API_BASE}/documents/view?reference=${encodeURIComponent(selectedMarche.reference)}&nomFichier=${encodeURIComponent(fichier)}`;
        // L'utilisation d'axios permet d'inclure automatiquement le JWT via l'intercepteur
        const response = await axios.get(url, { responseType: 'blob' });
        
        if (lower.endsWith('.pdf')) {
          // Créer une URL Blob pour le PDF (évite le problème X-Frame-Options et 403 dans l'iframe)
          const fileURL = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
          setPdfUrl(fileURL);
          setLoadingWord(false);
        } else {
          // Rendu Word (déjà existant et fonctionnel)
          setTimeout(async () => {
            if (wordContainerRef.current) {
              try {
                await docx.renderAsync(response.data, wordContainerRef.current, null, {
                  inWrapper: true,
                  ignoreWidth: false,
                  ignoreHeight: false,
                  breakPages: true
                });
              } catch(e) {
                wordContainerRef.current.innerHTML = "<div style='color:red; text-align:center; padding: 2rem;'>Impossible de prévisualiser ce fichier Word. Veuillez le télécharger.</div>";
              }
            }
            setLoadingWord(false);
          }, 100);
        }
      } catch (err) {
        if (lower.endsWith('.pdf')) {
          setPdfUrl(null); // Géré plus bas
        } else if (wordContainerRef.current) {
          wordContainerRef.current.innerHTML = "<div style='color:red; text-align:center; padding: 2rem;'>Erreur lors du téléchargement du fichier.</div>";
        }
        setLoadingWord(false);
      }
    }
  };

    useEffect(() => {
      // Clean up blob url when component unmounts or pdfUrl changes
      return () => {
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
      };
    }, [pdfUrl]);

  if (!selectedMarche) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
       <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-md)', width: '95%', maxWidth: '1200px', height: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <h3>Détails du marché {selectedMarche.reference}</h3>
          <button onClick={() => { setViewDocument(null); onClose(); }} className="btn btn-outline" style={{ border: 'none', background: '#f1f5f9' }}><X size={20} /></button>
        </div>
        
        {!viewDocument ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Informations Générales</h4>
                <p style={{ marginBottom: '0.5rem' }}><strong>Acheteur :</strong> {selectedMarche.acheteurPublic}</p>
                <p style={{ marginBottom: '0.5rem' }}><strong>Lieu :</strong> {selectedMarche.lieuExecution}</p>
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong>Estimation des coûts :</strong> 
                  {selectedMarche.estimationCout ? (
                    <span style={{ fontWeight: 'bold', color: '#16a34a', marginLeft: '0.5rem', fontSize: '1rem' }}>
                      {selectedMarche.estimationCout}
                    </span>
                  ) : (
                    <span style={{ marginLeft: '0.5rem', color: '#94a3b8', fontSize: '0.88rem' }}>
                      Non disponible — 
                      {selectedMarche.nomsFichiers && selectedMarche.nomsFichiers.some(f => 
                          f.toLowerCase().includes('avis') || f.toLowerCase().startsWith('af')
                      ) ? (
                        <button 
                          onClick={() => handleOpenDocument(
                            selectedMarche.nomsFichiers.find(f => 
                              f.toLowerCase().includes('avis') || f.toLowerCase().startsWith('af')
                            )
                          )}
                          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.88rem', padding: '0 0.25rem' }}
                        >
                          Voir l'Avis d'appel d'offres
                        </button>
                      ) : selectedMarche.urlDce ? (
                        <a href={selectedMarche.urlDce} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', marginLeft: '0.25rem' }}>
                          Visiter l'Avis sur le portail
                        </a>
                      ) : ' Veuillez visiter l\'Avis'}
                    </span>
                  )}
                </p>
                <p style={{ marginBottom: '0.5rem' }}><strong>Objet :</strong> <br/> <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{selectedMarche.objet}</span></p>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Calendrier et Liens</h4>
                <p style={{ marginBottom: '0.5rem' }}><strong>Date limite de remise :</strong> {formatDate(selectedMarche.dateLimiteRemise)}</p>
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong>Date limite de modification :</strong> 
                  <span style={{ fontWeight: 'bold', color: '#ea580c', marginLeft: '0.5rem' }}>
                    {getModificationDate(selectedMarche.dateLimiteRemise)} 
                  </span>
                </p>
                <div style={{ marginTop: '1.5rem' }}>
                  <a href={selectedMarche.urlDce} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <FileText size={16} /> Ouvrir sur le Portail des Marchés Publics
                  </a>
                </div>
              </div>
            </div>

            <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              Documents du DCE extraits ({selectedMarche.nomsFichiers ? selectedMarche.nomsFichiers.length : 0})
            </h4>
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
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', 
                        backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem',
                        transition: 'all 0.2s ease', cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => { 
                        e.currentTarget.style.borderColor = 'var(--primary-color)'; 
                        e.currentTarget.style.backgroundColor = '#f1f5f9'; 
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                      }}
                      onMouseLeave={(e) => { 
                        e.currentTarget.style.borderColor = '#e2e8f0'; 
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      onClick={() => handleOpenDocument(fichier)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                        <div style={{ 
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '44px', height: '44px', borderRadius: '10px',
                          backgroundColor: bgColor, color: iconColor, flexShrink: 0
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setViewDocument(null)} className="btn btn-outline btn-sm">← Retour à la liste des fichiers</button>
              {viewDocument.toLowerCase().endsWith('.doc') || viewDocument.toLowerCase().endsWith('.docx') ? (
                <a 
                  href={`${API_BASE}/documents/view?reference=${encodeURIComponent(selectedMarche.reference)}&nomFichier=${encodeURIComponent(viewDocument)}`} 
                  download 
                  className="btn btn-primary btn-sm"
                >
                  Télécharger le fichier original
                </a>
              ) : null}
            </div>
            
            {viewDocument.toLowerCase().endsWith('.doc') || viewDocument.toLowerCase().endsWith('.docx') ? (
              <div className="word-scroll-container" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: '#e2e8f0' }}>
                <style>{`
                  .word-scroll-container::-webkit-scrollbar { width: 14px; height: 14px; }
                  .word-scroll-container::-webkit-scrollbar-track { background: #e2e8f0; border-radius: 8px; }
                  .word-scroll-container::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 8px; border: 3px solid #e2e8f0; }
                  .word-scroll-container::-webkit-scrollbar-thumb:hover { background: #64748b; }
                  .docx-wrapper { background: transparent !important; padding: 2rem 1rem !important; display: flex; flex-direction: column; align-items: center; }
                  .docx-wrapper > section.docx { box-shadow: 0 4px 15px rgba(0,0,0,0.15) !important; border-radius: 4px; margin-bottom: 2rem; background: white; }
                `}</style>
                {loadingWord && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', color: 'var(--text-secondary)' }}>
                    <Loader size={32} style={{ marginBottom: '1rem' }} className="spin" />
                    <p>Chargement du visualiseur Word avancé...</p>
                  </div>
                )}
                <div ref={wordContainerRef} style={{ display: loadingWord ? 'none' : 'block' }} />
              </div>
            ) : (
              <>
                {loadingWord ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', color: 'var(--text-secondary)' }}>
                    <Loader size={32} style={{ marginBottom: '1rem' }} className="spin" />
                    <p>Téléchargement et préparation du PDF...</p>
                  </div>
                ) : pdfUrl ? (
                  <iframe 
                    src={pdfUrl}
                    style={{ flex: 1, width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
                    title="Visualiseur Document PDF"
                  />
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', color: '#ef4444' }}>
                    <p>Impossible de prévisualiser ce fichier PDF.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
