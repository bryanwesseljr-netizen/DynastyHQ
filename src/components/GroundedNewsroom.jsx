import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowRight, BookOpen, ChevronLeft, FileImage, Loader2, Newspaper, PenLine, RefreshCw, Star, Trash2, Zap,
} from 'lucide-react';
import { doc, runTransaction } from 'firebase/firestore';
import NewsroomMediaManager from './NewsroomMediaManager';
import NewsroomArticleReader from './NewsroomArticleReader';
import PostgameFrontPage from './PostgameFrontPage';
import { resolveNewsroomMedia } from '../domain/newsroomMedia';
import { presentationVariables, resolveNewsroomPresentation } from '../domain/newsroomPresentation';
import { appId, auth, db } from '../firebase';

const iconForOutlet = (outletId) => ({
  bolt: Zap,
  recruiting: Star,
  filmroom: Activity,
  national: BookOpen,
}[outletId] || Newspaper);

const publicationLabelForStory = (story = {}) => {
  const presentation = resolveNewsroomPresentation(story);
  if (presentation.audience === 'local') return 'Bearcats Insider';
  if (presentation.audience === 'regional') return 'Cincinnati Enquirer';
  if (presentation.audience === 'national' || presentation.audience === 'national-lead') return 'ESPN';
  return story.outletName;
};

