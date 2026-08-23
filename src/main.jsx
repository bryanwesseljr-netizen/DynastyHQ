import React from 'react'
import ReactDOM from 'react-dom/client'
import AuthAwareApp from './components/AuthAwareApp.jsx'
import WeekSetupPortal from './components/WeekSetupPortal.jsx'
import GameweekFlowPortal from './components/GameweekFlowPortal.jsx'
import QuickImportPortal from './components/QuickImportPortal.jsx'
import WeeklyAgendaV2Portal from './components/WeeklyAgendaV2Portal.jsx'
import CollegeCareerAgendaCardPortal from './components/CollegeCareerAgendaCardPortal.jsx'
import RtgStatusScannerPortal from './components/RtgStatusScannerPortal.jsx'
import CoachRecruitingWorkspaceV2Portal from './components/CoachRecruitingWorkspaceV2Portal.jsx'
import PodcastHumanizedAudioPortal from './components/PodcastHumanizedAudioPortal.jsx'
import './index.css' // <-- Make sure this line is here!
import './newsroom-bearcats-logo.css'
import './weekly-agenda-v3-refinements.css'
import './newsroom-polish-v4.css'
import './podcast-polish-v4.css'
import './chronicle-polish-v4.css'
import './light-mode-v5-compat.css'
import './light-mode-v7-dashboard-safe.css'
import './navigation-order-v1.css'
import './import-tile-sizing-v1.css'
import './tile-fit-v2.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthAwareApp />
    <WeekSetupPortal />
    <GameweekFlowPortal />
    <QuickImportPortal />
    <WeeklyAgendaV2Portal />
    <CollegeCareerAgendaCardPortal />
    <RtgStatusScannerPortal />
    <CoachRecruitingWorkspaceV2Portal />
    <PodcastHumanizedAudioPortal />
  </React.StrictMode>,
)
