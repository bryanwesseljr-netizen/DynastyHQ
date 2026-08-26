import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, ExternalLink, Loader2, Share2, X } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { appId, db } from '../firebase';
import { resolveNewsroomMedia } from '../domain/newsroomMedia';
import {
  buildNewsroomArticleShareId,
  buildNewsroomArticleShareUrl,
  buildSharedNewsroomArticlePayload,
} from '../domain/newsroomArticleShare.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const clean = (value) => String(value ?? '').trim();

const findVisibleArticle = (root) => {
  const articleNode = root?.querySelector('.dhq-news-article');
  const issueSelect = root?.querySelector('select[aria-label="Choose weekly newsroom edition"]');
  const headline = clean(articleNode?.querySelector('h1')?.textContent);
  if (!articleNode || !issueSelect?.value || !headline) return null;
  return { articleNode, issueId: issueSelect.value, headline };
};

const findSavedArticle = (career, visible) => {
  if (!career || !visible) return { issue: null, story: null };
  const issue = (career.newsroomIssues || []).find((entry) => (
    entry?.id === visible.issueId || entry?.publicationId === visible.issueId
  ));
  const story = issue?.articles?.find((entry) => clean(entry?.headline) === visible.headline) || null;
  return { issue: issue || null, story };
};

const NewsroomArticleSharePortal = () => {
  const { user, career } = useOwnerCareer();
  const [target, setTarget] = useState(null);
  const [visible, setVisible] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    let ownedMount = null;
    const sync = () => {
      const next = findVisibleArticle(root);
      if (!next) {
        setTarget(null);
        setVisible(null);
        if (ownedMount?.parentElement) ownedMount.remove();
        ownedMount = null;
        return;
      }

      let mount = next.articleNode.previousElementSibling;
      if (!mount || mount.dataset?.newsroomArticleShareMount !== 'true') {
        mount = document.createElement('div');
        mount.dataset.newsroomArticleShareMount = 'true';
        next.articleNode.parentNode?.insertBefore(mount, next.articleNode);
        ownedMount = mount;
      }
      setTarget((current) => current === mount ? current : mount);
      setVisible((current) => (
        current?.issueId === next.issueId && current?.headline === next.headline
          ? current
          : { issueId: next.issueId, headline: next.headline }
      ));
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (ownedMount?.parentElement) ownedMount.remove();
    };
  }, []);

  const saved = useMemo(() => findSavedArticle(career, visible), [career, visible]);
  const currentMedia = useMemo(() => {
    if (!career || !saved.story) return null;
    const theme = saved.story.theme || saved.story.outletId || '';
    const imageKey = theme === 'on3' ? 'on3' : theme;
    return resolveNewsroomMedia({
      article: saved.story,
      mediaLibrary: career.newsroomMediaLibrary || [],
      fallbackUrl: career.outletImages?.[imageKey] || career.outletImages?.broadsheet,
    });
  }, [career, saved.story]);

  useEffect(() => {
    setDialog(null);
    setMessage('');
  }, [saved.issue?.id, saved.story?.id]);

  const createShareLink = async () => {
    if (!user || !db || !saved.issue || !saved.story) return;
    setBusy(true);
    setMessage('');
    try {
      const publicationId = saved.issue.publicationId || saved.issue.id;
      const shareId = buildNewsroomArticleShareId({
        ownerId: user.uid,
        publicationId,
        articleId: saved.story.id,
      });
      if (!shareId) throw new Error('This article is missing the saved IDs required for sharing.');

      const payload = buildSharedNewsroomArticlePayload({
        ownerId: user.uid,
        issue: saved.issue,
        story: saved.story,
        featureImage: currentMedia?.url || '',
        currentMedia,
      });
      const shareRef = doc(db, 'artifacts', appId, 'public', 'data', 'shared_articles', shareId);
      await setDoc(shareRef, payload);

      const url = buildNewsroomArticleShareUrl({
        baseUrl: window.location.href,
        shareId,
      });
      setDialog({
        url,
        title: saved.story.headline || 'DynastyHQ Newsroom',
        text: saved.story.dek || saved.story.headline || 'DynastyHQ Newsroom article',
      });
    } catch (error) {
      setMessage(error?.message || 'The public article link could not be created.');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!dialog?.url) return;
    try {
      await navigator.clipboard.writeText(dialog.url);
      setMessage('Article link copied.');
    } catch {
      setMessage('Your browser could not copy the link automatically.');
    }
  };

  const nativeShare = async () => {
    if (!dialog?.url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: dialog.title, text: dialog.text, url: dialog.url });
      } else {
        await copyLink();
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setMessage('The share sheet could not be opened.');
    }
  };

  if (!target || !user || !career || !saved.issue || !saved.story) return null;

  return createPortal(
    <>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2 no-print">
        {message && <span className="mr-auto text-[10px] font-bold text-slate-400">{message}</span>}
        <button
          type="button"
          disabled={busy}
          onClick={createShareLink}
          className="flex items-center gap-2 rounded-lg border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-blue-200 transition-colors hover:border-blue-300 hover:bg-blue-500/20 disabled:cursor-wait disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
          {busy ? 'Preparing link…' : 'Share Article'}
        </button>
      </div>

      {dialog && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm no-print">
          <div className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-300">Public newsroom link</p>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">Share Article</h2>
              </div>
              <button type="button" onClick={() => setDialog(null)} className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white" aria-label="Close share article dialog"><X size={16} /></button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs font-black leading-relaxed text-white">{dialog.title}</p>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Anyone with this link can read this published story. Your Weekly Agenda, editing tools, account information, recruiting workspace, and private career controls are not included.</p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3">
              <input type="text" readOnly value={dialog.url} className="min-w-0 flex-1 bg-transparent font-mono text-[10px] text-emerald-300 outline-none" />
              <button type="button" onClick={copyLink} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white hover:bg-slate-700" title="Copy article link"><Copy size={15} /></button>
            </div>

            {message && <p className="text-center text-[10px] font-bold text-emerald-300">{message}</p>}

            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={nativeShare} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white hover:bg-blue-500"><Share2 size={14} /> Share</button>
              <button type="button" onClick={() => window.open(dialog.url, '_blank', 'noopener,noreferrer')} className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white hover:bg-slate-700"><ExternalLink size={14} /> Open Public Article</button>
            </div>
          </div>
        </div>
      )}
    </>,
    target,
  );
};

export default NewsroomArticleSharePortal;
