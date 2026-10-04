import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './services/podcastBinaryTransport.js'
import { startPreviewToProductionPromotion } from './services/previewPromotion.js'
import AuthAwareApp from './components/AuthAwareApp.jsx'
const PreviewApp = lazy(() => import('./option-a-preview/PreviewApp.jsx'))
const DuplicateGuardPortal = lazy(() => import('./components/DuplicateGuardPortal.jsx'))
const PublicShareGuard = lazy(() => import('./components/PublicShareGuard.jsx'))
const PublicNewsroomArticlePage = lazy(() => import('./components/PublicNewsroomArticlePage.jsx'))
const PublicMediaProfilePage = lazy(() => import('./components/PublicMediaProfilePage.jsx'))
import { resolveViewContext } from './domain/viewMode.js'
import { readSharedNewsroomArticleId } from './domain/newsroomArticleShare.js'
import { readPublicMediaProfileId } from './domain/publicMediaProfile.js'
import './index.css'
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
import './podcast-seek-controls.css'
import './newsroom-current-program-overrides.css'
import './active-program-theme.css'
import './active-program-theme-v2.css'
import './active-program-theme-v3.css'
import './active-program-theme-v4.css'
import './navigation-state-v5.css'
import './navigation-state-v6.css'

startPreviewToProductionPromotion()

const viewContext = resolveViewContext(window.location.search)
const sharedArticleId = readSharedNewsroomArticleId(window.location.search)
const mediaProfileId = readPublicMediaProfileId(window.location.search)

const LegacyPublicShareShell = () => (
  <>
    <AuthAwareApp />
    <Suspense fallback={null}>
      <PublicShareGuard />
      <DuplicateGuardPortal />
    </Suspense>
  </>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div className="min-h-screen bg-[#02070b]" aria-label="Loading DynastyHQ" />}>
      {sharedArticleId ? (
        <PublicNewsroomArticlePage shareId={sharedArticleId} />
      ) : mediaProfileId ? (
        <PublicMediaProfilePage ownerId={mediaProfileId} />
      ) : viewContext.isPublicShare ? (
        <LegacyPublicShareShell />
      ) : (
        <PreviewApp />
      )}
    </Suspense>
  </React.StrictMode>,
)
