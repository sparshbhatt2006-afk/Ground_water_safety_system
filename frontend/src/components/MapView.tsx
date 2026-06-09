import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { getLakes } from '../services/api';

function Legend() {
  return (
    <div className="map-legend">
      <h4 className="map-legend__title">Risk Level</h4>
      <div className="map-legend__item">
        <span className="map-legend__dot" style={{ backgroundColor: '#00e68a' }} />
        <span>Low Risk</span>
      </div>
      <div className="map-legend__item">
        <span className="map-legend__dot" style={{ backgroundColor: '#ffb020' }} />
        <span>Medium Risk</span>
      </div>
      <div className="map-legend__item">
        <span className="map-legend__dot" style={{ backgroundColor: '#ff3b5c' }} />
        <span>High Risk</span>
      </div>
    </div>
  );
}

function MapView() {
  const [lakes, setLakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLakes = async () => {
      try {
        setLoading(true);
        const data = await getLakes();
        setLakes(data);
      } catch (err) {
        setError(err.message || 'Failed to load map data');
      } finally {
        setLoading(false);
      }
    };
    fetchLakes();
  }, []);

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'High': return '#ff3b5c';
      case 'Medium': return '#ffb020';
      case 'Low': return '#00e68a';
      default: return '#6b7280';
    }
  };

  const getMarkerRadius = (risk) => {
    switch (risk) {
      case 'High': return 12;
      case 'Medium': return 9;
      case 'Low': return 7;
      default: return 6;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p className="loading-text">Loading map data...</p>
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

  return (
    <div className="map-view">
      <div className="page-header">
        <h1 className="page-title">Lake Map</h1>
        <p className="page-subtitle">Geographic distribution of monitored lakes</p>
      </div>
      <div className="map-wrapper">
        <MapContainer
          center={[12.9716, 77.5946]}
          zoom={11}
          style={{ height: '560px', width: '100%', borderRadius: '16px', zIndex: 1 }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {lakes.map((lake, index) => {
            if (!lake.latitude || !lake.longitude) return null;
            const color = getRiskColor(lake.risk_level);
            const radius = getMarkerRadius(lake.risk_level);
            return (
              <CircleMarker
                key={`${lake.lake_name}-${index}`}
                center={[lake.latitude, lake.longitude]}
                radius={radius}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.55,
                  weight: lake.risk_level === 'High' ? 2.5 : 1.5,
                  opacity: 0.85,
                }}
              >
                <Popup>
                  <div className="popup-content">
                    <h3 className="popup-content__title">{lake.lake_name}</h3>
                    <div className="popup-content__risk" style={{ color }}>
                      {lake.risk_level} Risk
                    </div>
                    <div className="popup-content__confidence">
                      Confidence: {(lake.confidence * 100).toFixed(1)}%
                    </div>
                    <div className="popup-content__params">
                      <div>pH: {lake.ph?.toFixed(1) ?? '—'}</div>
                      <div>BOD: {lake.bod?.toFixed(1) ?? '—'}</div>
                      <div>COD: {lake.cod?.toFixed(1) ?? '—'}</div>
                      <div>TDS: {lake.tds?.toFixed(0) ?? '—'}</div>
                      <div>Coliform: {lake.total_coliform?.toLocaleString() ?? '—'}</div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
        <Legend />
      </div>
    </div>
  );
}

export default MapView;
