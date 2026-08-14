import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Legacy's rivalry ledger predates the high-school tape-evaluation workflow.
// Those evaluation records intentionally have no opponent, so protect the
// legacy workspace from treating them like college/coach H2H games.
const legacyGameLogSafety = () => ({
  name: 'dynastyhq-legacy-game-log-safety',
  enforce: 'pre',
  transform(code, id) {
    if (!/[\\/]src[\\/]App\.jsx$/.test(id)) return null

    const target = `const h2h = appState.gameLogs.reduce((acc, log) => {
        const opp = log.opponent.trim();`

    if (!code.includes(target)) return null

    const replacement = `const legacyGameLogs = (Array.isArray(appState.gameLogs) ? appState.gameLogs : [])
      .filter((log) => log && log.stage !== 'high-school' && !log.evaluation && String(log.opponent || '').trim());

    const h2h = legacyGameLogs.reduce((acc, log) => {
        const opp = String(log.opponent || '').trim();`

    return {
      code: code.replace(target, replacement),
      map: null,
    }
  },
})

// The Newsroom coverage overview uses the same article media and editorial
// metadata as the reader, but the base component predates the immersive
// homepage treatment. Enhance only that overview at build time so the lead
// story can carry photography and importance/format styling without changing
// stored career data or the article reader itself.
const newsroomCoverageHome = () => ({
  name: 'dynastyhq-newsroom-coverage-home',
  enforce: 'pre',
  transform(code, id) {
    if (!/[\\/]src[\\/]components[\\/]GroundedNewsroom\.jsx$/.test(id)) return null

    let next = code

    next = next.replace(
      '<div className="grid gap-4 md:grid-cols-2">',
      '<div className="dhq-newsroom-home-grid">',
    )

    const mediaTarget = `const cardPresentation = resolveNewsroomPresentation(cardStory);
              return (`
    const mediaReplacement = `const cardPresentation = resolveNewsroomPresentation(cardStory);
              const cardImageKey = theme === 'on3' ? 'on3' : theme;
              const cardMedia = resolveNewsroomMedia({
                article: cardStory,
                mediaLibrary,
                fallbackUrl: outletImages?.[cardImageKey] || outletImages?.broadsheet,
              });
              return (`
    next = next.replace(mediaTarget, mediaReplacement)

    const metadataTarget = `data-editorial-layout={cardPresentation.layout}
                  style={presentationVariables(cardPresentation)}`
    const metadataReplacement = `data-editorial-layout={cardPresentation.layout}
                  data-story-importance={cardStory.storyImportance || 'routine'}
                  data-story-format={cardStory.storyFormat || 'news'}
                  style={presentationVariables(cardPresentation)}`
    next = next.replace(metadataTarget, metadataReplacement)

    const outletTarget = `<span className="dhq-newsroom-story-card__outlet flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]"><Icon size={15} /> {label}</span>
                  <span className="dhq-newsroom-story-card__headline mt-4 text-xl font-black leading-tight">{cardStory.headline}</span>`
    const outletReplacement = `<span className="dhq-newsroom-story-card__outlet flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]"><Icon size={15} /> {label}</span>
                  {cardMedia?.url && (
                    <span className="dhq-newsroom-story-card__media" aria-hidden="true">
                      <img src={cardMedia.url} alt="" />
                    </span>
                  )}
                  <span className="dhq-newsroom-story-card__headline mt-4 text-xl font-black leading-tight">{cardStory.headline}</span>`
    next = next.replace(outletTarget, outletReplacement)

    if (next === code) return null
    return { code: next, map: null }
  },
})

export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: ['terminal.local'],
  },
  plugins: [
    legacyGameLogSafety(),
    newsroomCoverageHome(),
    react(),
    tailwindcss(),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'firebase-storage',
              test: /node_modules[\\/](@firebase[\\/]storage|firebase[\\/]storage)[\\/]/,
              priority: 5,
            },
            {
              name: 'firebase-firestore',
              test: /node_modules[\\/](@firebase[\\/]firestore|firebase[\\/]firestore)[\\/]/,
              priority: 4,
            },
            {
              name: 'firebase',
              test: /node_modules[\\/](@firebase|firebase)[\\/]/,
              priority: 3,
            },
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 2,
            },
            {
              name: 'icons',
              test: /node_modules[\\/]lucide-react[\\/]/,
              priority: 2,
            },
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
              priority: 1,
              maxSize: 350 * 1024,
            },
          ],
        },
      },
    },
  },
})
