import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { allRoutes, navRoutes } from './app/routes'

const navItems = navRoutes

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="top-nav">
          <div className="brand">
            <span className="brand-mark">MoodSignals</span>
            <span className="brand-tag">Emotion-Based Budget Tracker</span>
          </div>
          <nav className="nav-links">
            {navItems.map((route) => (
              <NavLink
                key={route.path}
                to={route.path}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link-active' : ''}`
                }
                end={route.path === '/'}
              >
                {route.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="main-content">
          <Routes>
            {allRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
