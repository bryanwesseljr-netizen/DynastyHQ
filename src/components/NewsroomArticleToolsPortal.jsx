import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Image as ImageIcon, Settings2 } from 'lucide-react';

const clean = (value) => String(value ?? '').trim();

const NewsroomArticleToolsPortal = () => {
  const [mount, setMount] = useState(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const articleKeyRef = useRef('');

  useEffect(() => {
    openRef.current = open;
    const root = document.getElementById('root');
    if (!root) return;

    const director = root.querySelector('[data-editorial-photo-director]');
    const mediaTools = root.querySelector('.dhq-newsroom-media-tools');
    if (director) {
      director.classList.add('dhq-newsroom-director-backstage');
      director.dataset.open = open ? 'true' : 'false';
    }
    if (mediaTools) {
      mediaTools.classList.add('dhq-newsroom-native-media-backstage');
      mediaTools.dataset.open = open ? 'true' : 'false';
      mediaTools.open = open;
    }

    if (open) {
      const top = window.scrollY || document.scrollingElement?.scrollTop || 0;
      window.requestAnimationFrame(() => {
        if (document.scrollingElement) document.scrollingElement.scrollLeft = 0;
        if (document.documentElement) document.documentElement.scrollLeft = 0;
        if (document.body) document.body.scrollLeft = 0;
        window.scrollTo?.({ left: 0, top, behavior: 'auto' });
      });
    }
  }, [open]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;
    let ownedMount = null;
    let scheduled = false;

    const setBackstageVisibility = (director, mediaTools, isOpen) => {
      if (director) {
        director.classList.add('dhq-newsroom-director-backstage');
        director.dataset.open = isOpen ? 'true' : 'false';
      }
      if (mediaTools) {
        mediaTools.classList.add('dhq-newsroom-native-media-backstage');
        mediaTools.dataset.open = isOpen ? 'true' : 'false';
        mediaTools.open = isOpen;
      }
    };

    const sync = () => {
      scheduled = false;
      const article = root.querySelector('.dhq-news-article');
      const director = root.querySelector('[data-editorial-photo-director]');
      const directorMount = director?.closest('[data-editorial-photo-director-mount]') || null;
      const mediaTools = root.querySelector('.dhq-newsroom-media-tools');
      const issueSelect = root.querySelector('select[aria-label="Choose weekly newsroom edition"]');
      const headline = clean(article?.querySelector('h1')?.textContent);
      const nextKey = article && headline ? `${issueSelect?.value || ''}:${article.dataset.audience || ''}:${headline}` : '';

      if (!article || !nextKey) {
        articleKeyRef.current = '';
        openRef.current = false;
        setOpen(false);
        setMount(null);
        if (ownedMount?.parentElement) ownedMount.remove();
        ownedMount = null;
        setBackstageVisibility(director, mediaTools, false);
        return;
      }

      if (nextKey !== articleKeyRef.current) {
        articleKeyRef.current = nextKey;
        openRef.current = false;
        setOpen(false);
      }

      setBackstageVisibility(director, mediaTools, openRef.current);

      // Keep the Article Media toggle as a direct sibling in the reader grid.
      // It must never be inserted inside the Photo Director mount; nesting it there
      // lets the expanded production panel create a huge horizontal overflow on
      // Android/desktop-site layouts.
      const anchor = directorMount || mediaTools;
      const host = anchor?.parentNode;
      if (!anchor || !host) {
        setMount(null);
        if (ownedMount?.parentElement) ownedMount.remove();
        ownedMount = null;
        return;
      }

      if (!ownedMount || !ownedMount.isConnected || ownedMount.parentNode !== host) {
        if (ownedMount?.parentElement) ownedMount.remove();
        ownedMount = document.createElement('div');
        ownedMount.dataset.newsroomArticleToolsMount = 'true';
        host.insertBefore(ownedMount, anchor);
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
  }, []);

  if (!mount) return null;

  return createPortal(
    <div className="dhq-newsroom-article-tools-toggle no-print">
      <button type="button" data-active={open} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
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
