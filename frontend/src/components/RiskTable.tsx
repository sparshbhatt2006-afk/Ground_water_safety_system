import React, { useState, useEffect, useMemo } from 'react';
import { getLakes } from '../services/api';
import ParameterChart from './ParameterChart';

const SORT_FIELDS = [
  { key: 'lake_name', label: 'Lake Name' },
  { key: 'risk_level', label: 'Risk' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'ph', label: 'pH' },
  { key: 'bod', label: 'BOD' },
  { key: 'cod', label: 'COD' },
  { key: 'tds', label: 'TDS' },
  { key: 'total_coliform', label: 'Coliform' },
];

const riskOrder = { High: 0, Medium: 1, Low: 2 };

export default function RiskTable() {
  const [lakes, setLakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('risk_level');
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    getLakes()
      .then(data => { setLakes(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let result = lakes;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l => l.lake_name.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === 'risk_level') {
        va = riskOrder[va] ?? 3;
        vb = riskOrder[vb] ?? 3;
      }
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? (va - vb) : (vb - va);
    });
    return result;
  }, [lakes, search, sortField, sortAsc]);

  const handleSort = (key) => {
    if (sortField === key) setSortAsc(!sortAsc);
    else { setSortField(key); setSortAsc(true); }
  };

  if (loading) return <div className="loading-state"><div className="spinner"></div><p>Loading data...</p></div>;
  if (error) return <div className="error-state">⚠️ {error}</div>;

  return (
    <div className="risk-table-view">
      <div className="view-header">
        <div>
          <h2>📋 Lake Data Explorer</h2>
          <p className="view-subtitle">{filtered.length} of {lakes.length} lakes</p>
        </div>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search lakes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {SORT_FIELDS.map(f => (
                <th key={f.key} onClick={() => handleSort(f.key)} className={sortField === f.key ? 'sorted' : ''}>
                  {f.label} {sortField === f.key ? (sortAsc ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((lake, idx) => (
              <React.Fragment key={lake.lake_name}>
                <tr
                  className={`table-row ${expandedRow === idx ? 'expanded' : ''} ${idx % 2 === 0 ? 'even' : 'odd'}`}
                  onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                >
                  <td className="lake-name-cell">{lake.lake_name}</td>
                  <td><span className={`risk-badge risk-${(lake.risk_level || '').toLowerCase()}`}>{lake.risk_level}</span></td>
                  <td>{((lake.confidence || 0) * 100).toFixed(1)}%</td>
                  <td>{lake.ph?.toFixed(2)}</td>
                  <td>{lake.bod?.toFixed(1)}</td>
                  <td>{lake.cod?.toFixed(1)}</td>
                  <td>{lake.tds?.toFixed(0)}</td>
                  <td>{lake.total_coliform?.toFixed(0)}</td>
                </tr>
                {expandedRow === idx && (
                  <tr className="expanded-detail">
                    <td colSpan={8}>
                      <div className="detail-grid">
                        <div className="detail-info">
                          <h4>{lake.lake_name}</h4>
                          <p>📍 Lat: {lake.latitude?.toFixed(4)}, Lng: {lake.longitude?.toFixed(4)}</p>
                          <p>📅 {lake.month} {lake.year}</p>
                          <p>🤖 ML Risk: <strong className={`text-${(lake.risk_level || '').toLowerCase()}`}>{lake.risk_level}</strong></p>
                          <p>📏 Rule-based: <strong className={`text-${(lake.rule_based_risk || '').toLowerCase()}`}>{lake.rule_based_risk}</strong></p>
                          {lake.rule_based_violations?.length > 0 && (
                            <p>⚠️ Violations: {lake.rule_based_violations.join(', ')}</p>
                          )}
                        </div>
                        <div className="detail-chart">
                          <ParameterChart
                            ph={lake.ph}
                            bod={lake.bod}
                            cod={lake.cod}
                            tds={lake.tds}
                            totalColiform={lake.total_coliform}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
