import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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
    return { code: code.replace(target, replacement), map: null }
  },
})

const newsroomCoverageHome = () => ({
  name: 'dynastyhq-newsroom-coverage-home',
  enforce: 'pre',
  transform(code, id) {
    if (!/[\\/]src[\\/]components[\\/]GroundedNewsroom\.jsx$/.test(id)) return null
    let next = code
    next = next.replace('<div className="grid gap-4 md:grid-cols-2">', '<div className="dhq-newsroom-home-grid">')
    next = next.replace(
      `const cardPresentation = resolveNewsroomPresentation(cardStory);
              return (`,
      `const cardPresentation = resolveNewsroomPresentation(cardStory);
              const cardImageKey = theme === 'on3' ? 'on3' : theme;
              const cardMedia = resolveNewsroomMedia({
                article: cardStory,
                mediaLibrary,
                fallbackUrl: outletImages?.[cardImageKey] || outletImages?.broadsheet,
              });
              return (`,
    )
    next = next.replace(
      `data-editorial-layout={cardPresentation.layout}
                  style={presentationVariables(cardPresentation)}`,
      `data-editorial-layout={cardPresentation.layout}
                  data-story-importance={cardStory.storyImportance || 'routine'}
                  data-story-format={cardStory.storyFormat || 'news'}
                  style={presentationVariables(cardPresentation)}`,
    )
    next = next.replace(
      `<span className="dhq-newsroom-story-card__outlet flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]"><Icon size={15} /> {label}</span>
                  <span className="dhq-newsroom-story-card__headline mt-4 text-xl font-black leading-tight">{cardStory.headline}</span>`,
      `<span className="dhq-newsroom-story-card__outlet flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]"><Icon size={15} /> {label}</span>
                  {cardMedia?.url && (
                    <span className="dhq-newsroom-story-card__media" aria-hidden="true">
                      <img src={cardMedia.url} alt="" />
                    </span>
                  )}
                  <span className="dhq-newsroom-story-card__headline mt-4 text-xl font-black leading-tight">{cardStory.headline}</span>`,
    )
    if (next === code) return null
    return { code: next, map: null }
  },
})

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
        const latestVerifiedRtgValue = (key) => {
          const factKey = 'rtg.' + key;
          const verifiedFact = [...(appState.factLedger || [])].reverse().find((entry) => (
            entry?.key === factKey
            && entry.verified === true
            && valOrEmpty(entry.value) !== ''
          ));
          if (verifiedFact) return verifiedFact.value;
          const publishedSnapshot = [...(appState.weeklyUpdates || [])].reverse().find((entry) => (
            valOrEmpty(entry?.rtgSnapshot?.[key]) !== ''
          ));
          return publishedSnapshot ? publishedSnapshot.rtgSnapshot[key] : '—';
        };
        const overviewStats = [
          ['School', appState.player.college || appState.player.school || 'College'],
          ['OVR', appState.player.overall || '—'],
          ['Depth', latestVerifiedRtgValue('rank')],
          ['Coach Trust', latestVerifiedRtgValue('coachTrust')],
          ['GPA', latestVerifiedRtgValue('gpa')],
          ['Energy', latestVerifiedRtgValue('energy')],
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
    next = next.replace(
      `<div className="bg-slate-900/85 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-2xl mb-6 text-center">
          <h2 className="text-3xl font-black text-white uppercase mb-1 drop-shadow-md">The Universal Scanner</h2>
          <p className="text-slate-300 text-sm font-bold drop-shadow">Upload your Box Score, Player Hub, and Recruiting Board screenshots together. Nothing changes until you review and publish.</p>`,
      `<div data-gameweek-scanner className="bg-slate-900/85 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-2xl mb-6 text-center">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">After the game</p>
          <h2 className="text-3xl font-black text-white uppercase mb-1 drop-shadow-md">Postgame Scanner</h2>
          <p className="mx-auto max-w-3xl text-slate-300 text-sm font-bold drop-shadow">Start with the Box Score and Player Hub. Add Recruiting Board or other RTG screens only when something changed. Nothing reaches career history until you review, apply, and publish.</p>
          <div className="mx-auto mt-4 grid max-w-3xl grid-cols-1 gap-2 text-left sm:grid-cols-3">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"><span className="text-[9px] font-black uppercase tracking-wider text-emerald-300">1 · Core</span><p className="mt-1 text-[10px] leading-relaxed text-slate-400">Box Score + Player Hub</p></div>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3"><span className="text-[9px] font-black uppercase tracking-wider text-blue-300">2 · If changed</span><p className="mt-1 text-[10px] leading-relaxed text-slate-400">Depth chart, Coach Trust, GPA, energy, NIL</p></div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"><span className="text-[9px] font-black uppercase tracking-wider text-amber-300">3 · Optional</span><p className="mt-1 text-[10px] leading-relaxed text-slate-400">Recruiting / special storyline screens</p></div>
          </div>`,
    )
    if (next === code) return null
    return { code: next, map: null }
  },
})

