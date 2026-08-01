import { useMemo, useState } from 'react';
import {
  Activity, ArrowRight, BookOpen, CheckCircle2, ChevronLeft, Headphones, Newspaper,
  Quote, Radio, ShieldCheck, Star, Zap,
} from 'lucide-react';
import NewsroomMediaManager from './NewsroomMediaManager';
import { resolveNewsroomMedia } from '../domain/newsroomMedia';

const tabs = [
  { theme: 'broadsheet', outletId: 'bolt', label: 'The Bolt', icon: Zap },
  { theme: 'local', outletId: 'local', label: 'Dearborn Chronicle', icon: Newspaper },
  { theme: 'on3', outletId: 'recruiting', label: 'Recruiting Wire', icon: Star },
  { theme: 'filmroom', outletId: 'filmroom', label: 'Film Room', icon: Activity },
  { theme: 'national', outletId: 'national', label: 'Saturday National', icon: BookOpen },
  { theme: 'podcast', outletId: 'podcast', label: 'Podcast Brief', icon: Headphones },
];

const themeStyles = {
  broadsheet: { shell: 'bg-[#f5f1e8] text-slate-950 border-amber-900/30', accent: 'text-amber-800', rule: 'border-slate-900' },
  local: { shell: 'bg-[#eef2f4] text-slate-950 border-slate-400', accent: 'text-blue-900', rule: 'border-blue-900' },
  on3: { shell: 'bg-zinc-950 text-zinc-100 border-amber-500/40', accent: 'text-amber-400', rule: 'border-amber-500' },
  filmroom: { shell: 'bg-[#081528] text-slate-100 border-emerald-500/40', accent: 'text-emerald-400', rule: 'border-emerald-500' },
  national: { shell: 'bg-slate-950 text-slate-100 border-blue-500/40', accent: 'text-blue-400', rule: 'border-blue-500' },
  podcast: { shell: 'bg-gradient-to-br from-slate-950 to-blue-950 text-slate-100 border-blue-500/40', accent: 'text-blue-400', rule: 'border-blue-500' },
};

const storyTabs = tabs.filter((tab) => tab.theme !== 'podcast');

