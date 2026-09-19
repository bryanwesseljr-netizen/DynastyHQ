import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ChevronRight, Headphones, Newspaper, Radio, ShieldCheck } from 'lucide-react';
import { buildMediaNetworkLayer, latestMeaningfulMediaContext } from '../domain/mediaNetworkLayer.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './media-network-layer.css';

const clean = (value) => String(value ?? '').trim();

const visibleNavButton = (label) => {
  const matcher = new RegExp(`^${label}$`, 'i');
  const buttons = [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')]
    .filter((button) => matcher.test(clean(button.textContent)));
  return buttons.find((button) => button.offsetParent !== null) || buttons[0] || null;
};

const newsroomSelect = () => document.querySelector('[aria-label="Choose weekly newsroom edition"]');

const parseNewsroomContext = (career = {}) => {
  const selectedId = clean(newsroomSelect()?.value);
  const issue = (career.newsroomIssues || []).find((entry) => entry?.id === selectedId || entry?.publicationId === selectedId);
  if (!issue) return null;
  return { season: Number(issue.season || career.currentSeason || 1), week: Number(issue.week || 0) };
};

const newsroomRoot = () => newsroomSelect()?.closest('.relative.z-10') || null;

const ensureMount = (anchor, position, selector, dataKey) => {
  if (!anchor) return null;
  const parent = position === 'beforebegin' || position === 'afterend' ? anchor.parentElement : anchor;
  const existing = parent?.querySelector(selector);
  if (existing) return existing;
  const node = document.createElement('div');
  node.dataset[dataKey] = 'true';
  anchor.insertAdjacentElement(position, node);
  return node;
};

const OfficialLane = ({ model, compact = false, onOfficial }) => {
  const { official } = model;
  const captured = official.status === 'captured';
  const legacy = official.status === 'legacy-evidence';
  return (
    <article
      className={`dhq-media-network__lane is-official ${captured ? 'is-clickable' : ''}`}
      role={captured ? 'button' : undefined}
      tabIndex={captured ? 0 : undefined}
      onClick={captured ? onOfficial : undefined}
      onKeyDown={captured ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOfficial?.(); } } : undefined}
    >
      <div className="dhq-media-network__lane-head">
        <span><Radio size={13} /> EA SPORTS NETWORK</span>
        <b>{captured ? 'OFFICIAL FEED' : legacy ? 'ARCHIVE' : 'NO STORY ON FILE'}</b>
      </div>
      <strong>{captured ? (official.headline || 'Official game coverage') : legacy ? 'Older official-coverage material is attached to this week' : 'No EA SPORTS Network article is attached to this edition'}</strong>
      {!compact ? <p>{captured
        ? (official.summary || 'Official in-game coverage captured from College Football 27.')
        : legacy
          ? 'This week predates direct article preservation, so DynastyHQ keeps the older source material without inventing an article.'
          : 'If CFB 27 publishes an article and you capture it, the original story will appear here.'}</p> : null}
      {official.factCount > 0 && legacy ? <small><ShieldCheck size={11} /> ARCHIVED SOURCE MATERIAL</small> : null}
    </article>
  );
};

const DynastyLane = ({ model, compact = false, onNewsroom, onPodcast }) => {
  const { dynasty } = model;
  const hasStory = dynasty.newsroomReady || dynasty.podcastReady;
  return (
    <article className="dhq-media-network__lane is-dynasty">
      <div className="dhq-media-network__lane-head">
        <span><Newspaper size={13} /> DYNASTYHQ</span>
        <b>{hasStory ? 'COVERAGE READY' : 'NO NEW EDITION'}</b>
      </div>
      <strong>{dynasty.headline || dynasty.podcastTitle || `No DynastyHQ feature was published for Week ${model.week}`}</strong>
      {!compact ? <p>{dynasty.dek || (hasStory ? 'The latest DynastyHQ media from this week is ready.' : 'Not every week needs a story. When the career creates one, it will appear here.')}</p> : null}
      <div className="dhq-media-network__chips">
        <button type="button" disabled={!dynasty.newsroomReady} onClick={onNewsroom}><Newspaper size={11} /> {dynasty.newsroomReady ? 'READ STORY' : 'NO ARTICLE'}</button>
        <button type="button" disabled={!dynasty.podcastReady} onClick={onPodcast}><Headphones size={11} /> {dynasty.finishedPodcast ? 'PLAY EPISODE' : dynasty.podcastReady ? 'OPEN THE HUDDLE' : 'NO EPISODE'}</button>
        {dynasty.frontPageReady ? <span><CheckCircle2 size={11} /> FRONT PAGE</span> : null}
        {dynasty.photoCount > 0 ? <span>{dynasty.photoCount} PHOTO{dynasty.photoCount === 1 ? '' : 'S'}</span> : null}
      </div>
    </article>
  );
};

