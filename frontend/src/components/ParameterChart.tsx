import React from 'react';

const parameters = [
  { key: 'ph', label: 'pH', unit: '', min: 6.5, max: 8.5, absMax: 14, isRange: true },
  { key: 'bod', label: 'BOD', unit: 'mg/L', threshold: 3, absMax: 50 },
  { key: 'cod', label: 'COD', unit: 'mg/L', threshold: 10, absMax: 100 },
  { key: 'tds', label: 'TDS', unit: 'mg/L', threshold: 500, absMax: 2000 },
  { key: 'totalColiform', label: 'Coliform', unit: 'MPN/100mL', threshold: 5000, absMax: 50000 },
];

function ParameterChart({ ph, bod, cod, tds, totalColiform }) {
  const values = { ph, bod, cod, tds, totalColiform };

  const getStatus = (param, value) => {
    if (value == null) return 'unknown';
    if (param.isRange) {
      return value >= param.min && value <= param.max ? 'safe' : 'danger';
    }
    return value <= param.threshold ? 'safe' : 'danger';
  };

  const getBarWidth = (param, value) => {
    if (value == null) return 0;
    const maxVal = param.absMax || param.threshold * 3;
    return Math.min((value / maxVal) * 100, 100);
  };

  const getThresholdPosition = (param) => {
    if (param.isRange) {
      return {
        start: (param.min / param.absMax) * 100,
        end: (param.max / param.absMax) * 100,
      };
    }
    const maxVal = param.absMax || param.threshold * 3;
    return { position: (param.threshold / maxVal) * 100 };
  };

  return (
    <div className="parameter-chart">
      {parameters.map((param) => {
        const value = values[param.key];
        const status = getStatus(param, value);
        const barWidth = getBarWidth(param, value);
        const thresholdPos = getThresholdPosition(param);

        return (
          <div className="parameter-chart__row" key={param.key}>
            <div className="parameter-chart__label">
              <span className="parameter-chart__name">{param.label}</span>
              <span className={`parameter-chart__value parameter-chart__value--${status}`}>
                {value != null ? (param.key === 'totalColiform' ? value.toLocaleString() : value.toFixed(1)) : '—'}
                {param.unit && ` ${param.unit}`}
              </span>
            </div>
            <div className="parameter-chart__bar-container">
              {/* Healthy zone indicator */}
              {param.isRange ? (
                <div
                  className="parameter-chart__healthy-zone"
                  style={{ left: `${thresholdPos.start}%`, width: `${thresholdPos.end - thresholdPos.start}%` }}
                />
              ) : (
                <div
                  className="parameter-chart__threshold-line"
                  style={{ left: `${thresholdPos.position}%` }}
                />
              )}
              {/* Actual bar */}
              <div
                className={`parameter-chart__bar parameter-chart__bar--${status}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <div className="parameter-chart__limit">
              {param.isRange ? `${param.min}–${param.max}` : `≤ ${param.threshold.toLocaleString()}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ParameterChart;