const betweenGamesEfficiency = () => ({
  name: 'dynastyhq-between-games-efficiency',
  enforce: 'pre',
  transform(code, id) {
    if (/[\\/]src[\\/]components[\\/]CareerCommandCenter\.jsx$/.test(id)) {
      let next = code
      const importTarget = `import CareerTransitionPanel from './CareerTransitionPanel';`
      next = next.replace(importTarget, `${importTarget}\nimport BetweenGamesHub from './BetweenGamesHub';`)
      const dashboardGridTarget = `      <div className="dhq-dashboard-grid grid gap-1.5 p-2 sm:px-3 lg:grid-cols-12">`
      next = next.replace(dashboardGridTarget, `      <BetweenGamesHub state={state} readOnly={readOnly} onNavigate={onNavigate} />\n\n${dashboardGridTarget}`)
      if (next === code) return null
      return { code: next, map: null }
    }

    if (/[\\/]src[\\/]App\.jsx$/.test(id)) {
      let next = code
      const lazyTarget = `const WeeklyReviewPanel = lazy(() => import('./components/WeeklyReviewPanel'));`
      next = next.replace(lazyTarget, `${lazyTarget}\nconst WeeklyEfficiencyPanel = lazy(() => import('./components/WeeklyEfficiencyPanel'));`)
      const agendaTarget = `      {isHighSchoolCareer ? (\n        <div className="mb-6">`
      next = next.replace(agendaTarget, `      <WeeklyEfficiencyPanel state={appState} rtgUpdate={rtgUpdate} coachUpdate={coachUpdate} isCoach={isCoach} isHighSchoolCareer={isHighSchoolCareer} />\n\n${agendaTarget}`)
      if (next === code) return null
      return { code: next, map: null }
    }

    return null
  },
})

const legacyCareerResume = () => ({
  name: 'dynastyhq-legacy-career-resume',
  enforce: 'pre',
  transform(code, id) {
    if (!/[\\/]src[\\/]App\.jsx$/.test(id)) return null
    let next = code
    const lazyTarget = `const CareerCommandCenter = lazy(() => import('./components/CareerCommandCenter'));`
    next = next.replace(lazyTarget, `${lazyTarget}\nconst LegacyWorkspace = lazy(() => import('./components/LegacyWorkspace'));`)
    next = next.replace(`{activeTab === 'trophies' && renderTrophies()}`, `{activeTab === 'trophies' && <LegacyWorkspace state={appState} />}`)
    if (next === code) return null
    return { code: next, map: null }
  },
})

