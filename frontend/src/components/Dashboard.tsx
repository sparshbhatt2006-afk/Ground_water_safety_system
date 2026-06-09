import React, { useState, useEffect } from 'react';
import { getStats, getLakes } from '../services/api';
import ParameterChart from './ParameterChart';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [lakes, setLakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLake, setSelectedLake] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, lakesData] = await Promise.all([getStats(), getLakes()]);
        setStats(statsData);
        const sorted = [...lakesData].sort((a, b) => {
          const order = { High: 0, Medium: 1, Low: 2 };
          return (order[a.risk_level] ?? 3) - (order[b.risk_level] ?? 3);
        });
        setLakes(sorted);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'High': return 'var(--risk-high)';
      case 'Medium': return 'var(--risk-medium)';
      case 'Low': return 'var(--risk-low)';
      default: return 'var(--text-secondary)';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p className="loading-text">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <span className="error-icon">⚠️</span>
        <p className="error-text">{error}</p>
        <button className="btn btn--primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const highRiskCount = stats?.risk_distribution?.High || 0;

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Real-time water quality intelligence</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        <div className="stat-card stat-card--lakes">
          <div className="stat-card__icon">🏞️</div>
          <div className="stat-card__content">
            <span className="stat-card__value">{stats?.total_lakes ?? '—'}</span>
            <span className="stat-card__label">Total Lakes</span>
          </div>
        </div>
        <div className="stat-card stat-card--records">
          <div className="stat-card__icon">📝</div>
          <div className="stat-card__content">
            <span className="stat-card__value">{stats?.total_records?.toLocaleString() ?? '—'}</span>
            <span className="stat-card__label">Total Records</span>
          </div>
        </div>
        <div className="stat-card stat-card--high-risk">
          <div className="stat-card__icon">🚨</div>
          <div className="stat-card__content">
            <span className="stat-card__value">{highRiskCount}</span>
            <span className="stat-card__label">High Risk Lakes</span>
          </div>
        </div>
        <div className="stat-card stat-card--percentage">
          <div className="stat-card__icon">📈</div>
          <div className="stat-card__content">
            <span className="stat-card__value">{stats?.high_risk_percentage?.toFixed(1) ?? '—'}%</span>
            <span className="stat-card__label">High Risk Rate</span>
          </div>
        </div>
      </div>

      {/* Risk Distribution */}
      {stats?.risk_distribution && (
        <div className="glass-card risk-distribution">
          <h2 className="section-title">Risk Distribution</h2>
          <div className="risk-bar-container">
            {(() => {
              const total = (stats.risk_distribution.Low || 0) + (stats.risk_distribution.Medium || 0) + (stats.risk_distribution.High || 0);
              if (total === 0) return <p className="text-muted">No data available</p>;
              const low = ((stats.risk_distribution.Low || 0) / total * 100).toFixed(1);
              const med = ((stats.risk_distribution.Medium || 0) / total * 100).toFixed(1);
              const high = ((stats.risk_distribution.High || 0) / total * 100).toFixed(1);
              return (
                <>
                  <div className="risk-bar">
                    <div className="risk-bar__segment risk-bar__segment--low" style={{ width: `${low}%` }}>
                      {low > 10 && `${low}%`}
                    </div>
                    <div className="risk-bar__segment risk-bar__segment--medium" style={{ width: `${med}%` }}>
                      {med > 10 && `${med}%`}
                    </div>
                    <div className="risk-bar__segment risk-bar__segment--high" style={{ width: `${high}%` }}>
                      {high > 10 && `${high}%`}
                    </div>
                  </div>
                  <div className="risk-bar__legend">
                    <span className="risk-bar__legend-item"><span className="dot dot--low" /> Low ({stats.risk_distribution.Low || 0})</span>
                    <span className="risk-bar__legend-item"><span className="dot dot--medium" /> Medium ({stats.risk_distribution.Medium || 0})</span>
                    <span className="risk-bar__legend-item"><span className="dot dot--high" /> High ({stats.risk_distribution.High || 0})</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Lake Cards */}
      <div className="section-header">
        <h2 className="section-title">Lake Status</h2>
        <span className="badge badge--info">{lakes.length} lakes</span>
      </div>
      <div className="lake-cards-grid">
        {lakes.map((lake, index) => (
          <div
            key={`${lake.lake_name}-${index}`}
            className={`glass-card lake-card ${selectedLake === index ? 'lake-card--selected' : ''}`}
            onClick={() => setSelectedLake(selectedLake === index ? null : index)}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="lake-card__header">
              <h3 className="lake-card__name">{lake.lake_name}</h3>
              <span
                className="risk-badge"
                style={{ backgroundColor: getRiskColor(lake.risk_level) + '22', color: getRiskColor(lake.risk_level), borderColor: getRiskColor(lake.risk_level) + '44' }}
              >
                {lake.risk_level}
              </span>
            </div>
            <div className="lake-card__confidence">
              <span className="lake-card__confidence-label">Confidence</span>
              <div className="confidence-bar">
                <div
                  className="confidence-bar__fill"
                  style={{ width: `${(lake.confidence * 100).toFixed(0)}%`, background: getRiskColor(lake.risk_level) }}
                />
              </div>
              <span className="lake-card__confidence-value">{(lake.confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="lake-card__params">
              <div className="param-mini"><span className="param-mini__label">pH</span><span className="param-mini__value">{lake.ph?.toFixed(1) ?? '—'}</span></div>
              <div className="param-mini"><span className="param-mini__label">BOD</span><span className="param-mini__value">{lake.bod?.toFixed(1) ?? '—'}</span></div>
              <div className="param-mini"><span className="param-mini__label">COD</span><span className="param-mini__value">{lake.cod?.toFixed(1) ?? '—'}</span></div>
              <div className="param-mini"><span className="param-mini__label">TDS</span><span className="param-mini__value">{lake.tds?.toFixed(0) ?? '—'}</span></div>
            </div>
            {selectedLake === index && (
              <div className="lake-card__details">
                <ParameterChart
                  ph={lake.ph}
                  bod={lake.bod}
                  cod={lake.cod}
                  tds={lake.tds}
                  totalColiform={lake.total_coliform}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
