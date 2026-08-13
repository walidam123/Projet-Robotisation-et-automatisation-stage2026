import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Mail, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

const API_BASE = 'http://localhost:8080/api';

export default function Dashboard() {
  const [marches, setMarches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState(null);

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
                      <a href={marche.urlDce} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary">
                        <FileText size={16} /> DCE
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
