import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Bell, AlertTriangle, AlertCircle, CheckCircle, X, FileText, FolderOpen, ExternalLink, Clock, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MarcheDetailsModal from '../components/MarcheDetailsModal';

const API_BASE = 'http://localhost:8080/api';

const locales = { 'fr': fr };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const messages = {
  allDay: 'Journée',
  previous: '‹ Précédent',
  next: 'Suivant ›',
  today: "Aujourd'hui",
  month: 'Mois',
  week: 'Semaine',
  day: 'Jour',
  agenda: 'Planning',
  date: 'Date',
  time: 'Heure',
  event: 'Appel d\'offres',
  noEventsInRange: "Aucun appel d'offres pour cette période.",
};

// Couleurs dynamiques selon l'urgence de la date limite
function getEventColor(marche) {
  if (!marche.dateLimiteRemise) return { bg: '#6366f1', border: '#4f46e5' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateRemise = new Date(marche.dateLimiteRemise);
  dateRemise.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((dateRemise - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { bg: '#9ca3af', border: '#6b7280' }; // Expiré - gris
  if (diffDays <= 1) return { bg: '#ef4444', border: '#dc2626' }; // Urgent - rouge
  if (diffDays <= 7) return { bg: '#f59e0b', border: '#d97706' }; // Bientôt - orange
  return { bg: '#3b82f6', border: '#2563eb' }; // Normal - bleu
}

export default function Home() {
  const { user } = useAuth();
  const [marches, setMarches] = useState([]);
  const [selectedMarche, setSelectedMarche] = useState(null);
  const [previewMarche, setPreviewMarche] = useState(null); // Panneau latéral rapide
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');

  useEffect(() => { fetchMarches(); }, []);

  const fetchMarches = async () => {
    try {
      const response = await axios.get(`${API_BASE}/marches`);
      setMarches(response.data);
    } catch (error) {
      console.error("Erreur de chargement des marchés", error);
    } finally {
      setLoading(false);
    }
  };

  const events = marches
    .filter(m => m.dateLimiteRemise)
    .map(m => ({
      id: m.id,
      title: m.reference,
      start: new Date(m.dateLimiteRemise),
      end: new Date(m.dateLimiteRemise),
      allDay: true,
      resource: m,
    }));

  const handleSelectEvent = (event) => {
    setPreviewMarche(event.resource);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const alertes = marches.map(m => {
    if (!m.dateLimiteRemise || m.statut !== 'Ouvert') return null;
    const dateRemise = new Date(m.dateLimiteRemise);
    dateRemise.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dateRemise - today) / (1000 * 60 * 60 * 24));
    if (dateRemise >= today) {
      if (diffDays <= 1) return { type: 'danger', days: diffDays, marche: m };
      if (diffDays <= 7) return { type: 'warning', days: diffDays, marche: m };
    }
    return null;
  }).filter(Boolean).sort((a, b) => a.days - b.days);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      {/* CSS injecté pour personnaliser react-big-calendar */}
      <style>{`
        /* Toolbar */
        .rbc-toolbar {
          padding: 0 0 1rem 0;
          flex-wrap: wrap;
          gap: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 1rem;
        }
        .rbc-toolbar button {
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #475569;
          font-size: 0.85rem;
          font-weight: 500;
          padding: 6px 14px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .rbc-toolbar button:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #1e293b;
        }
        .rbc-toolbar button.rbc-active {
          background: #3b82f6 !important;
          border-color: #2563eb !important;
          color: white !important;
          box-shadow: 0 1px 3px rgba(59,130,246,0.4);
        }
        .rbc-toolbar-label {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1e293b;
          text-transform: capitalize;
        }
        /* En-têtes jours */
        .rbc-header {
          padding: 8px 6px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0 !important;
          background: #f8fafc;
        }
        /* Cellules du calendrier */
        .rbc-day-bg {
          border-color: #f1f5f9 !important;
          transition: background 0.1s;
        }
        .rbc-day-bg:hover { background: #fafbff; }
        .rbc-today { background: #eff6ff !important; }
        .rbc-off-range-bg { background: #fafafa; }
        /* Date numéro */
        .rbc-date-cell { padding: 4px 8px; }
        .rbc-date-cell a { color: #64748b; font-size: 0.85rem; font-weight: 500; }
        .rbc-now > a { color: #3b82f6 !important; font-weight: 700; }
        /* Événements */
        .rbc-event {
          border-radius: 6px !important;
          padding: 2px 8px !important;
          font-size: 0.78rem !important;
          font-weight: 600 !important;
          letter-spacing: 0.01em;
          box-shadow: 0 1px 2px rgba(0,0,0,0.12) !important;
          cursor: pointer !important;
        }
        .rbc-event:hover { opacity: 0.88; transform: translateY(-1px); }
        .rbc-event:focus { outline: none; box-shadow: 0 0 0 2px rgba(59,130,246,0.4) !important; }
        .rbc-show-more {
          color: #3b82f6;
          font-size: 0.78rem;
          font-weight: 600;
          background: #eff6ff;
          border-radius: 4px;
          padding: 1px 6px;
        }
        .rbc-show-more:hover { background: #dbeafe; }
        /* Popup */
        .rbc-overlay {
          border-radius: 10px !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15) !important;
          border: 1px solid #e2e8f0 !important;
        }
        .rbc-overlay-header {
          background: #f8fafc;
          border-radius: 10px 10px 0 0;
          font-weight: 700;
          color: #1e293b;
          border-bottom: 1px solid #e2e8f0;
          padding: 8px 12px;
        }
        /* Agenda */
        .rbc-agenda-view table.rbc-agenda-table { border-color: #f1f5f9; }
        .rbc-agenda-date-cell, .rbc-agenda-time-cell { color: #64748b; font-size: 0.85rem; }
        .rbc-agenda-event-cell { font-size: 0.9rem; font-weight: 500; color: #1e293b; cursor: pointer; }
        .rbc-agenda-event-cell:hover { color: #3b82f6; }
        /* Semaine / Jour */
        .rbc-time-view .rbc-header { background: #f8fafc; }
        .rbc-time-slot { font-size: 0.75rem; color: #94a3b8; }
        .rbc-current-time-indicator { background: #ef4444; }
      `}</style>

      <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {user && (
          <h1 style={{ fontSize: '1.6rem', color: '#1e293b', margin: '0 0 0.5rem 0' }}>
            Bonjour, {user.prenom} {user.nom}
          </h1>
        )}
        <div>
          <h2 style={{ fontSize: '1.2rem', color: '#475569', margin: 0 }}>Calendrier des extractions</h2>
          <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>{marches.length} appel{marches.length > 1 ? 's' : ''} d'offres • {alertes.length} alerte{alertes.length > 1 ? 's' : ''} urgente{alertes.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flex: 1 }}>
        
        {/* ============ PANNEAU GAUCHE ============ */}
        <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Alertes */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#1e293b', fontSize: '0.95rem', fontWeight: 700 }}>
              <Bell size={16} color="#3b82f6" /> Alertes urgentes
              {alertes.length > 0 && (
                <span style={{ marginLeft: 'auto', backgroundColor: '#ef4444', color: 'white', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px' }}>
                  {alertes.length}
                </span>
              )}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto' }}>
              {alertes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8' }}>
                  <CheckCircle size={28} style={{ margin: '0 auto 0.5rem', color: '#10b981', display: 'block' }} />
                  <p style={{ fontSize: '0.82rem' }}>Aucune alerte à J-7.</p>
                </div>
              ) : alertes.map((a, idx) => (
                <div key={idx} onClick={() => setPreviewMarche(a.marche)}
                  style={{
                    padding: '0.7rem 0.9rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
                    backgroundColor: a.type === 'danger' ? '#fef2f2' : '#fffbeb',
                    border: `1px solid ${a.type === 'danger' ? '#fecaca' : '#fde68a'}`,
                    borderLeft: `4px solid ${a.type === 'danger' ? '#ef4444' : '#f59e0b'}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateX(3px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                    {a.type === 'danger' ? <AlertTriangle size={13} color="#ef4444" /> : <AlertCircle size={13} color="#f59e0b" />}
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: a.type === 'danger' ? '#b91c1c' : '#b45309' }}>
                      {a.days === 0 ? "Expire aujourd'hui" : `J-${a.days}`}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 600, lineHeight: 1.3 }}>{a.marche.reference}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.marche.acheteurPublic}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Panneau détails rapide */}
          {previewMarche && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', padding: '1rem', position: 'relative' }}>
                <button onClick={() => setPreviewMarche(null)} style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={13} />
                </button>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Appel d'offres</div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.3 }}>{previewMarche.reference}</div>
              </div>
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <Building2 size={14} color="#64748b" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Acheteur</div>
                    <div style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 500 }}>{previewMarche.acheteurPublic}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <Clock size={14} color="#64748b" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date limite</div>
                    <div style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 600 }}>{formatDate(previewMarche.dateLimiteRemise)}</div>
                  </div>
                </div>
                {previewMarche.estimationCout && (
                  <div style={{ backgroundColor: '#f0fdf4', borderRadius: '6px', padding: '0.5rem 0.7rem', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>💰 Estimation</div>
                    <div style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 700 }}>{previewMarche.estimationCout}</div>
                  </div>
                )}
                {previewMarche.objet && (
                  <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5, borderTop: '1px solid #f1f5f9', paddingTop: '0.7rem' }}>
                    {previewMarche.objet.length > 120 ? previewMarche.objet.substring(0, 120) + '…' : previewMarche.objet}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button onClick={() => { setSelectedMarche(previewMarche); }} style={{ flex: 1, padding: '0.5rem', fontSize: '0.78rem', fontWeight: 600, backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                    <FileText size={13} /> Voir les documents
                  </button>
                  {previewMarche.urlDce && (
                    <a href={previewMarche.urlDce} target="_blank" rel="noreferrer" style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Légende couleurs */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Légende</h4>
            {[
              { color: '#3b82f6', label: 'Normal (> 7 jours)' },
              { color: '#f59e0b', label: 'Bientôt (≤ 7 jours)' },
              { color: '#ef4444', label: 'Urgent (≤ 1 jour)' },
              { color: '#9ca3af', label: 'Expiré' },
            ].map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: l.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ============ CALENDRIER ============ */}
        <div style={{ flex: 1, backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minWidth: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
              Chargement du calendrier...
            </div>
          ) : (
            <div style={{ height: '75vh' }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                culture="fr"
                messages={messages}
                date={currentDate}
                onNavigate={(newDate) => setCurrentDate(newDate)}
                view={currentView}
                onView={(newView) => setCurrentView(newView)}
                onSelectEvent={handleSelectEvent}
                popup={true}
                views={['month', 'week', 'day', 'agenda']}
                style={{ height: '100%', fontFamily: 'inherit' }}
                eventPropGetter={(event) => {
                  const { bg, border } = getEventColor(event.resource);
                  return {
                    style: {
                      backgroundColor: bg,
                      borderRadius: '6px',
                      color: 'white',
                      border: `1px solid ${border}`,
                      padding: '2px 8px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                    }
                  };
                }}
                tooltipAccessor={(event) =>
                  `📋 ${event.resource.reference}\n🏢 ${event.resource.acheteurPublic}\n⏰ ${new Date(event.resource.dateLimiteRemise).toLocaleDateString('fr-FR')}`
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Modale complète (documents) */}
      <MarcheDetailsModal
        selectedMarche={selectedMarche}
        onClose={() => setSelectedMarche(null)}
      />
    </div>
  );
}
