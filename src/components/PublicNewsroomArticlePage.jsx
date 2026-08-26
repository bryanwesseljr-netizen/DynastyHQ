import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Newspaper, Share2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { appId, db } from '../firebase';
import NewsroomArticleReader from './NewsroomArticleReader.jsx';

const PublicNewsroomArticlePage = ({ shareId }) => {
  const [shared, setShared] = useState(null);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!shareId || !db) {
      setError('This shared article link is incomplete.');
      return undefined;
    }

    const load = async () => {
      try {
        const shareRef = doc(db, 'artifacts', appId, 'public', 'data', 'shared_articles', shareId);
        const snapshot = await getDoc(shareRef);
        if (!snapshot.exists()) throw new Error('This shared DynastyHQ article is no longer available.');
        const data = snapshot.data();
        if (!data?.story?.headline || !data?.issue) throw new Error('This shared article is missing required story data.');
        if (!cancelled) {
          setShared(data);
          document.title = `${data.story.headline} | DynastyHQ`;
          const description = document.querySelector('meta[name="description"]');
          if (description) description.setAttribute('content', data.story.dek || data.story.headline);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || 'The shared article could not be loaded.');
      }
    };

    load();
    return () => { cancelled = true; };
  }, [shareId]);

  const shareStory = async () => {
    const title = shared?.story?.headline || 'DynastyHQ Newsroom';
    const text = shared?.story?.dek || title;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: window.location.href });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        setCopyMessage('Article link copied.');
      }
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') setCopyMessage('The article could not be shared from this browser.');
    }
  };

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-200">
        <section className="mx-auto max-w-xl rounded-2xl border border-red-500/30 bg-slate-900 p-8 text-center shadow-2xl">
          <Newspaper size={42} className="mx-auto text-red-300" />
          <h1 className="mt-4 text-2xl font-black uppercase text-white">Article unavailable</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{error}</p>
          <a href="/" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-blue-500"><ArrowLeft size={14} /> Open DynastyHQ</a>
        </section>
      </main>
    );
  }

  if (!shared) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 size={42} className="animate-spin text-amber-400" aria-label="Loading shared DynastyHQ article" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#071019] text-slate-200">
      <header className="no-print sticky top-0 z-[120] border-b border-slate-800/90 bg-[#02070a]/95 px-4 py-3 shadow-xl backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2 text-left" aria-label="Open DynastyHQ">
            <span className="flex h-8 w-7 items-center justify-center border border-amber-400 bg-amber-500/10 text-amber-400 [clip-path:polygon(50%_0,94%_20%,88%_78%,50%_100%,12%_78%,6%_20%)]"><Newspaper size={14} /></span>
            <span><strong className="block text-sm font-black uppercase tracking-[0.08em] text-white">Dynasty <span className="text-amber-400">HQ</span></strong><small className="block text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">Shared Newsroom Article</small></span>
          </a>
          <div className="flex items-center gap-2">
            {copyMessage && <span className="hidden text-[9px] font-bold text-emerald-300 sm:inline">{copyMessage}</span>}
            <button type="button" onClick={shareStory} className="flex items-center gap-2 rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-blue-200 hover:bg-blue-500/20"><Share2 size={13} /> Share</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <div className="mb-4 rounded-xl border border-slate-700/70 bg-slate-950/75 px-4 py-3 text-[10px] leading-relaxed text-slate-400 no-print">
          Read-only DynastyHQ Newsroom story · shared from a custom College Football career. Editing tools and private career data are not included.
        </div>
        <NewsroomArticleReader
          issue={shared.issue}
          story={shared.story}
          featureImage={shared.featureImage || ''}
          currentMedia={shared.currentMedia || {}}
        />
        <footer className="no-print mt-6 flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div><strong className="text-xs font-black uppercase text-white">DynastyHQ</strong><p className="mt-1 text-[10px] text-slate-500">A fan-made career companion for building an immersive custom college-football universe.</p></div>
          <a href="/" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-[9px] font-black uppercase tracking-wider text-slate-200 hover:border-blue-400"><ArrowLeft size={13} /> Open DynastyHQ</a>
        </footer>
      </main>
    </div>
  );
};

export default PublicNewsroomArticlePage;
