import React, { useState, useEffect } from 'react';
import { getLakes } from '../services/api';
import api from '../services/api';

function ReportGenerator() {
  const [lakes, setLakes] = useState<any[]>([]);
  const [selectedLake, setSelectedLake] = useState('');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    getLakes()
      .then((data) => setLakes(data))
      .catch((err) => console.error(err));
  }, []);

  const handleGenerate = async () => {
    if (!selectedLake) return;
    try {
      setLoading(true);
      setError('');
      setReport('');
      setMetadata(null);

      const { data } = await api.post('/report/generate', {
        lake_name: selectedLake,
      });

      if (data.success) {
        setReport(data.report);
        setMetadata({
          model: data.model,
          generated_at: data.generated_at,
          lake_name: data.lake_name,
        });
      } else {
        setError(data.error || 'Failed to generate report');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob(
      [`# AquaWatch AI Report\n**Lake:** ${metadata?.lake_name}\n**Generated:** ${new Date(metadata?.generated_at).toLocaleString()}\n**Model:** ${metadata?.model}\n\n---\n\n${report}`],
      { type: 'text/markdown' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aquawatch_report_${(metadata?.lake_name || 'lake').replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Simple markdown renderer (handles headings, bold, bullets, code)
  const renderMarkdown = (md: string) => {
    const lines = md.split('\n');
    const elements: React.ReactNode[] = [];
    let inList = false;
    let listItems: React.ReactNode[] = [];

    const processInline = (text: string) => {
      // Bold
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(<ul key={`list-${elements.length}`} className="report-list">{listItems}</ul>);
        listItems = [];
        inList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed === '') {
        flushList();
        continue;
      }

      if (trimmed.startsWith('# ')) {
        flushList();
        elements.push(<h1 key={i} className="report-h1">{processInline(trimmed.slice(2))}</h1>);
      } else if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(<h2 key={i} className="report-h2">{processInline(trimmed.slice(3))}</h2>);
      } else if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(<h3 key={i} className="report-h3">{processInline(trimmed.slice(4))}</h3>);
      } else if (trimmed.startsWith('---')) {
        flushList();
        elements.push(<hr key={i} className="report-divider" />);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        inList = true;
        listItems.push(<li key={i}>{processInline(trimmed.slice(2))}</li>);
      } else if (/^\d+\.\s/.test(trimmed)) {
        inList = true;
        listItems.push(<li key={i}>{processInline(trimmed.replace(/^\d+\.\s/, ''))}</li>);
      } else {
        flushList();
        elements.push(<p key={i} className="report-paragraph">{processInline(trimmed)}</p>);
      }
    }
    flushList();
    return elements;
  };

  const selectedLakeData = lakes.find((l) => l.lake_name === selectedLake);

  return (
    <div className="report-view">
      <div className="page-header">
        <h1 className="page-title">AI Report Generator</h1>
        <p className="page-subtitle">Generate comprehensive water quality reports powered by NVIDIA AI</p>
      </div>

      <div className="report-layout">
        {/* Controls */}
        <div className="report-controls glass-card">
          <h2 className="section-title">🧠 Generate Report</h2>
          <p className="text-muted" style={{ marginBottom: '20px' }}>
            Select a lake to generate a detailed AI-powered water quality assessment report.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="report-lake-select">Select Lake</label>
            <select
              className="form-input form-select"
              id="report-lake-select"
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

          {selectedLakeData && (
            <div className="report-lake-preview">
              <div className="report-lake-preview__row">
                <span className="param-mini__label">Risk</span>
                <span className={`risk-badge risk-${(selectedLakeData.risk_level || '').toLowerCase()}`}>
                  {selectedLakeData.risk_level}
                </span>
              </div>
              <div className="report-lake-preview__row">
                <span className="param-mini__label">pH</span>
                <span className="param-mini__value">{selectedLakeData.ph?.toFixed(1)}</span>
              </div>
              <div className="report-lake-preview__row">
                <span className="param-mini__label">BOD</span>
                <span className="param-mini__value">{selectedLakeData.bod?.toFixed(1)}</span>
              </div>
              <div className="report-lake-preview__row">
                <span className="param-mini__label">COD</span>
                <span className="param-mini__value">{selectedLakeData.cod?.toFixed(1)}</span>
              </div>
              <div className="report-lake-preview__row">
                <span className="param-mini__label">TDS</span>
                <span className="param-mini__value">{selectedLakeData.tds?.toFixed(0)}</span>
              </div>
            </div>
          )}

          <button
            className="btn btn--primary btn--full"
            onClick={handleGenerate}
            disabled={loading || !selectedLake}
            style={{ marginTop: '24px' }}
          >
            {loading ? (
              <>
                <span className="btn-spinner" />
                Generating report...
              </>
            ) : (
              '✨ Generate AI Report'
            )}
          </button>

          {error && (
            <div className="alert alert--error">
              <span>⚠️</span> {error}
            </div>
          )}

          {metadata && (
            <div className="report-meta">
              <div className="report-meta__item">
                <span className="report-meta__label">Model</span>
                <span className="report-meta__value">{metadata.model}</span>
              </div>
              <div className="report-meta__item">
                <span className="report-meta__label">Generated</span>
                <span className="report-meta__value">
                  {new Date(metadata.generated_at).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Report Output */}
        <div className="report-output glass-card">
          {loading ? (
            <div className="report-loading">
              <div className="report-loading__animation">
                <div className="report-loading__pulse" />
                <div className="report-loading__pulse report-loading__pulse--delayed" />
              </div>
              <h3 className="report-loading__title">Generating AI Report...</h3>
              <p className="report-loading__subtitle">
                Analyzing water quality parameters and historical trends
              </p>
              <div className="report-loading__steps">
                <div className="report-loading__step report-loading__step--active">
                  <span>🔬</span> Analyzing parameters
                </div>
                <div className="report-loading__step">
                  <span>📊</span> Evaluating trends
                </div>
                <div className="report-loading__step">
                  <span>📝</span> Writing report
                </div>
              </div>
            </div>
          ) : report ? (
            <div className="report-content">
              <div className="report-content__header">
                <h2 className="report-content__title">
                  📄 Report: {metadata?.lake_name}
                </h2>
                <button className="btn btn--ghost" onClick={handleDownload}>
                  ⬇️ Download .md
                </button>
              </div>
              <div className="report-content__body">
                {renderMarkdown(report)}
              </div>
            </div>
          ) : (
            <div className="report-empty">
              <div className="report-empty__icon">🤖</div>
              <h3 className="report-empty__title">No Report Generated Yet</h3>
              <p className="report-empty__text">
                Select a lake and click "Generate AI Report" to create a comprehensive
                water quality assessment powered by NVIDIA AI.
              </p>
              <div className="report-empty__features">
                <div className="report-empty__feature">
                  <span>📊</span>
                  <span>Parameter Analysis</span>
                </div>
                <div className="report-empty__feature">
                  <span>📈</span>
                  <span>Trend Insights</span>
                </div>
                <div className="report-empty__feature">
                  <span>🛡️</span>
                  <span>Risk Assessment</span>
                </div>
                <div className="report-empty__feature">
                  <span>💡</span>
                  <span>Remediation Tips</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportGenerator;
