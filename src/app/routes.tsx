import Insights from './pages/Insights'
import Today from './pages/Today'
import Timeline from './pages/Timeline'
import Data from './pages/Data'
import Settings from './pages/Settings'
import Debug from './pages/Debug'
import ResearchMode from './pages/ResearchMode'
import CaseStudy from './pages/CaseStudy'

export const navRoutes = [
  { path: '/', label: 'Ledger', element: <Timeline /> },
  { path: '/insights', label: 'Insights', element: <Insights /> },
  { path: '/today', label: 'Today', element: <Today /> },
  { path: '/data', label: 'Data', element: <Data /> },
  { path: '/settings', label: 'Settings', element: <Settings /> },
]

export const extraRoutes = [
  { path: '/timeline', label: 'Timeline', element: <Timeline /> },
  { path: '/settings/debug', label: 'Debug', element: <Debug /> },
  { path: '/log', label: 'Log', element: <Today /> },
  { path: '/import', label: 'Import', element: <Data /> },
  { path: '/study-mode', label: 'Study Mode', element: <ResearchMode /> },
  { path: '/research-mode', label: 'Research Mode', element: <ResearchMode /> },
  { path: '/case-study', label: 'Case Study', element: <CaseStudy /> },
  { path: '/insights/overview', label: 'Insights', element: <Insights /> },
]

export const allRoutes = [...navRoutes, ...extraRoutes]
