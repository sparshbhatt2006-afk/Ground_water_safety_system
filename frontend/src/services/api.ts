import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'An unexpected error occurred';
    console.error('[API Error]', message);
    return Promise.reject(new Error(message));
  }
);

// Normalize lake data fields from backend format to frontend format
function normalizeLake(lake) {
  return {
    ...lake,
    risk_level: lake.ml_risk || lake.risk_level,
    confidence: lake.ml_confidence || lake.confidence,
  };
}

export const getHealth = async () => {
  const { data } = await api.get('/health');
  return data;
};

export const getLakes = async () => {
  const { data } = await api.get('/lakes');
  const lakes = data.data || data;
  return Array.isArray(lakes) ? lakes.map(normalizeLake) : [];
};

export const getLakeHistory = async (lakeName) => {
  const { data } = await api.get(`/lakes/${encodeURIComponent(lakeName)}/history`);
  const records = data.records || data;
  return Array.isArray(records) ? records.map(r => ({
    ...r,
    risk_level: r.ml_risk || r.risk_level,
    confidence: r.ml_confidence || r.confidence,
  })) : [];
};

export const getStats = async () => {
  const { data } = await api.get('/stats');
  // Compute high_risk_percentage if not present
  if (data.risk_distribution && !data.high_risk_percentage) {
    const total = (data.risk_distribution.Low || 0) + (data.risk_distribution.Medium || 0) + (data.risk_distribution.High || 0);
    data.high_risk_percentage = total > 0 ? ((data.risk_distribution.High || 0) / total) * 100 : 0;
  }
  return data;
};

export const predict = async (params) => {
  const { data } = await api.post('/predict', params);
  const prediction = data.prediction || data;
  return {
    ...prediction,
    risk_level: prediction.risk_level,
    confidence: prediction.confidence,
  };
};

export const predictAndAlert = async (params) => {
  const { data } = await api.post('/predict-and-alert', params);
  if (data.prediction) {
    data.prediction = {
      ...data.prediction,
      risk_level: data.prediction.risk_level,
      confidence: data.prediction.confidence,
    };
  }
  return data;
};

export const triggerWebhook = async (params) => {
  const { data } = await api.post('/webhook/trigger', params);
  return data;
};

export const getWebhookHistory = async () => {
  const { data } = await api.get('/webhook/history');
  return data.history || data;
};

export default api;
