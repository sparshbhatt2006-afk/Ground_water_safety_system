import React, { useState } from 'react';
import { predict, predictAndAlert } from '../services/api';

const parameterHints = {
  ph: { label: 'pH Level', hint: 'Healthy: 6.5 – 8.5', placeholder: '7.0', min: 0, max: 14, step: 0.1 },
  bod: { label: 'BOD (mg/L)', hint: 'Healthy: ≤ 3 mg/L', placeholder: '2.0', min: 0, max: 500, step: 0.1 },
  cod: { label: 'COD (mg/L)', hint: 'Healthy: ≤ 10 mg/L', placeholder: '8.0', min: 0, max: 1000, step: 0.1 },
  tds: { label: 'TDS (mg/L)', hint: 'Healthy: ≤ 500', placeholder: '300', min: 0, max: 5000, step: 1 },
  total_coliform: { label: 'Total Coliform (MPN/100mL)', hint: 'Healthy: ≤ 5000', placeholder: '3000', min: 0, max: 500000, step: 1 },
};

function PredictionForm() {
  const [formData, setFormData] = useState({
    ph: '', bod: '', cod: '', tds: '', total_coliform: '',
    lake_name: '', latitude: '', longitude: '',
  });
  const [result, setResult] = useState(null);
  const [webhookResult, setWebhookResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [animateResult, setAnimateResult] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const getPayload = () => ({
    ph: parseFloat(formData.ph),
    bod: parseFloat(formData.bod),
    cod: parseFloat(formData.cod),
    tds: parseFloat(formData.tds),
    total_coliform: parseFloat(formData.total_coliform),
  });

  const isValid = () => {
    return formData.ph && formData.bod && formData.cod && formData.tds && formData.total_coliform;
  };

  const handlePredict = async () => {
    if (!isValid()) return;
    try {
      setLoading(true);
      setError(null);
      setAnimateResult(false);
      const data = await predict(getPayload());
      setResult(data);
      setWebhookResult(null);
      setTimeout(() => setAnimateResult(true), 50);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePredictAndAlert = async () => {
    if (!isValid() || !formData.lake_name) return;
    try {
      setLoading(true);
      setError(null);
      setAnimateResult(false);
      const payload = {
        ...getPayload(),
        lake_name: formData.lake_name,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      };
      const data = await predictAndAlert(payload);
      setResult(data.prediction);
      setWebhookResult(data.webhook_result);
      setTimeout(() => setAnimateResult(true), 50);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Prediction & alert failed');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'High': return 'var(--risk-high)';
      case 'Medium': return 'var(--risk-medium)';
      case 'Low': return 'var(--risk-low)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="prediction-form">
      <div className="page-header">
        <h1 className="page-title">Risk Prediction</h1>
        <p className="page-subtitle">Analyze water parameters for contamination risk</p>
      </div>

      <div className="prediction-layout">
        {/* Form Panel */}
        <div className="glass-card prediction-form__card">
          <h2 className="section-title">Water Parameters</h2>
          <div className="form-grid">
            {Object.entries(parameterHints).map(([key, config]) => (
              <div className="form-group" key={key}>
                <label className="form-label" htmlFor={key}>{config.label}</label>
                <input
                  className="form-input"
                  type="number"
                  id={key}
                  name={key}
                  value={formData[key]}
                  onChange={handleChange}
                  placeholder={config.placeholder}
                  min={config.min}
                  max={config.max}
                  step={config.step}
                />
                <span className="form-hint">{config.hint}</span>
              </div>
            ))}
          </div>

          <div className="form-divider" />
          <h3 className="subsection-title">Optional: Lake Info (for alert)</h3>
          <div className="form-grid form-grid--3">
            <div className="form-group">
              <label className="form-label" htmlFor="lake_name">Lake Name</label>
              <input className="form-input" type="text" id="lake_name" name="lake_name" value={formData.lake_name} onChange={handleChange} placeholder="e.g., Bellandur Lake" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="latitude">Latitude</label>
              <input className="form-input" type="number" id="latitude" name="latitude" value={formData.latitude} onChange={handleChange} placeholder="12.9716" step="0.0001" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="longitude">Longitude</label>
              <input className="form-input" type="number" id="longitude" name="longitude" value={formData.longitude} onChange={handleChange} placeholder="77.5946" step="0.0001" />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn--primary" onClick={handlePredict} disabled={loading || !isValid()}>
              {loading ? <span className="btn-spinner" /> : '🔬'} Predict Risk
            </button>
            <button className="btn btn--accent" onClick={handlePredictAndAlert} disabled={loading || !isValid() || !formData.lake_name}>
              {loading ? <span className="btn-spinner" /> : '🚀'} Predict & Alert
            </button>
          </div>

          {error && (
            <div className="alert alert--error">
              <span>⚠️</span> {error}
            </div>
          )}
        </div>

        {/* Result Panel */}
        <div className="glass-card prediction-form__result">
          <h2 className="section-title">Prediction Result</h2>
          {!result && !loading && (
            <div className="result-empty">
              <span className="result-empty__icon">🧪</span>
              <p>Enter water parameters and click Predict to see results</p>
            </div>
          )}
          {loading && (
            <div className="loading-container">
              <div className="loading-spinner" />
              <p className="loading-text">Analyzing parameters...</p>
            </div>
          )}
          {result && !loading && (
            <div className={`result-content ${animateResult ? 'result-content--visible' : ''}`}>
              <div className="result-risk-badge" style={{ borderColor: getRiskColor(result.risk_level), color: getRiskColor(result.risk_level) }}>
                <span className="result-risk-badge__level">{result.risk_level}</span>
                <span className="result-risk-badge__label">Risk Level</span>
              </div>

              <div className="result-confidence">
                <span className="result-confidence__label">Confidence</span>
                <div className="confidence-bar confidence-bar--large">
                  <div className="confidence-bar__fill" style={{ width: `${(result.confidence * 100).toFixed(0)}%`, background: getRiskColor(result.risk_level) }} />
                </div>
                <span className="result-confidence__value">{(result.confidence * 100).toFixed(1)}%</span>
              </div>

              {result.probabilities && (
                <div className="result-probabilities">
                  <h3 className="subsection-title">Probability Breakdown</h3>
                  {Object.entries(result.probabilities).map(([level, prob]) => (
                    <div className="probability-row" key={level}>
                      <span className="probability-row__label" style={{ color: getRiskColor(level) }}>{level}</span>
                      <div className="probability-row__bar">
                        <div className="probability-row__fill" style={{ width: `${(prob * 100).toFixed(0)}%`, background: getRiskColor(level) }} />
                      </div>
                      <span className="probability-row__value">{(prob * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}

              {result.rule_based_risk && (
                <div className="result-rule">
                  <span className="result-rule__label">Rule-Based Assessment:</span>
                  <span className="risk-badge" style={{ backgroundColor: getRiskColor(result.rule_based_risk) + '22', color: getRiskColor(result.rule_based_risk) }}>{result.rule_based_risk}</span>
                </div>
              )}

              {webhookResult && (
                <div className="result-webhook">
                  <h3 className="subsection-title">🔔 Webhook Response</h3>
                  <div className="webhook-response-box">
                    <pre>{JSON.stringify(webhookResult, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PredictionForm;