const GroundedNewsroom = ({
  issues,
  initialIssueId,
  newsTheme,
  setNewsTheme,
  outletImages,
  podcastEpisodes = [],
  onOpenPodcast,
  readOnly = false,
  mediaLibrary = [],
  mediaBusy = false,
  autoGenerateLead = false,
  onUploadMedia,
  onAssignMedia,
  onClearMedia,
  onGenerateMedia,
  onToggleReference,
  onDeleteMedia,
  onSetAutoGenerateLead,
}) => {
  const latestIssue = issues[issues.length - 1];
  const [selectedIssueId, setSelectedIssueId] = useState(
    issues.some((issue) => issue.id === initialIssueId) ? initialIssueId : latestIssue.id,
  );
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  const selectedIssue = useMemo(
    () => issues.find((issue) => issue.id === selectedIssueId) || latestIssue,
    [issues, latestIssue, selectedIssueId],
  );
  const activeTheme = tabs.some((tab) => tab.theme === newsTheme) ? newsTheme : tabs[0].theme;
  const selectedTab = tabs.find((tab) => tab.theme === activeTheme) || tabs[0];
  const style = themeStyles[selectedTab.theme] || themeStyles.broadsheet;
  const story = selectedIssue.articles.find((entry) => entry.outletId === selectedTab.outletId);
  const podcastEpisode = podcastEpisodes.find((entry) => entry.publicationId === selectedIssue.publicationId);
  const imageKey = selectedTab.theme === 'on3' ? 'on3' : selectedTab.theme;
  const currentMedia = resolveNewsroomMedia({
    article: story,
    mediaLibrary,
    fallbackUrl: outletImages?.[imageKey] || outletImages?.broadsheet,
  });
  const featureImage = currentMedia.url;

  const openStory = (theme) => {
    setNewsTheme(theme);
    setIsReaderOpen(true);
  };

  const chooseIssue = (issueId) => {
    setSelectedIssueId(issueId);
    setIsReaderOpen(false);
  };

  return (
    <div className="relative z-10 mx-auto max-w-5xl space-y-6 pb-20 animate-in fade-in">
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-emerald-400" size={20} />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Verified weekly edition</p>
              <p className="mt-1 text-sm text-slate-300">Every claim below is generated from published Fact Ledger entries. Unsupported tactics, awards, quotes, and rumors are excluded.</p>
            </div>
          </div>
          <select
            value={selectedIssue.id}
            onChange={(event) => chooseIssue(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white"
            aria-label="Choose weekly newsroom edition"
          >
            {[...issues].reverse().map((issue) => (
              <option key={issue.id} value={issue.id}>Season {issue.season} · Week {issue.week}</option>
            ))}
          </select>
        </div>
      </div>

      {!isReaderOpen && (
        <section className="rounded-2xl border border-slate-700/70 bg-slate-950/90 p-5 shadow-2xl md:p-7" aria-labelledby="weekly-coverage-title">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Season {selectedIssue.season} · Week {selectedIssue.week}</p>
            <h2 id="weekly-coverage-title" className="mt-1 text-2xl font-black uppercase text-white md:text-3xl">This Week&rsquo;s Coverage</h2>
            <p className="mt-2 text-sm text-slate-400">Choose any newsroom below to open its complete article.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {storyTabs.map(({ theme, outletId, label, icon: Icon }) => {
              const cardStory = selectedIssue.articles.find((entry) => entry.outletId === outletId);
              if (!cardStory) return null;
              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => openStory(theme)}
                  className="group flex min-h-52 cursor-pointer flex-col rounded-xl border border-slate-700 bg-slate-900 p-5 text-left shadow-lg transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  aria-label={`Read full article from ${label}: ${cardStory.headline}`}
                >
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-400"><Icon size={15} /> {label}</span>
                  <span className="mt-4 text-xl font-black uppercase leading-tight text-white">{cardStory.headline}</span>
                  <span className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-400">{cardStory.dek}</span>
                  <span className="mt-auto flex items-center gap-2 pt-5 text-xs font-black uppercase tracking-wider text-amber-400 transition-colors group-hover:text-amber-300">Read full article <ArrowRight size={15} /></span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => openStory('podcast')}
              className="group flex min-h-52 cursor-pointer flex-col rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950 to-slate-950 p-5 text-left shadow-lg transition-all hover:-translate-y-0.5 hover:border-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 md:col-span-2"
              aria-label="Open this week's Gridiron Grind podcast brief"
            >
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-400"><Headphones size={15} /> The Gridiron Grind</span>
              <span className="mt-4 text-xl font-black uppercase leading-tight text-white">{selectedIssue.podcastBrief.title}</span>
              <span className="mt-3 text-sm leading-relaxed text-slate-400">{selectedIssue.podcastBrief.summary}</span>
              <span className="mt-auto flex items-center gap-2 pt-5 text-xs font-black uppercase tracking-wider text-blue-300 transition-colors group-hover:text-white">Open podcast brief <ArrowRight size={15} /></span>
            </button>
          </div>
        </section>
      )}

      {isReaderOpen && (
        <>
          <button
            type="button"
            onClick={() => setIsReaderOpen(false)}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:border-blue-400 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <ChevronLeft size={15} /> Back to all articles
          </button>

          <nav className="flex items-center gap-2 overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-950/90 p-2 text-xs font-bold shadow-2xl" aria-label="Weekly newsroom articles">
            {tabs.map(({ theme, label, icon: Icon }) => (
              <button
                key={theme}
                type="button"
                onClick={() => openStory(theme)}
                aria-pressed={activeTheme === theme}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${activeTheme === theme ? 'border-blue-400 bg-blue-600 text-white' : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-blue-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </nav>
        </>
      )}

      {isReaderOpen && selectedTab.theme === 'podcast' ? (
        <section className={`overflow-hidden rounded-2xl border shadow-2xl ${style.shell}`}>
          <div className="flex items-center justify-between border-b border-blue-500/30 bg-black/20 p-5 text-xs font-black uppercase tracking-widest">
            <span className="flex items-center gap-2"><Radio className="text-blue-400" size={16} /> The Gridiron Grind</span>
            <span className="text-blue-300">Grounded episode brief</span>
          </div>
          <div className="grid gap-8 p-6 md:grid-cols-[260px_minmax(0,1fr)] md:p-9">
            <div className="space-y-4">
              <div className="aspect-square overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                {outletImages?.podcast ? <img src={outletImages.podcast} alt="The Gridiron Grind cover" className="h-full w-full object-cover" /> : <Headphones className="m-auto h-full w-20 text-slate-600" />}
              </div>
              <div className="rounded-xl border border-slate-700 bg-black/20 p-4">
                <div className="space-y-3 text-center">
                  <p className="text-xs text-slate-400">{podcastEpisode?.audioStatus === 'ready' ? 'The full two-host episode is archived and ready to play.' : podcastEpisode ? 'The grounded transcript is saved; audio is ready to be rendered.' : 'This verified brief is ready for episode generation.'}</p>
                  <button type="button" onClick={() => onOpenPodcast(selectedIssue.publicationId)} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-black uppercase text-white hover:bg-blue-500">
                    Open Podcast Studio
                  </button>
                </div>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-blue-400">Season {selectedIssue.season} · Week {selectedIssue.week}</p>
              <h1 className="text-3xl font-black uppercase leading-tight md:text-5xl">{selectedIssue.podcastBrief.title}</h1>
              <p className="mt-6 rounded-xl border border-slate-700 bg-black/20 p-5 text-base leading-relaxed text-slate-300">{selectedIssue.podcastBrief.summary}</p>
              <div className="mt-5 flex items-center gap-2 text-xs font-bold text-emerald-300"><CheckCircle2 size={15} /> {selectedIssue.podcastBrief.citedFactKeys.length} verified facts available to the episode generator</div>
            </div>
          </div>
        </section>
      ) : isReaderOpen && story ? (
        <article className={`overflow-hidden rounded-2xl border shadow-2xl ${style.shell}`}>
          <header className="border-b border-current/20 p-6 md:p-9">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
              <span>{story.outletName} · {story.desk}</span>
              <span>Season {selectedIssue.season} · Week {selectedIssue.week}</span>
            </div>
            <h1 className="max-w-4xl text-3xl font-black uppercase leading-[1.02] md:text-5xl">{story.headline}</h1>
            <p className={`mt-4 border-l-4 pl-4 text-base font-semibold opacity-80 md:text-lg ${style.rule}`}>{story.dek}</p>
          </header>

          {featureImage && (
            <div className="relative h-72 overflow-hidden bg-black md:h-[440px]">
              <img src={featureImage} alt="Weekly newsroom feature" className="h-full w-full object-contain" />
              {currentMedia.disclosure && <span className="absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/75 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-white">{currentMedia.disclosure}</span>}
            </div>
          )}

          {!readOnly && (
            <NewsroomMediaManager
              issue={selectedIssue}
              article={story}
              mediaLibrary={mediaLibrary}
              currentMedia={currentMedia}
              busy={mediaBusy}
              autoGenerateLead={autoGenerateLead}
              onUpload={onUploadMedia}
              onAssign={onAssignMedia}
              onClear={onClearMedia}
              onGenerate={onGenerateMedia}
              onToggleReference={onToggleReference}
              onDelete={onDeleteMedia}
              onSetAutoGenerateLead={onSetAutoGenerateLead}
            />
          )}

          <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_240px] md:p-9">
            <div className="space-y-5 text-base leading-8">
              {story.paragraphs.map((paragraph, index) => (
                <p key={`${story.id}-${index}`}>{paragraph}</p>
              ))}
            </div>
            <aside className="h-fit rounded-xl border border-current/20 bg-black/5 p-4 text-xs">
              <p className={`mb-3 flex items-center gap-2 font-black uppercase tracking-wider ${style.accent}`}><ShieldCheck size={15} /> Source ledger</p>
              <p className="mb-4 leading-relaxed opacity-70">This story cites {story.citedFactKeys.length} verified entries from the published week.</p>
              <div className="space-y-1.5 font-mono text-[10px] opacity-60">
                {story.citedFactKeys.map((key) => <div key={key}>{key}</div>)}
              </div>
              {story.paragraphs.some((paragraph) => paragraph.includes('“')) && <Quote className={`mt-5 ${style.accent}`} size={20} />}
            </aside>
          </div>
        </article>
      ) : null}
    </div>
  );
};

export default GroundedNewsroom;
