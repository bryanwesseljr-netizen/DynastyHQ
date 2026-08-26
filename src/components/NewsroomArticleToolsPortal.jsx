import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Image as ImageIcon, Settings2 } from 'lucide-react';

const clean = (value) => String(value ?? '').trim();

const NewsroomArticleToolsPortal = () => {
  const [mount, setMount] = useState(null);
  const [open, setOpen] = useState(false);
  const [articleKey, setArticleKey] = useState('');

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;
    let ownedMount = null;
    let scheduled = false;

    const sync = () => {
      scheduled = false;
      const article = root.querySelector('.dhq-news-article');
      const director = root.querySelector('[data-editorial-photo-director]');
      const mediaTools = root.querySelector('.dhq-newsroom-media-tools');
      const issueSelect = root.querySelector('select[aria-label="Choose weekly newsroom edition"]');
      const headline = clean(article?.querySelector('h1')?.textContent);
      const nextKey = article && headline ? `${issueSelect?.value || ''}:${headline}` : '';

      if (!article || !director || !nextKey) {
        setMount(null);
        if (ownedMount?.parentElement) ownedMount.remove();
        ownedMount = null;
        return;
      }

      if (nextKey !== articleKey) {
        setArticleKey(nextKey);
        setOpen(false);
        if (mediaTools?.open) mediaTools.open = false;
      }

      director.classList.add('dhq-newsroom-director-backstage');
      director.dataset.open = open ? 'true' : 'false';
      if (mediaTools) {
        mediaTools.classList.add('dhq-newsroom-native-media-backstage');
        if (!open && mediaTools.open) mediaTools.open = false;
      }

      if (!ownedMount || !ownedMount.isConnected) {
        ownedMount = document.createElement('div');
        ownedMount.dataset.newsroomArticleToolsMount = 'true';
        director.parentNode?.insertBefore(ownedMount, director);
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
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (ownedMount?.parentElement) ownedMount.remove();
    };
  }, [articleKey, open]);

  if (!mount) return null;

  return createPortal(
    <div className="dhq-newsroom-article-tools-toggle no-print">
      <button type="button" data-active={open} onClick={() => setOpen((value) => !value)}>
        {open ? <Settings2 size={14} /> : <ImageIcon size={14} />}
        <span>{open ? 'Close Article Media' : 'Article Media'}</span>
        <ChevronDown size={13} className={open ? 'rotate-180' : ''} />
      </button>
      {!open && <small>Photo Director · Library · QA</small>}
    </div>,
    mount,
  );
};

export default NewsroomArticleToolsPortal;
