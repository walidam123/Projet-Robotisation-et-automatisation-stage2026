import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:8080/api';

// Intercepteur global : injecte le token JWT dans toutes les requêtes axios
let _getAuthHeader = () => ({});

export function setAuthHeaderProvider(fn) {
  _getAuthHeader = fn;
}

axios.interceptors.request.use((config) => {
  const headers = _getAuthHeader();
  if (headers.Authorization) {
    config.headers.Authorization = headers.Authorization;
  }
  return config;
});

export default axios;
