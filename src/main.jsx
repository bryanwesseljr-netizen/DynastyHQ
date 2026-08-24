import React from 'react'
import ReactDOM from 'react-dom/client'
import AuthAwareApp from './components/AuthAwareApp.jsx'
import OwnerEnhancements from './components/OwnerEnhancements.jsx'
import DuplicateGuardPortal from './components/DuplicateGuardPortal.jsx'
import PublicShareGuard from './components/PublicShareGuard.jsx'
import { resolveViewContext } from './domain/viewMode.js'
import './index.css' // <-- Make sure this line is here!
import './newsroom-bearcats-logo.css'
import './weekly-agenda-v3-refinements.css'
import './newsroom-polish-v4.css'
import './podcast-polish-v4.css'
import './chronicle-polish-v4.css'
import './light-mode-v5-compat.css'
import './light-mode-v7-dashboard-safe.css'
import './navigation-order-v1.css'
import './tile-fit-v2.css'
import './public-share-v1.css'

const viewContext = resolveViewContext(window.location.search)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthAwareApp />
    {viewContext.isPublicShare ? <PublicShareGuard /> : <OwnerEnhancements />}
    <DuplicateGuardPortal />
  </React.StrictMode>,
)
