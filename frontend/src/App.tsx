import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MapView from './components/MapView';
import PredictionForm from './components/PredictionForm';
import WebhookPanel from './components/WebhookPanel';
import RiskTable from './components/RiskTable';
import ReportGenerator from './components/ReportGenerator';

const views: Record<string, React.FC> = {
  dashboard: Dashboard,
  map: MapView,
  predict: PredictionForm,
  webhook: WebhookPanel,
  reports: ReportGenerator,
  data: RiskTable,
};

function App() {
  const [activeView, setActiveView] = useState<string>('dashboard');
  const ActiveComponent = views[activeView] || Dashboard;

  return (
    <div className="app-container">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="main-content">
        <div className="content-wrapper">
          <ActiveComponent />
        </div>
      </main>
    </div>
  );
}

export default App;
