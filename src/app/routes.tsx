import Insights from './pages/Insights'
import Timeline from './pages/Timeline'
import Data from './pages/Data'
import Settings from './pages/Settings'
import Debug from './pages/Debug'

export const navRoutes = [
  { path: '/', label: 'Insights', element: <Insights /> },
  { path: '/timeline', label: 'Timeline', element: <Timeline /> },
  { path: '/data', label: 'Data', element: <Data /> },
  { path: '/settings', label: 'Settings', element: <Settings /> },
]

export const extraRoutes = [
  { path: '/settings/debug', label: 'Debug', element: <Debug /> },
]

export const allRoutes = [...navRoutes, ...extraRoutes]
