import React, { useState, useEffect } from 'react';
import { getLakes, triggerWebhook, getWebhookHistory } from '../services/api';

function WebhookPanel() {
  const [lakes, setLakes] = useState([]);
  const [selectedLake, setSelectedLake] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPayload, setShowPayload] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lakesData, historyData] = await Promise.all([
          getLakes(),
          getWebhookHistory(),
        ]);
        const highRisk = lakesData.filter((l) => l.risk_level === 'High' || l.risk_level === 'Medium');
        setLakes(highRisk.length > 0 ? highRisk : lakesData);
        setHistory(Array.isArray(historyData) ? historyData : []);
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchData();
  }, []);

  const getSelectedLakeData = () => {
    return lakes.find((l) => l.lake_name === selectedLake);
  };

  const handleTrigger = async () => {
    const lake = getSelectedLakeData();
    if (!lake) return;
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const payload = {
        lake_name: lake.lake_name,
        latitude: lake.latitude,
        longitude: lake.longitude,
        ph: lake.ph,
        cod: lake.cod,
        bod: lake.bod,
        tds: lake.tds,
      };
      const result = await triggerWebhook(payload);
      setLastResult(result);
      setSuccess(`Alert sent successfully for ${lake.lake_name}`);
      // Refresh history
      const historyData = await getWebhookHistory();
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Webhook trigger failed');
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

  const selectedData = getSelectedLakeData();
  const samplePayload = selectedData
    ? JSON.stringify({
        lake_name: selectedData.lake_name,
        latitude: selectedData.latitude,
        longitude: selectedData.longitude,
        ph: selectedData.ph,
        cod: selectedData.cod,
        bod: selectedData.bod,
        tds: selectedData.tds,
      }, null, 2)
    : '{}';

  return (
    <div className="webhook-panel">
      <div className="page-header">
        <h1 className="page-title">Webhook Management</h1>
        <p className="page-subtitle">Send risk alerts to the Water Risk Portal</p>
      </div>

      <div className="webhook-layout">
        {/* Trigger Section */}
        <div className="glass-card webhook-trigger">
          <h2 className="section-title">🔔 Send Alert</h2>
          <p className="text-muted">Select a lake and send an alert to the monitoring portal.</p>

          <div className="form-group">
            <label className="form-label" htmlFor="lake-select">Select Lake</label>
            <select
              className="form-input form-select"
              id="lake-select"
              value={selectedLake}
              onChange={(e) => setSelectedLake(e.target.value)}
            >
              <option value="">— Choose a lake —</option>
              {lakes.map((lake, i) => (
                <option key={`${lake.lake_name}-${i}`} value={lake.lake_name}>
                  {lake.lake_name} ({lake.risk_level})
                </option>
              ))}
            </select>
          </div>

          {selectedLake && selectedData && (
            <div className="webhook-lake-info">
              <div className="param-mini"><span className="param-mini__label">Risk</span><span className="risk-badge" style={{ backgroundColor: getRiskColor(selectedData.risk_level) + '22', color: getRiskColor(selectedData.risk_level) }}>{selectedData.risk_level}</span></div>
              <div className="param-mini"><span className="param-mini__label">pH</span><span className="param-mini__value">{selectedData.ph?.toFixed(1)}</span></div>
              <div className="param-mini"><span className="param-mini__label">BOD</span><span className="param-mini__value">{selectedData.bod?.toFixed(1)}</span></div>
              <div className="param-mini"><span className="param-mini__label">COD</span><span className="param-mini__value">{selectedData.cod?.toFixed(1)}</span></div>
            </div>
          )}

          <button className="btn btn--primary btn--full" onClick={handleTrigger} disabled={loading || !selectedLake}>
            {loading ? <span className="btn-spinner" /> : '🚀'} Send Alert
          </button>

          {success && <div className="alert alert--success"><span>✅</span> {success}</div>}
          {error && <div className="alert alert--error"><span>⚠️</span> {error}</div>}

          {/* Collapsible Payload */}
          <button className="btn btn--ghost" onClick={() => setShowPayload(!showPayload)}>
            {showPayload ? '▼' : '▶'} Sample Payload
          </button>
          {showPayload && (
            <div className="webhook-payload">
              <pre>{samplePayload}</pre>
            </div>
          )}

          {lastResult && (
            <div className="webhook-last-result">
              <h3 className="subsection-title">Last Response</h3>
              <div className="webhook-response-box">
                <pre>{JSON.stringify(lastResult, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* History Section */}
        <div className="glass-card webhook-history">
          <h2 className="section-title">📜 Webhook History</h2>
          {historyLoading ? (
            <div className="loading-container"><div className="loading-spinner" /><p className="loading-text">Loading history...</p></div>
          ) : history.length === 0 ? (
            <div className="result-empty">
              <span className="result-empty__icon">📭</span>
              <p>No webhook history yet</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Lake</th>
                    <th>Risk</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry, i) => (
                    <tr key={i}>
                      <td>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}</td>
                      <td>{entry.lake_name || entry.payload?.lake_name || '—'}</td>
                      <td>
                        <span className="risk-badge" style={{ backgroundColor: getRiskColor(entry.risk_level || entry.payload?.risk_level) + '22', color: getRiskColor(entry.risk_level || entry.payload?.risk_level) }}>
                          {entry.risk_level || entry.payload?.risk_level || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-dot ${entry.success !== false ? 'status-dot--success' : 'status-dot--error'}`} />
                        {entry.success !== false ? 'Sent' : 'Failed'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WebhookPanel;
