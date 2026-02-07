import Insights from './pages/Insights'
import Today from './pages/Today'
import Timeline from './pages/Timeline'
import Data from './pages/Data'
import Settings from './pages/Settings'
import Debug from './pages/Debug'
import ResearchMode from './pages/ResearchMode'
import CaseStudy from './pages/CaseStudy'

export const navRoutes = [
  { path: '/', label: 'Insights', element: <Insights /> },
  { path: '/today', label: 'Today', element: <Today /> },
  { path: '/timeline', label: 'Timeline', element: <Timeline /> },
  { path: '/data', label: 'Data', element: <Data /> },
  { path: '/settings', label: 'Settings', element: <Settings /> },
]

export const extraRoutes = [
  { path: '/settings/debug', label: 'Debug', element: <Debug /> },
  { path: '/log', label: 'Log', element: <Today /> },
  { path: '/import', label: 'Import', element: <Data /> },
  { path: '/research-mode', label: 'Research Mode', element: <ResearchMode /> },
  { path: '/case-study', label: 'Case Study', element: <CaseStudy /> },
]

export const allRoutes = [...navRoutes, ...extraRoutes]