const recruitingCommandCenter = () => ({
  name: 'dynastyhq-recruiting-command-center',
  enforce: 'pre',
  transform(code, id) {
    if (/[\\/]src[\\/]App\.jsx$/.test(id)) {
      let next = code
      const lazyTarget = `const PersonnelCfoWorkspace = lazy(() => import('./components/PersonnelCfoWorkspace'));`
      next = next.replace(lazyTarget, `${lazyTarget}\nconst CoachRecruitingCommandCenter = lazy(() => import('./components/CoachRecruitingCommandCenter'));`)
      next = next.replace(
        `{!isCoach && appState.player.isCommitted ? (`,
        `<CoachRecruitingCommandCenter state={appState} onNavigate={setActiveTab} />\n        {!isCoach && appState.player.isCommitted ? (`,
      )
      if (next === code) return null
      return { code: next, map: null }
    }

    if (/[\\/]src[\\/]components[\\/]PlayerRecruitingWorkspace\.jsx$/.test(id)) {
      let next = code
      next = next.replace('College Recruiting Hub', 'Recruiting Command Center · Player')
      next = next.replace('Committed to {state.player.college}', '{state.player.college} Decision Desk')
      next = next.replace(
        'Your high-school board is frozen as history. This screen stays quiet during college unless you intentionally explore the transfer portal.',
        'Your high-school recruitment is archived. During college, this becomes a quiet decision desk that only activates when CFB 27 gives you a real transfer-portal choice.',
      )
      const statsTarget = `<div className="grid gap-4 p-5 sm:grid-cols-3 md:p-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Final rating</p><p className="mt-1 text-2xl font-black text-white">{archive?.starRating || state.player.stars || '—'}★</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Scholarship offers</p><p className="mt-1 text-2xl font-black text-white">{archive?.offerCount ?? offers.length}</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Transfer status</p><p className="mt-1 text-lg font-black text-emerald-400">{transfer.status === TRANSFER_STATUSES.EXPLORING ? 'Exploring options' : 'Staying put'}</p></div>
          </div>`
      const statsReplacement = `<div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5 md:p-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Current program</p><p className="mt-1 text-lg font-black text-white">{state.player.college || state.player.school || '—'}</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">OVR</p><p className="mt-1 text-2xl font-black text-white">{state.player.overall || '—'}</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Depth</p><p className="mt-1 text-lg font-black text-white">{state.rtg?.rank || 'Not captured'}</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Coach Trust</p><p className="mt-1 text-lg font-black text-white">{state.rtg?.coachTrust === '' || state.rtg?.coachTrust === undefined ? 'Not captured' : state.rtg.coachTrust}</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Portal status</p><p className="mt-1 text-lg font-black text-emerald-400">{transfer.status === TRANSFER_STATUSES.EXPLORING ? (transfer.targets.length + ' option' + (transfer.targets.length === 1 ? '' : 's')) : 'Staying put'}</p></div>
          </div>`
      next = next.replace(statsTarget, statsReplacement)
      if (next === code) return null
      return { code: next, map: null }
    }

    return null
  },
})

