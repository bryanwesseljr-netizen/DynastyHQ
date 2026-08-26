import React from 'react'
import ReactDOM from 'react-dom/client'
import AuthAwareApp from './components/AuthAwareApp.jsx'
import OwnerEnhancements from './components/OwnerEnhancements.jsx'
import DuplicateGuardPortal from './components/DuplicateGuardPortal.jsx'
import PublicShareGuard from './components/PublicShareGuard.jsx'
import PublicNewsroomArticlePage from './components/PublicNewsroomArticlePage.jsx'
import { resolveViewContext } from './domain/viewMode.js'
import { readSharedNewsroomArticleId } from './domain/newsroomArticleShare.js'
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
import './global-team-accent.css'
import './newsroom-backstage-compact.css'

const viewContext = resolveViewContext(window.location.search)
const sharedArticleId = readSharedNewsroomArticleId(window.location.search)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {sharedArticleId ? (
      <PublicNewsroomArticlePage shareId={sharedArticleId} />
    ) : (
      <>
        <AuthAwareApp />
        {viewContext.isPublicShare ? <PublicShareGuard /> : <OwnerEnhancements />}
        <DuplicateGuardPortal />
      </>
    )}
  </React.StrictMode>,
)
