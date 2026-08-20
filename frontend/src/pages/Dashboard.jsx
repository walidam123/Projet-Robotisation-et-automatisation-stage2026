import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Play, Mail, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import MarcheDetailsModal from '../components/MarcheDetailsModal';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:8080/api';

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [marches, setMarches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState(null);
  
  // States pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [selectedMarche, setSelectedMarche] = useState(null);
  
  // Timer d'extraction
  const [extractionTime, setExtractionTime] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const timeRef = useRef(0);

  useEffect(() => {
    let interval;
    if (isExtracting) {
      timeRef.current = 0;
      interval = setInterval(() => {
        timeRef.current += 1;
        setExtractionTime(timeRef.current);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isExtracting]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

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

  const runScraper = async (type) => {
    const isMotCle = type === 'MOT_CLE';
    const messageConfirm = isMotCle 
      ? "Attention : Cette extraction (Mots-clés) va vider la base de données actuelle pour chercher uniquement via votre mot-clé. Voulez-vous continuer ?"
      : "Attention : Cette extraction (Acheteur) va vider la base de données actuelle pour chercher selon l'acheteur et les dates configurées. Voulez-vous continuer ?";
      
    if (!window.confirm(messageConfirm)) {
      return;
    }

    setIsExtracting(true);
    setExtractionTime(0);
    setAlertMessage({ type: 'info', text: `Extraction en cours (${isMotCle ? 'Mots-Clés' : 'Acheteur & Dates'}), veuillez patienter... Temps estimé : ~2 minutes.` });
    try {
      const endpoint = isAdmin() ? '/run-scraper' : '/membre/run-scraper';
      await axios.post(`${API_BASE}${endpoint}?type=${type}`);
      setAlertMessage({ type: 'success', text: `Extraction terminée en ${formatTime(timeRef.current)} ! Actualisation du tableau de bord...` });
      setTimeout(() => {
        fetchMarches();
        setAlertMessage(null);
      }, 3000);
    } catch (e) {
      setAlertMessage({ type: 'error', text: 'Erreur lors du démarrage du scraper.' });
    } finally {
      setIsExtracting(false);
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


  // Logique de pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMarches = marches.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(marches.length / itemsPerPage);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Liste des Appels d'Offres Extraits</h2>
          <p className="text-muted">Consultez et suivez les marchés publics enregistrés par le robot.</p>
        </div>
        <div className="page-header-actions" style={{ gap: '0.5rem', display: 'flex', flexWrap: 'wrap' }}>
          <button onClick={() => runScraper('ACHETEUR')} className="btn btn-primary" title="Extraction classique (Automatisée la nuit)">
            <Play size={18} /> Extraction (Acheteur)
          </button>
          <button onClick={() => runScraper('MOT_CLE')} className="btn btn-outline" style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }} title="Recherche spécifique par mots-clés">
            <Play size={18} /> Extraction (Mots-clés)
          </button>
          <button onClick={runAlerts} className="btn btn-outline">
            <Mail size={18} /> Tester les Alertes
          </button>
        </div>
      </div>

      {alertMessage && (
        <div className={`alert ${alertMessage.type === 'error' ? 'alert-danger' : 'alert-info'}`}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {alertMessage.type === 'info' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              {alertMessage.text}
            </div>
            {isExtracting && (
              <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Loader size={16} className="spin" />
                {formatTime(extractionTime)}
              </div>
            )}
          </div>
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
                currentMarches.map((marche) => (
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
                        className="btn btn-sm btn-primary"
                        title="Voir tous les détails et documents"
                      >
                        Afficher détails
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', marginBottom: '1rem', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1}
              className="btn btn-outline btn-sm"
            >
              Précédent
            </button>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Page <strong style={{color: 'var(--primary-color)'}}>{currentPage}</strong> sur {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages}
              className="btn btn-outline btn-sm"
            >
              Suivant
            </button>
          </div>
        )}
      </div>

      {/* Modale de visualisation des documents importée depuis le composant */}
      <MarcheDetailsModal 
        selectedMarche={selectedMarche} 
        onClose={() => setSelectedMarche(null)} 
      />

    </div>
  );
}
