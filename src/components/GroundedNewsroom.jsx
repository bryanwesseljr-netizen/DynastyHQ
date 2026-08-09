import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowRight, BookOpen, ChevronLeft, FileImage, Loader2, Newspaper, PenLine, RefreshCw, Star, Zap,
} from 'lucide-react';
import NewsroomMediaManager from './NewsroomMediaManager';
import NewsroomArticleReader from './NewsroomArticleReader';
import PostgameFrontPage from './PostgameFrontPage';
import { resolveNewsroomMedia } from '../domain/newsroomMedia';
import { presentationVariables, resolveNewsroomPresentation } from '../domain/newsroomPresentation';

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

const GroundedNewsroom = ({
  issues,
  initialIssueId,
  newsTheme,
  setNewsTheme,
  outletImages,
  readOnly = false,
  mediaLibrary = [],
  mediaBusy = false,
  writingBusyId = '',
  autoAssignLibrary = true,
  onGenerateEdition,
  onUploadMedia,
  onAssignMedia,
  onClearMedia,
  onGenerateMedia,
  onToggleReference,
  onDeleteMedia,
  onSetAutoAssignLibrary,
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
  const selectedPublicationId = selectedIssue.publicationId || selectedIssue.id;
  const isWriting = writingBusyId === selectedPublicationId;

  useEffect(() => {
    if (readOnly || !onGenerateEdition || selectedIssue.editorialStatus === 'generated' || isWriting) return;
    onGenerateEdition(selectedPublicationId, { automatic: true });
  }, [isWriting, onGenerateEdition, readOnly, selectedIssue.editorialStatus, selectedPublicationId]);

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
    <div className="relative z-10 mx-auto max-w-6xl space-y-6 pb-20 animate-in fade-in">
      <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <PenLine className="mt-0.5 shrink-0 text-blue-300" size={20} />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">DynastyHQ Press Room</p>
              <p className="mt-1 text-sm text-slate-300">Every outlet follows its own beat—local news, recruiting, film study, and the national story of your career.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
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
            {!readOnly && (
              <button
                type="button"
                disabled={isWriting}
                onClick={() => onGenerateEdition?.(selectedPublicationId, { force: true })}
                className="flex items-center justify-center gap-2 rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-blue-200 transition-colors hover:border-blue-300 hover:bg-blue-500/20 disabled:cursor-wait disabled:opacity-60"
              >
                {isWriting ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} />}
                {isWriting ? 'Writing edition…' : (selectedIssue.editorialStatus === 'generated' ? 'Rewrite edition' : 'Write immersive edition')}
              </button>
            )}
          </div>
        </div>
      </div>

      {!readOnly && !isReaderOpen && !isFrontPageOpen && (
        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/90 shadow-xl">
          <div className="border-b border-slate-800 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Reusable Career Media</p>
            <h2 className="mt-1 text-2xl font-black uppercase text-white">Career Photo Library</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">Upload once, reuse throughout the journey. New and rewritten articles can automatically choose from your saved game, action, recruiting, and portrait photos.</p>
          </div>
          <NewsroomMediaManager
            lockerOnly
            mediaLibrary={mediaLibrary}
            busy={mediaBusy}
            autoAssignLibrary={autoAssignLibrary}
            onUpload={onUploadMedia}
            onToggleReference={onToggleReference}
            onDelete={onDeleteMedia}
            onSetAutoAssignLibrary={onSetAutoAssignLibrary}
          />
        </section>
      )}

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
              const cardPresentation = resolveNewsroomPresentation(cardStory);
              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => openStory(theme)}
                  className="dhq-newsroom-story-card group flex min-h-52 cursor-pointer flex-col rounded-xl p-5 text-left shadow-lg transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  data-editorial-layout={cardPresentation.layout}
                  style={presentationVariables(cardPresentation)}
                  aria-label={`Read full article from ${label}: ${cardStory.headline}`}
                >
                  <span className="dhq-newsroom-story-card__outlet flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]"><Icon size={15} /> {label}</span>
                  <span className="dhq-newsroom-story-card__headline mt-4 text-xl font-black leading-tight">{cardStory.headline}</span>
                  <span className="dhq-newsroom-story-card__dek mt-3 line-clamp-2 text-sm leading-relaxed">{cardStory.dek}</span>
                  <span className="dhq-newsroom-story-card__action mt-auto flex items-center gap-2 pt-5 text-xs font-black uppercase tracking-wider transition-colors">Read full article <ArrowRight size={15} /></span>
                </button>
              );
            })}

          </div>
          {selectedIssue.week > 0 && !['recruiting', 'high-school-evaluation'].includes(selectedIssue.editionType) && (!readOnly || frontPage) && (
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
          key={`${frontPage.publicationId}-${frontPage.revision}`}
          page={frontPage}
          mediaLibrary={mediaLibrary}
          readOnly={readOnly}
          onUpdate={(patch, successMessage) => onUpdateFrontPage(frontPage.publicationId, patch, successMessage)}
          onRegenerate={() => onRegenerateFrontPage(frontPage.publicationId)}
          onUploadPhoto={(file, target) => onUploadFrontPagePhoto(file, { ...target, publicationId: frontPage.publicationId })}
          onOpenPublic={() => onOpenFrontPagePublic(frontPage.publicationId)}
          onNotify={onNotify}
          onClose={() => setFrontPageIssueId('')}
        />
      ) : null}

      {isReaderOpen && !isFrontPageOpen && story ? (
        <>
          <NewsroomArticleReader
            issue={selectedIssue}
            story={story}
            featureImage={featureImage}
            currentMedia={currentMedia}
          />
          {!readOnly && (
            <details className="dhq-newsroom-media-tools overflow-hidden rounded-xl border border-slate-700 bg-slate-950/90 shadow-xl">
              <summary className="cursor-pointer px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-200">Manage this article&rsquo;s photo</summary>
              <NewsroomMediaManager
                issue={selectedIssue}
                article={story}
                mediaLibrary={mediaLibrary}
                currentMedia={currentMedia}
                busy={mediaBusy}
                autoAssignLibrary={autoAssignLibrary}
                onUpload={onUploadMedia}
                onAssign={onAssignMedia}
                onClear={onClearMedia}
                onGenerate={onGenerateMedia}
                onToggleReference={onToggleReference}
                onDelete={onDeleteMedia}
                onSetAutoAssignLibrary={onSetAutoAssignLibrary}
              />
            </details>
          )}
        </>
      ) : null}
    </div>
  );
};

export default GroundedNewsroom;
