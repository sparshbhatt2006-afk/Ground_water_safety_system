import React, { useState } from 'react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'map', label: 'Map View', icon: '🗺️' },
  { id: 'groundwater', label: '3D Water Map', icon: '🏗️' },
  { id: 'predict', label: 'Predict', icon: '🔬' },
  { id: 'webhook', label: 'Webhooks', icon: '🔔' },
  { id: 'reports', label: 'AI Reports', icon: '🤖' },
  { id: 'data', label: 'Data Table', icon: '📋' },
];

function Sidebar({ activeView, onNavigate }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside
      className={`sidebar ${isExpanded ? 'sidebar--expanded' : ''}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="sidebar__header">
        <span className="sidebar__logo">💧</span>
        {isExpanded && <span className="sidebar__title">AquaWatch</span>}
      </div>
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar__item ${activeView === item.id ? 'sidebar__item--active' : ''}`}
            onClick={() => onNavigate(item.id)}
            title={item.label}
          >
            <span className="sidebar__icon">{item.icon}</span>
            {isExpanded && <span className="sidebar__label">{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar__footer">
        <span className="sidebar__icon">⚙️</span>
        {isExpanded && <span className="sidebar__label">Settings</span>}
      </div>
    </aside>
  );
}

export default Sidebar;