const tabsForIssue = (issue) => (issue?.articles || []).map((story) => ({
  theme: story.theme || story.outletId,
  outletId: story.outletId,
  label: publicationLabelForStory(story),
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
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [frontPageIssueId, setFrontPageIssueId] = useState(initialFrontPageId);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveMessage, setArchiveMessage] = useState(null);

  const selectedIssue = useMemo(
    () => issues.find((issue) => issue.id === selectedIssueId) || latestIssue,
    [issues, latestIssue, selectedIssueId],
  );
  const tabs = useMemo(() => tabsForIssue(selectedIssue), [selectedIssue]);
  const activeTheme = tabs.some((tab) => tab.theme === newsTheme) ? newsTheme : tabs[0]?.theme;
  const selectedTab = tabs.find((tab) => tab.outletId === selectedOutletId)
    || tabs.find((tab) => tab.theme === activeTheme)
    || tabs[0];
  const story = selectedIssue.articles.find((entry) => entry.outletId === selectedTab?.outletId);
  const imageKey = selectedTab?.theme === 'on3' ? 'on3' : selectedTab?.theme;
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

  useEffect(() => {
    if (issues.some((issue) => issue.id === selectedIssueId)) return;
    const nextId = issues[issues.length - 1]?.id || '';
    if (nextId) setSelectedIssueId(nextId);
    setSelectedOutletId('');
    setIsReaderOpen(false);
    setFrontPageIssueId('');
  }, [issues, selectedIssueId]);

  const openStory = (theme, outletId) => {
    setNewsTheme(theme);
    setSelectedOutletId(outletId || '');
    setIsReaderOpen(true);
    setFrontPageIssueId('');
  };

  const chooseIssue = (issueId) => {
    setSelectedIssueId(issueId);
    setSelectedOutletId('');
    setIsReaderOpen(false);
    setFrontPageIssueId(initialFrontPageId === issueId ? issueId : '');
    setArchiveMessage(null);
  };

  const deleteSelectedArchive = async () => {
    if (readOnly || archiveBusy || !selectedIssue?.id) return;
    const owner = auth?.currentUser;
    if (!owner || !db) {
      setArchiveMessage({ type: 'error', text: 'Sign in as the DynastyHQ owner before deleting a Newsroom archive.' });
      return;
    }

    const archiveLabel = selectedIssue.label || `Season ${selectedIssue.season} · Week ${selectedIssue.week}`;
    const confirmed = window.confirm(
      `Delete “${archiveLabel}” from the Newsroom archive dropdown?\n\nThis removes only this Newsroom archive. Your verified game, Fact Ledger, Chronicle history, and podcast episode are preserved.`,
    );
    if (!confirmed) return;

    setArchiveBusy(true);
    setArchiveMessage(null);
    try {
      const masterRef = doc(db, 'artifacts', appId, 'users', owner.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(masterRef);
        if (!snapshot.exists()) throw new Error('The DynastyHQ master save could not be found.');
        const data = snapshot.data();
        const currentIssues = Array.isArray(data.newsroomIssues) ? data.newsroomIssues : [];
        const nextIssues = currentIssues.filter((entry) => entry.id !== selectedIssue.id);
        if (nextIssues.length === currentIssues.length) throw new Error('That Newsroom archive was already removed.');
        const remoteRevision = Number(data?._sync?.revision) || 0;
        transaction.update(masterRef, {
          newsroomIssues: nextIssues,
          '_sync.revision': remoteRevision + 1,
          '_sync.deviceId': data?._sync?.deviceId || 'newsroom-archive-manager',
          '_sync.updatedAt': new Date().toISOString(),
        });
      });

      const remaining = issues.filter((issue) => issue.id !== selectedIssue.id);
      const nextId = remaining[remaining.length - 1]?.id || '';
      setSelectedIssueId(nextId);
      setSelectedOutletId('');
      setIsReaderOpen(false);
      setFrontPageIssueId('');
      setArchiveMessage({ type: 'success', text: 'Newsroom archive deleted. Verified career history and podcast data were preserved.' });
    } catch (error) {
      setArchiveMessage({ type: 'error', text: error?.message || 'The Newsroom archive could not be deleted.' });
    } finally {
      setArchiveBusy(false);
    }
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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <select
                value={selectedIssue.id}
                onChange={(event) => chooseIssue(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white sm:min-w-56"
                aria-label="Choose weekly newsroom edition"
              >
                {[...issues].reverse().map((issue) => (
                  <option key={issue.id} value={issue.id}>{issue.label || `Season ${issue.season} · Week ${issue.week}`}</option>
                ))}
              </select>
              {!readOnly && (
                <button
                  type="button"
                  disabled={archiveBusy || isWriting}
                  onClick={deleteSelectedArchive}
                  title="Delete selected Newsroom archive only"
                  className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-red-300 transition-colors hover:border-red-400 hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-50"
                >
                  {archiveBusy ? <Loader2 className="animate-spin" size={13} /> : <Trash2 size={13} />}
                  <span className="hidden md:inline">Delete archive</span>
                </button>
              )}
            </div>
            {!readOnly && (
              <button
                type="button"
                disabled={isWriting || archiveBusy}
                onClick={() => onGenerateEdition?.(selectedPublicationId, { force: true })}
                className="flex items-center justify-center gap-2 rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-blue-200 transition-colors hover:border-blue-300 hover:bg-blue-500/20 disabled:cursor-wait disabled:opacity-60"
              >
                {isWriting ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} />}
                {isWriting ? 'Writing edition…' : (selectedIssue.editorialStatus === 'generated' ? 'Rewrite edition' : 'Write immersive edition')}
              </button>
            )}
          </div>
        </div>
        {archiveMessage && (
          <p className={`mt-3 rounded-lg border px-3 py-2 text-[10px] font-bold ${archiveMessage.type === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
            {archiveMessage.text}
          </p>
        )}
      </div>

      {!readOnly && !isReaderOpen && !isFrontPageOpen && (
        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/90 shadow-xl">
          <div className="border-b border-slate-800 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Reusable Career Media</p>
            <h2 className="mt-1 text-2xl font-black uppercase text-white">Career Photo Library</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">Upload once, reuse throughout the journey. Every saved thumbnail appears below, and new or rewritten articles can automatically choose from your game, action, recruiting, and portrait photos.</p>
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
                  key={`${theme}-${outletId}`}
                  type="button"
                  onClick={() => openStory(theme, outletId)}
                  className="dhq-newsroom-story-card group flex min-h-52 cursor-pointer flex-col rounded-xl p-5 text-left shadow-lg transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  data-editorial-layout={cardPresentation.layout}
                  data-newsroom-outlet-id={outletId}
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
            {tabs.map(({ theme, outletId, label, icon: Icon }) => (
              <button
                key={`${theme}-${outletId}`}
                type="button"
                onClick={() => openStory(theme, outletId)}
                aria-pressed={selectedTab?.outletId === outletId}
                data-newsroom-outlet-id={outletId}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${selectedTab?.outletId === outletId ? 'border-blue-400 bg-blue-600 text-white' : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-blue-400 hover:bg-slate-800 hover:text-white'}`}
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
