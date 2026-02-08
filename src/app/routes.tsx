import Insights from './pages/Insights'
import Today from './pages/Today'
import Timeline from './pages/Timeline'
import Data from './pages/Data'
import Settings from './pages/Settings'
import Debug from './pages/Debug'
import ResearchMode from './pages/ResearchMode'
import CaseStudy from './pages/CaseStudy'
import { copy } from '../utils/copy'

export const navRoutes = [
  { path: '/', label: copy.nav.insights, element: <Insights /> },
  { path: '/today', label: copy.nav.today, element: <Today /> },
  { path: '/timeline', label: copy.nav.timeline, element: <Timeline /> },
  { path: '/data', label: copy.nav.data, element: <Data /> },
  { path: '/settings', label: copy.nav.settings, element: <Settings /> },
]

export const extraRoutes = [
  { path: '/insights', label: 'Insights', element: <Insights /> },
  { path: '/settings/debug', label: 'Debug', element: <Debug /> },
  { path: '/log', label: 'Log', element: <Today /> },
  { path: '/import', label: 'Import', element: <Data /> },
  { path: '/study-mode', label: 'Study Mode', element: <ResearchMode /> },
  { path: '/research-mode', label: 'Research Mode', element: <ResearchMode /> },
  { path: '/case-study', label: 'Case Study', element: <CaseStudy /> },
  { path: '/insights/overview', label: 'Insights', element: <Insights /> },
]

export const allRoutes = [...navRoutes, ...extraRoutes]
