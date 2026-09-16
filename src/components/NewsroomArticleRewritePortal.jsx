import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, RefreshCw } from 'lucide-react';

const clean = (value) => String(value ?? '').trim();

const findNativeRewriteButton = (root) => [...root.querySelectorAll('button')]
  .find((button) => (
    !button.dataset.newsroomReaderRewrite
    && /^(rewrite edition|write immersive edition|writing edition…?)$/i.test(clean(button.textContent))
  ));

const NewsroomArticleRewritePortal = () => {
  const [mount, setMount] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;
    let ownedMount = null;
    let scheduled = false;

    const sync = () => {
      scheduled = false;
      const tabs = root.querySelector('nav[aria-label="Weekly newsroom articles"]');
      const article = root.querySelector('.dhq-news-article');
      const nativeButton = findNativeRewriteButton(root);

      if (!tabs || !article) {
        setMount(null);
        setBusy(false);
        if (ownedMount?.parentElement) ownedMount.remove();
        ownedMount = null;
        return;
      }

      setBusy(Boolean(nativeButton?.disabled || /writing edition/i.test(clean(nativeButton?.textContent))));

      if (!ownedMount || !ownedMount.isConnected || ownedMount.parentElement !== tabs) {
        if (ownedMount?.parentElement) ownedMount.remove();
        ownedMount = document.createElement('span');
        ownedMount.dataset.newsroomReaderRewriteMount = 'true';
        ownedMount.className = 'dhq-newsroom-reader-rewrite-mount';
        tabs.appendChild(ownedMount);
      }
      setMount((current) => current === ownedMount ? current : ownedMount);
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled'],
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (ownedMount?.parentElement) ownedMount.remove();
    };
  }, []);

  const rewrite = () => {
    const root = document.getElementById('root');
    const nativeButton = root ? findNativeRewriteButton(root) : null;
    if (!nativeButton || nativeButton.disabled) return;
    nativeButton.click();
  };

  if (!mount) return null;

  return createPortal(
    <button
      type="button"
      data-newsroom-reader-rewrite="true"
      disabled={busy}
      onClick={rewrite}
      className="dhq-newsroom-reader-rewrite-button flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-amber-200 transition-colors hover:border-amber-300 hover:bg-amber-400/20 disabled:cursor-wait disabled:opacity-60"
      title="Regenerate every article in this weekly edition"
    >
      {busy ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
      {busy ? 'Writing…' : 'Rewrite edition'}
    </button>,
    mount,
  );
};

export default NewsroomArticleRewritePortal;
