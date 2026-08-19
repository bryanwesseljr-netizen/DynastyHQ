import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import WeekSetupPortal from './components/WeekSetupPortal.jsx'
import CollegeCareerAgendaCardPortal from './components/CollegeCareerAgendaCardPortal.jsx'
import RtgStatusScannerPortal from './components/RtgStatusScannerPortal.jsx'
import PodcastHumanizedAudioPortal from './components/PodcastHumanizedAudioPortal.jsx'
import './index.css' // <-- Make sure this line is here!

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <WeekSetupPortal />
    <CollegeCareerAgendaCardPortal />
    <RtgStatusScannerPortal />
    <PodcastHumanizedAudioPortal />
  </React.StrictMode>,
)
