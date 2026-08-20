import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, CheckCircle2 } from 'lucide-react';

const API_BASE = 'http://localhost:8080/api';

export default function Config() {
  const [config, setConfig] = useState({
    acheteurCible: '',
    emailNotification: '',
    dateDebutRecherche: '',
    dateFinRecherche: '',
    limiteResultats: 50,
    motCleRecherche: ''
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/config`).then((res) => {
      setConfig({
        ...res.data,
        dateDebutRecherche: res.data.dateDebutRecherche || '',
        dateFinRecherche: res.data.dateFinRecherche || ''
      });
      setLoading(false);
    });
  }, []);

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaved(false);
    try {
      await axios.put(`${API_BASE}/config`, config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Paramètres de Recherche et Notifications</h2>
          <p className="text-muted">Configurez le comportement du robot autonome.</p>
        </div>
      </div>

      {saved && (
        <div className="alert alert-success">
          <CheckCircle2 size={20} /> Configuration sauvegardée avec succès !
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          
          <h4 className="border-bottom mb-4" style={{ color: 'var(--primary-color)' }}>Critères de Recherche</h4>
          
          <div className="form-group">
            <label className="form-label">Nom de l'Acheteur Public cible :</label>
            <input 
              type="text" 
              className="form-control" 
              name="acheteurCible"
              value={config.acheteurCible}
              onChange={handleChange}
              required
            />
            <span className="form-text">Le robot tapera exactement ce texte dans la barre de recherche du portail.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Recherche par mots clés (Objet/Intitulé) :</label>
            <input 
              type="text" 
              className="form-control" 
              name="motCleRecherche"
              value={config.motCleRecherche || ''}
              onChange={handleChange}
              placeholder="Ex: sécurité DNS, serveurs..."
            />
            <span className="form-text">Optionnel. Le robot saisira ce mot-clé dans le champ "Dans la référence, l'intitulé ou l'objet de la consultation".</span>
          </div>

          <div className="grid-2 form-group">
            <div>
              <label className="form-label">Date limite de remise (Début) :</label>
              <input 
                type="date" 
                className="form-control" 
                name="dateDebutRecherche"
                value={config.dateDebutRecherche}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="form-label">Date limite de remise (Fin) :</label>
              <input 
                type="date" 
                className="form-control" 
                name="dateFinRecherche"
                value={config.dateFinRecherche}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <h4 className="border-bottom mt-4 mb-4" style={{ color: 'var(--primary-color)' }}>Notifications & Système</h4>

          <div className="form-group">
            <label className="form-label">Email pour les Alertes (J-7 / J-1) :</label>
            <input 
              type="email" 
              className="form-control" 
              name="emailNotification"
              value={config.emailNotification}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Limite de résultats par extraction :</label>
            <input 
              type="number" 
              className="form-control" 
              name="limiteResultats"
              value={config.limiteResultats}
              onChange={handleChange}
              required
            />
            <span className="form-text">Mettre -1 pour ne pas mettre de limite (attention au temps d'exécution).</span>
          </div>

          <div className="flex-end border-top pt-4">
            <button type="submit" className="btn btn-primary">
              <Save size={18} /> Sauvegarder la Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
