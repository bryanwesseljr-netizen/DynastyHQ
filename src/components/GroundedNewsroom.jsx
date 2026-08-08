import { useMemo, useState } from 'react';
import {
  Activity, ArrowRight, BookOpen, ChevronLeft, FileImage, Newspaper, Quote, ShieldCheck, Star, Zap,
} from 'lucide-react';
import NewsroomMediaManager from './NewsroomMediaManager';
import PostgameFrontPage from './PostgameFrontPage';
import { resolveNewsroomMedia } from '../domain/newsroomMedia';

const iconForOutlet = (outletId) => ({
  bolt: Zap,
  recruiting: Star,
  filmroom: Activity,
  national: BookOpen,
}[outletId] || Newspaper);

const tabsForIssue = (issue) => (issue?.articles || []).map((story) => ({
  theme: story.theme || story.outletId,
  outletId: story.outletId,
  label: story.outletName,
  icon: iconForOutlet(story.outletId),
}));

const themeStyles = {
  broadsheet: { shell: 'bg-[#f5f1e8] text-slate-950 border-amber-900/30', accent: 'text-amber-800', rule: 'border-slate-900' },
  local: { shell: 'bg-[#eef2f4] text-slate-950 border-slate-400', accent: 'text-blue-900', rule: 'border-blue-900' },
  on3: { shell: 'bg-zinc-950 text-zinc-100 border-amber-500/40', accent: 'text-amber-400', rule: 'border-amber-500' },
  filmroom: { shell: 'bg-[#081528] text-slate-100 border-emerald-500/40', accent: 'text-emerald-400', rule: 'border-emerald-500' },
  national: { shell: 'bg-slate-950 text-slate-100 border-blue-500/40', accent: 'text-blue-400', rule: 'border-blue-500' },
  regional: { shell: 'bg-[#f0eee8] text-slate-950 border-red-900/30', accent: 'text-red-800', rule: 'border-red-800' },
  network: { shell: 'bg-[#101010] text-white border-red-600/50', accent: 'text-red-500', rule: 'border-red-600' },
};

const GroundedNewsroom = ({
  issues,
  initialIssueId,
  newsTheme,
  setNewsTheme,
  outletImages,
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
  frontPages = [],
  initialFrontPageId = '',
  onCreateFrontPage,
  onUpdateFrontPage,
  onRegenerateFrontPage,
  onUploadFrontPagePhoto,
  onOpenFrontPagePublic,
  onNotify,
}) => {
  const latestIssue = issues[issues.length - 1];
  const [selectedIssueId, setSelectedIssueId] = useState(
    issues.some((issue) => issue.id === initialIssueId) ? initialIssueId : latestIssue.id,
  );
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [frontPageIssueId, setFrontPageIssueId] = useState(initialFrontPageId);

  const selectedIssue = useMemo(
    () => issues.find((issue) => issue.id === selectedIssueId) || latestIssue,
    [issues, latestIssue, selectedIssueId],
  );
  const tabs = useMemo(() => tabsForIssue(selectedIssue), [selectedIssue]);
  const activeTheme = tabs.some((tab) => tab.theme === newsTheme) ? newsTheme : tabs[0]?.theme;
  const selectedTab = tabs.find((tab) => tab.theme === activeTheme) || tabs[0];
  const style = themeStyles[selectedTab.theme] || themeStyles.broadsheet;
  const story = selectedIssue.articles.find((entry) => entry.outletId === selectedTab.outletId);
  const imageKey = selectedTab.theme === 'on3' ? 'on3' : selectedTab.theme;
  const currentMedia = resolveNewsroomMedia({
    article: story,
    mediaLibrary,
    fallbackUrl: outletImages?.[imageKey] || outletImages?.broadsheet,
  });
  const featureImage = currentMedia.url;
  const frontPage = frontPages.find((entry) => entry.publicationId === (selectedIssue.publicationId || selectedIssue.id));
  const isFrontPageOpen = Boolean(frontPage && frontPageIssueId === (selectedIssue.publicationId || selectedIssue.id));

  const openStory = (theme) => {
    setNewsTheme(theme);
    setIsReaderOpen(true);
    setFrontPageIssueId('');
  };

  const chooseIssue = (issueId) => {
    setSelectedIssueId(issueId);
    setIsReaderOpen(false);
    setFrontPageIssueId(initialFrontPageId === issueId ? issueId : '');
  };

  return (
    <div className="relative z-10 mx-auto max-w-5xl space-y-6 pb-20 animate-in fade-in">
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-emerald-400" size={20} />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Verified career edition</p>
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
              <option key={issue.id} value={issue.id}>{issue.label || `Season ${issue.season} · Week ${issue.week}`}</option>
            ))}
          </select>
        </div>
      </div>

      {!isReaderOpen && !isFrontPageOpen && (
        <section className="rounded-2xl border border-slate-700/70 bg-slate-950/90 p-5 shadow-2xl md:p-7" aria-labelledby="weekly-coverage-title">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">{selectedIssue.label || `Season ${selectedIssue.season} · Week ${selectedIssue.week}`}</p>
            <h2 id="weekly-coverage-title" className="mt-1 text-2xl font-black uppercase text-white md:text-3xl">This Week&rsquo;s Coverage</h2>
            <p className="mt-2 text-sm text-slate-400">Choose any newsroom below to open its complete article.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {tabs.map(({ theme, outletId, label, icon: Icon }) => {
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

          </div>
          {selectedIssue.week > 0 && selectedIssue.editionType !== 'recruiting' && (!readOnly || frontPage) && (
            <div className="mt-5 flex flex-col gap-4 rounded-xl border border-amber-400/30 bg-amber-950/15 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300"><FileImage size={15} /> Postgame keepsake</p><h3 className="mt-1 text-xl font-black uppercase text-white">{frontPage ? 'Printable front page ready' : 'Create a one-page newspaper front page'}</h3><p className="mt-1 text-xs leading-relaxed text-slate-400">Uses this week&rsquo;s verified score, player line, dynamic story, game photo, and optional teammate cards.</p></div>
              <button type="button" onClick={() => { if (!frontPage) onCreateFrontPage(selectedIssue.publicationId || selectedIssue.id); setFrontPageIssueId(selectedIssue.publicationId || selectedIssue.id); }} className="shrink-0 rounded-xl bg-amber-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-950">{frontPage ? 'Open front page' : 'Generate front page'}</button>
            </div>
          )}
        </section>
      )}

      {isReaderOpen && !isFrontPageOpen && (
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

      {isFrontPageOpen && frontPage ? (
        <PostgameFrontPage
          page={frontPage}
          mediaLibrary={mediaLibrary}
          readOnly={readOnly}
          onUpdate={(patch) => onUpdateFrontPage(frontPage.publicationId, patch)}
          onRegenerate={() => onRegenerateFrontPage(frontPage.publicationId)}
          onUploadPhoto={(file, target) => onUploadFrontPagePhoto(file, { ...target, publicationId: frontPage.publicationId })}
          onOpenPublic={() => onOpenFrontPagePublic(frontPage.publicationId)}
          onNotify={onNotify}
          onClose={() => setFrontPageIssueId('')}
        />
      ) : null}

      {isReaderOpen && !isFrontPageOpen && story ? (
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