const NetworkWire = ({ items = [], variant = 'home', onNewsroom }) => {
  const visibleItems = items.slice(0, variant === 'home' || variant === 'newsroom' ? 3 : 4);
  if (!visibleItems.length) return null;
  const loopItems = [...visibleItems, ...visibleItems];
  const ariaText = visibleItems.map((item) => `${item.source}: ${item.text}`).join('. ');

  return (
    <div className="dhq-network-wire" aria-label={`Network Wire. ${ariaText}`}>
      <div className="dhq-network-wire__bug" aria-hidden="true">
        <span className="dhq-network-wire__live-dot" />
        <div><b>LATEST</b><strong>NETWORK WIRE</strong></div>
      </div>
      <div className="dhq-network-wire__viewport">
        <div className="dhq-network-wire__track" aria-hidden="true">
          {loopItems.map((item, index) => (
            <span className="dhq-network-wire__item" key={`${item.source}-${index}-${item.text}`}>
              <em>{item.source}</em>
              <strong>{item.text}</strong>
              <i>◆</i>
            </span>
          ))}
        </div>
      </div>
      {variant !== 'newsroom' ? (
        <button type="button" className="dhq-network-wire__desk" onClick={onNewsroom}>OPEN NEWSROOM <ChevronRight size={12} /></button>
      ) : null}
    </div>
  );
};

const NetworkBoard = ({ model, variant = 'home', onNewsroom, onPodcast, onOfficial }) => {
  if (!model) return null;
  const compact = variant === 'home' || variant === 'newsroom';
  return (
    <section className={`dhq-media-network dhq-media-network--${variant}`} aria-label="DynastyHQ media network">
      <header className="dhq-media-network__header">
        <div><span>MEDIA NETWORK</span><strong>OFFICIAL FEED + DYNASTYHQ COVERAGE</strong></div>
        <p>S{model.season} · W{model.week}{model.opponent ? ` · ${model.opponent.toUpperCase()}` : ''}</p>
      </header>
      <div className="dhq-media-network__lanes">
        <OfficialLane model={model} compact={compact} onOfficial={onOfficial} />
        <DynastyLane model={model} compact={compact} onNewsroom={onNewsroom} onPodcast={onPodcast} />
      </div>
      {/* Latest Network Wire retired: Season Wire is the single site-wide ticker. */}
    </section>
  );
};

const MediaNetworkLayerPortal = () => {
  const { career } = useOwnerCareer();
  const [homeMount, setHomeMount] = useState(null);
  const [newsroomMount, setNewsroomMount] = useState(null);
  const [newsroomContext, setNewsroomContext] = useState(null);

  const homeContext = useMemo(() => career ? latestMeaningfulMediaContext(career) : null, [career]);
  const homeModel = useMemo(() => career && homeContext ? buildMediaNetworkLayer(career, homeContext) : null, [career, homeContext]);
  const newsroomModel = useMemo(() => career && newsroomContext ? buildMediaNetworkLayer(career, newsroomContext) : null, [career, newsroomContext]);

  const openNewsroom = () => (visibleNavButton('The Newsroom') || visibleNavButton('Newsroom'))?.click();
  const openPodcast = () => visibleNavButton('Podcast')?.click();
  const openOfficial = (model) => {
    if (!model || model.official?.status !== 'captured') return;
    window.dispatchEvent(new CustomEvent('dynastyhq:newsroom-official-focus', {
      detail: {
        headline: model.official?.headline || '',
        season: model.season,
        week: model.week,
        source: 'media-network',
      },
    }));
    openNewsroom();
  };

  useEffect(() => {
    if (!career) return undefined;
    let homeNode = null;
    let newsroomNode = null;
    let scheduled = false;

    const cleanup = (node) => node?.isConnected && node.remove();
    const sync = () => {
      scheduled = false;

      const homeAnchor = document.querySelector('#dynastyhq-command-center .dhq-broadcast-cards');
      if (homeAnchor) {
        homeNode = homeNode?.isConnected ? homeNode : ensureMount(homeAnchor, 'beforebegin', '[data-media-network-home="true"]', 'mediaNetworkHome');
        setHomeMount((current) => current === homeNode ? current : homeNode);
      } else {
        cleanup(homeNode); homeNode = null; setHomeMount(null);
      }

      const root = newsroomRoot();
      const newsroomAnchor = root?.firstElementChild;
      const nextNewsroom = parseNewsroomContext(career);
      if (newsroomAnchor && nextNewsroom) {
        newsroomNode = newsroomNode?.isConnected ? newsroomNode : ensureMount(newsroomAnchor, 'afterend', '[data-media-network-newsroom="true"]', 'mediaNetworkNewsroom');
        setNewsroomMount((current) => current === newsroomNode ? current : newsroomNode);
        setNewsroomContext((current) => current?.season === nextNewsroom.season && current?.week === nextNewsroom.week ? current : nextNewsroom);
      } else {
        cleanup(newsroomNode); newsroomNode = null; setNewsroomMount(null); setNewsroomContext(null);
      }
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      cleanup(homeNode);
      cleanup(newsroomNode);
    };
  }, [career]);

  return (
    <>
      {homeMount && homeModel ? createPortal(<NetworkBoard model={homeModel} variant="home" onNewsroom={openNewsroom} onPodcast={openPodcast} onOfficial={() => openOfficial(homeModel)} />, homeMount) : null}
      {newsroomMount && newsroomModel ? createPortal(<NetworkBoard model={newsroomModel} variant="newsroom" onNewsroom={openNewsroom} onPodcast={openPodcast} onOfficial={() => openOfficial(newsroomModel)} />, newsroomMount) : null}
    </>
  );
};

export default MediaNetworkLayerPortal;