const podcastHostCoverExperience = () => ({
  name: 'dynastyhq-podcast-host-cover-experience',
  enforce: 'pre',
  transform(code, id) {
    if (/[\\/]src[\\/]App\.jsx$/.test(id)) {
      let next = code
      const handlerTarget = `  const handleGeneratePodcast = async (publicationId, onProgress = () => {}) => {`
      const handlerReplacement = `  const handlePodcastCoverUpload = async (file) => {
    if (!file) return '';
    if (!userState || isReadOnly) throw new Error('Sign in as the DynastyHQ owner before changing podcast artwork.');
    if (!String(file.type || '').startsWith('image/')) throw new Error('Choose a JPEG, PNG, or WebP image for the podcast cover.');
    setNewsroomMediaBusy(true);
    try {
      const assetId = 'podcast-cover-' + Date.now();
      const imageDataUrl = await compressImage(file, 2000, 0.9);
      const uploaded = await uploadNewsroomMedia({
        firebaseApp,
        appId,
        userId: userState.uid,
        assetId,
        imageDataUrl,
        fileName: file.name || 'gridiron-grind-cover.jpg',
        origin: NEWSROOM_MEDIA_ORIGINS.UPLOAD,
      });
      updateAppState((prev) => ({
        ...prev,
        outletImages: { ...(prev.outletImages || {}), podcast: uploaded.downloadUrl },
      }), 'Gridiron Grind cover updated.');
      return uploaded.downloadUrl;
    } finally {
      setNewsroomMediaBusy(false);
    }
  };

${handlerTarget}`
      next = next.replace(handlerTarget, handlerReplacement)
      const propsTarget = `               onGenerate={handleGeneratePodcast}
               onLoadAudio={handleLoadPodcastAudio}`
      const propsReplacement = `${propsTarget}
               onCoverUpload={handlePodcastCoverUpload}
               coverBusy={newsroomMediaBusy}`
      next = next.replace(propsTarget, propsReplacement)
      if (next === code) return null
      return { code: next, map: null }
    }

    if (/[\\/]src[\\/]components[\\/]PodcastStudio\.jsx$/.test(id)) {
      let next = code
      next = next.replace(
        `const PodcastStudioContent = ({ state = {}, readOnly, initialPublicationId, onGenerate, onLoadAudio }) => {`,
        `const PodcastStudioContent = ({ state = {}, readOnly, initialPublicationId, onGenerate, onLoadAudio, onCoverUpload, coverBusy = false }) => {`,
      )
      next = next.replace(
        `  const episodeHosts = Array.isArray(episode?.hosts) ? episode.hosts : [];`,
        `  const canonicalHostIdentity = {
    'marcus-grant': { name: 'Mark Thompson', role: 'Lead Host & College Football Insider' },
    'tyler-brooks': { name: 'Sarah Chen', role: 'College Football Analyst' },
  };
  const episodeHosts = (Array.isArray(episode?.hosts) ? episode.hosts : []).map((host) => ({
    ...host,
    ...(canonicalHostIdentity[host.id] || {}),
  }));`,
      )
      next = next.replace(
        'Marcus Grant and Tyler Brooks break down each verified week from the high-school recruiting trail through the head-coaching years.',
        'Mark Thompson and Sarah Chen break down each verified week from the high-school recruiting trail through the head-coaching years.',
      )
      const disclosureTarget = `<p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Voices are AI-generated.</p>`
      const disclosureReplacement = `${disclosureTarget}
            {!readOnly && typeof onCoverUpload === 'function' && (
              <label className="mt-4 inline-flex cursor-pointer items-center rounded-lg border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-blue-200 transition-colors hover:bg-blue-500/20">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={coverBusy}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setError('');
                    try {
                      await onCoverUpload(file);
                    } catch (uploadError) {
                      setError(uploadError.message || 'The podcast cover could not be uploaded.');
                    } finally {
                      event.target.value = '';
                    }
                  }}
                />
                {coverBusy ? 'Uploading Cover…' : (state.outletImages?.podcast ? 'Change Podcast Cover' : 'Add Podcast Cover')}
              </label>
            )}`
      next = next.replace(disclosureTarget, disclosureReplacement)
      if (next === code) return null
      return { code: next, map: null }
    }

    return null
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
    betweenGamesEfficiency(),
    legacyCareerResume(),
    recruitingCommandCenter(),
    podcastHostCoverExperience(),
    react(),
    tailwindcss(),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'firebase-storage', test: /node_modules[\\/](@firebase[\\/]storage|firebase[\\/]storage)[\\/]/, priority: 5 },
            { name: 'firebase-firestore', test: /node_modules[\\/](@firebase[\\/]firestore|firebase[\\/]firestore)[\\/]/, priority: 4 },
            { name: 'firebase', test: /node_modules[\\/](@firebase|firebase)[\\/]/, priority: 3 },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 2 },
            { name: 'icons', test: /node_modules[\\/]lucide-react[\\/]/, priority: 2 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 1, maxSize: 350 * 1024 },
          ],
        },
      },
    },
  },
})
