import Insights from './pages/Insights'
import Log from './pages/Log'
import Timeline from './pages/Timeline'
import Import from './pages/Import'
import Settings from './pages/Settings'
import Debug from './pages/Debug'

export const navRoutes = [
  { path: '/', label: 'Insights', element: <Insights /> },
  { path: '/log', label: 'Log', element: <Log /> },
  { path: '/timeline', label: 'Timeline', element: <Timeline /> },
  { path: '/import', label: 'Import', element: <Import /> },
  { path: '/settings', label: 'Settings', element: <Settings /> },
]

export const extraRoutes = [
  { path: '/settings/debug', label: 'Debug', element: <Debug /> },
]

export const allRoutes = [...navRoutes, ...extraRoutes]
