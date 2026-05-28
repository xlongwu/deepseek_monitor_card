import { HashRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Usage from './pages/Usage';
import Proxy from './pages/Proxy';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import MiniWidget from './pages/MiniWidget';

const navItems = [
  { to: '/', label: '总览' },
  { to: '/usage', label: '用量分析' },
  { to: '/proxy', label: '本地代理' },
  { to: '/alerts', label: '告警中心' },
  { to: '/settings', label: '系统设置' },
];

function AppContent() {
  const location = useLocation();
  const isMini = location.pathname === '/mini';

  if (isMini) {
    return (
      <Routes>
        <Route path="/mini" element={<MiniWidget />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <div className="widget-frame">
        <nav className="app-rail" aria-label="主导航">
          <div className="brand-block">
            <div className="brand-mark">D</div>
            <div>
              <h1>DeepSeek</h1>
              <p>API Monitor</p>
            </div>
          </div>

          <div className="nav-tabs">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
                end={item.to === '/'}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="rail-footer">
            <span>本地优先</span>
            <strong>v1.0.0</strong>
          </div>
        </nav>

        <main className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/usage" element={<Usage />} />
            <Route path="/proxy" element={<Proxy />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
