import { HashRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Usage from './pages/Usage';
import Models from './pages/Models';
import Keys from './pages/Keys';
import Proxy from './pages/Proxy';
import Alerts from './pages/Alerts';
import Data from './pages/Data';

const navItems = [
  { to: '/', label: '总览' },
  { to: '/usage', label: '用量' },
  { to: '/models', label: '模型' },
  { to: '/keys', label: 'Key' },
  { to: '/proxy', label: '代理' },
  { to: '/alerts', label: '告警' },
  { to: '/data', label: '导出' },
];

function App() {
  return (
    <Router>
      <div className="app-shell">
        <div className="widget-frame">
          <nav className="app-rail" aria-label="主导航">
            <div className="brand-block">
              <div className="brand-mark">D</div>
              <div>
                <h1>DeepSeek Monitor</h1>
                <p>API 用量小组件</p>
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
              <Route path="/models" element={<Models />} />
              <Route path="/keys" element={<Keys />} />
              <Route path="/proxy" element={<Proxy />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/data" element={<Data />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
