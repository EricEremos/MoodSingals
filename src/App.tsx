import { useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { allRoutes, navRoutes } from './app/routes'
import InfoSheet from './components/InfoSheet'
import OnboardingGuideModal from './components/OnboardingGuideModal'
import { Button } from './components/ui'
import { copy } from './utils/copy'
import {
  ONBOARDING_OPEN_EVENT,
  shouldAutoShowOnboarding,
  suppressOnboardingFor30Days,
} from './utils/onboarding'

const navItems = navRoutes

function AppLayout() {
  const location = useLocation()
  const [showOnboarding, setShowOnboarding] = useState(() => shouldAutoShowOnboarding())
  const activeRoute =
    navItems.find((route) => route.path === location.pathname) ||
    navItems.find((route) => route.path !== '/' && location.pathname.startsWith(route.path))

  useEffect(() => {
    const openGuide = () => setShowOnboarding(true)
    window.addEventListener(ONBOARDING_OPEN_EVENT, openGuide)
    return () => {
      window.removeEventListener(ONBOARDING_OPEN_EVENT, openGuide)
    }
  }, [])

  return (
    <div className="app-shell">
      <header className="top-app-bar">
        <div>
          <p className="section-label">{copy.app.name}</p>
          <h1 className="app-title">{activeRoute?.label || copy.nav.insights}</h1>
          <p className="body-subtle">{copy.app.subtitle}</p>
        </div>
        <div className="inline-list">
          <Button variant="ghost" type="button" onClick={() => setShowOnboarding(true)}>
            {copy.app.helpAction}
          </Button>
          <span className="status-chip">{copy.app.statusChip}</span>
          <InfoSheet title={copy.app.privacySheetTitle}>
            <ul className="sheet-list">
              {copy.app.privacySheetBody.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </InfoSheet>
        </div>
      </header>
      <div className="app-body">
        <nav className="desktop-nav" aria-label="Primary">
          {navItems.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className={({ isActive }) =>
                `desktop-nav-link ${isActive ? 'desktop-nav-link-active' : ''}`
              }
              end={route.path === '/'}
            >
              {route.label}
            </NavLink>
          ))}
        </nav>
        <main className="main-content">
          <div className="page-wrap">
            <Routes>
              {allRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
            </Routes>
          </div>
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Primary">
        {navItems.map((route) => (
          <NavLink
            key={route.path}
            to={route.path}
            className={({ isActive }) =>
              `bottom-nav-link ${isActive ? 'bottom-nav-link-active' : ''}`
            }
            end={route.path === '/'}
          >
            {route.label}
          </NavLink>
        ))}
      </nav>
      <OnboardingGuideModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onSkip={() => setShowOnboarding(false)}
        onDone={() => setShowOnboarding(false)}
        onSuppress30Days={() => {
          suppressOnboardingFor30Days()
          setShowOnboarding(false)
        }}
      />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}

export default App
