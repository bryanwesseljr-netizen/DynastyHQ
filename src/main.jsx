import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import WeekSetupPortal from './components/WeekSetupPortal.jsx'
import GameweekFlowPortal from './components/GameweekFlowPortal.jsx'
import QuickImportPortal from './components/QuickImportPortal.jsx'
import WeeklyAgendaV2Portal from './components/WeeklyAgendaV2Portal.jsx'
import CollegeCareerAgendaCardPortal from './components/CollegeCareerAgendaCardPortal.jsx'
import RtgStatusScannerPortal from './components/RtgStatusScannerPortal.jsx'
import PodcastHumanizedAudioPortal from './components/PodcastHumanizedAudioPortal.jsx'
import './index.css' // <-- Make sure this line is here!
import './newsroom-bearcats-logo.css'
import './weekly-agenda-v3-refinements.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <WeekSetupPortal />
    <GameweekFlowPortal />
    <QuickImportPortal />
    <WeeklyAgendaV2Portal />
    <CollegeCareerAgendaCardPortal />
    <RtgStatusScannerPortal />
    <PodcastHumanizedAudioPortal />
  </React.StrictMode>,
)