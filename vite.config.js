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

// Weekly Agenda already owns all scanner, correction, verification and publish
// behavior. Add a college-player command header around that workflow without
// changing the career engine or stored state.
const collegeGameWeekCommandCenter = () => ({
  name: 'dynastyhq-college-gameweek-command-center',
  enforce: 'pre',
  transform(code, id) {
    if (!/[\\/]src[\\/]App\.jsx$/.test(id)) return null

    let next = code
    const target = `const renderDataEntry = () => (
    <div className="dhq-weekly-agenda-workspace max-w-7xl mx-auto animate-in fade-in pb-20 relative z-10">`

    const replacement = `const renderDataEntry = () => (
    <div className="dhq-weekly-agenda-workspace max-w-7xl mx-auto animate-in fade-in pb-20 relative z-10">
      {!isHighSchoolCareer && !isCoach && (() => {
        const workflowIndex = appliedScanDraft ? 4 : (scanDraft ? 3 : (isScanning ? 2 : 0));
        const workflowLabel = appliedScanDraft
          ? 'Verified week ready to publish'
          : scanDraft
          ? 'Review the scanner draft'
          : isScanning
          ? 'Analyzing postgame screenshots'
          : 'Pregame / play game';
        const workflowCopy = appliedScanDraft
          ? 'Review the verified summary below, make any final corrections, then publish the week.'
          : scanDraft
          ? 'Confirm the extracted facts before applying them to the weekly agenda.'
          : isScanning
          ? 'DynastyHQ is reading the screenshots. Nothing is written to career history until you approve it.'
          : 'Check your current RTG status, play the game in CFB 27, then return here and upload the postgame screens.';
        const workflowSteps = ['Pregame', 'Play Game', 'Postgame Scan', 'Review & Confirm', 'Publish Week'];
        const overviewStats = [
          ['School', appState.player.college || appState.player.school || 'College'],
          ['OVR', appState.player.overall || '—'],
          ['Depth', rtgUpdate.rank || '—'],
          ['Coach Trust', valOrEmpty(rtgUpdate.coachTrust) === '' ? '—' : rtgUpdate.coachTrust],
          ['GPA', valOrEmpty(rtgUpdate.gpa) === '' ? '—' : rtgUpdate.gpa],
          ['Energy', valOrEmpty(rtgUpdate.energy) === '' ? '—' : rtgUpdate.energy],
          ['Opponent', newGame.opponent || 'Not captured'],
        ];
        return (
          <section className="dhq-gameweek-command" aria-labelledby="dhq-gameweek-title">
            <div className="dhq-gameweek-command__top">
              <div>
                <p className="dhq-gameweek-command__eyebrow">College Game Week Command Center · Season {appState.currentSeason || 1} · Week {appState.currentWeek || 0}</p>
                <h2 id="dhq-gameweek-title" className="dhq-gameweek-command__title">{appState.player.college || appState.player.school || 'College'} Game Week</h2>
                <p className="dhq-gameweek-command__sub">One weekly flow: check the pregame snapshot, play the game, scan the postgame screens, verify what DynastyHQ found, then publish once.</p>
              </div>
              <div className="dhq-gameweek-command__status">
                <span className="dhq-gameweek-command__status-label">Current stage</span>
                <strong className="dhq-gameweek-command__status-value">{workflowLabel}</strong>
                <span className="dhq-gameweek-command__status-copy">{workflowCopy}</span>
              </div>
            </div>
            <div className="dhq-gameweek-command__stats">
              {overviewStats.map(([label, value]) => (
                <div key={label} className="dhq-gameweek-command__stat"><span>{label}</span><strong>{String(value)}</strong></div>
              ))}
            </div>
            <div className="dhq-gameweek-command__steps" aria-label="Game week workflow">
              {workflowSteps.map((label, index) => (
                <div key={label} className="dhq-gameweek-step" data-state={index < workflowIndex ? 'done' : index === workflowIndex ? 'active' : 'upcoming'}>
                  <span className="dhq-gameweek-step__num">{index < workflowIndex ? '✓' : index + 1}</span>
                  <span className="dhq-gameweek-step__label">{label}</span>
                </div>
              ))}
            </div>
            <div className="dhq-gameweek-command__actions">
              <button type="button" className="dhq-gameweek-command__action" onClick={() => document.querySelector('[data-gameweek-scanner]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Go to postgame scanner</button>
              <button type="button" className="dhq-gameweek-command__action" onClick={() => setActiveTab('dashboard')}>Open dashboard snapshot</button>
            </div>
          </section>
        );
      })()}`

    next = next.replace(target, replacement)

    const scannerTarget = `<div className="bg-slate-900/85 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-2xl mb-6 text-center">
          <h2 className="text-3xl font-black text-white uppercase mb-1 drop-shadow-md">The Universal Scanner</h2>
          <p className="text-slate-300 text-sm font-bold drop-shadow">Upload your Box Score, Player Hub, and Recruiting Board screenshots together. Nothing changes until you review and publish.</p>`
    const scannerReplacement = `<div data-gameweek-scanner className="bg-slate-900/85 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-2xl mb-6 text-center">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">After the game</p>
          <h2 className="text-3xl font-black text-white uppercase mb-1 drop-shadow-md">Postgame Scanner</h2>
          <p className="mx-auto max-w-3xl text-slate-300 text-sm font-bold drop-shadow">Start with the Box Score and Player Hub. Add Recruiting Board or other RTG screens only when something changed. Nothing reaches career history until you review, apply, and publish.</p>
          <div className="mx-auto mt-4 grid max-w-3xl grid-cols-1 gap-2 text-left sm:grid-cols-3">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"><span className="text-[9px] font-black uppercase tracking-wider text-emerald-300">1 · Core</span><p className="mt-1 text-[10px] leading-relaxed text-slate-400">Box Score + Player Hub</p></div>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3"><span className="text-[9px] font-black uppercase tracking-wider text-blue-300">2 · If changed</span><p className="mt-1 text-[10px] leading-relaxed text-slate-400">Depth chart, Coach Trust, GPA, energy, NIL</p></div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"><span className="text-[9px] font-black uppercase tracking-wider text-amber-300">3 · Optional</span><p className="mt-1 text-[10px] leading-relaxed text-slate-400">Recruiting / special storyline screens</p></div>
          </div>`
    next = next.replace(scannerTarget, scannerReplacement)

    if (next === code) return null
    return { code: next, map: null }
  },
})

// Legacy is a career resume rather than another event browser. Route the tab to
// its dedicated workspace while leaving the old inline renderer in place as a
// harmless fallback for source compatibility.
const legacyCareerResume = () => ({
  name: 'dynastyhq-legacy-career-resume',
  enforce: 'pre',
  transform(code, id) {
    if (!/[\\/]src[\\/]App\.jsx$/.test(id)) return null

    let next = code
    const lazyTarget = `const CareerCommandCenter = lazy(() => import('./components/CareerCommandCenter'));`
    const lazyReplacement = `${lazyTarget}\nconst LegacyWorkspace = lazy(() => import('./components/LegacyWorkspace'));`
    next = next.replace(lazyTarget, lazyReplacement)
    next = next.replace(
      `{activeTab === 'trophies' && renderTrophies()}`,
      `{activeTab === 'trophies' && <LegacyWorkspace state={appState} />}`,
    )

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
    collegeGameWeekCommandCenter(),
    legacyCareerResume(),
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
