import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MapView from './components/MapView';
import GroundwaterMap from './components/GroundwaterMap';
import PredictionForm from './components/PredictionForm';
import WebhookPanel from './components/WebhookPanel';
import ReportGenerator from './components/ReportGenerator';
import RiskTable from './components/RiskTable';

const views: Record<string, React.FC> = {
  dashboard: Dashboard,
  map: MapView,
  groundwater: GroundwaterMap,
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
