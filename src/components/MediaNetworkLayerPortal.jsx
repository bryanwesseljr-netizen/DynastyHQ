import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ChevronRight, Headphones, Newspaper, Radio, ShieldCheck } from 'lucide-react';
import { buildMediaNetworkLayer, latestCompletedMediaContext } from '../domain/mediaNetworkLayer.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './media-network-layer.css';

const clean = (value) => String(value ?? '').trim();

const visibleNavButton = (label) => {
  const matcher = new RegExp(`^${label}$`, 'i');
  const buttons = [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')]
    .filter((button) => matcher.test(clean(button.textContent)));
  return buttons.find((button) => button.offsetParent !== null) || buttons[0] || null;
};

const parseHubContext = () => {
  const label = clean(document.querySelector('.dhq-game-hub__toolbar strong')?.textContent);
  const match = label.match(/season\s+(\d+)\s*[·•-]?\s*week\s+(\d+)/i);
  if (!match) return null;
  return { season: Number(match[1]), week: Number(match[2]) };
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

const OfficialLane = ({ model, compact = false }) => {
  const { official } = model;
  const captured = official.status === 'captured';
  const legacy = official.status === 'legacy-evidence';
  return (
    <article className="dhq-media-network__lane is-official">
      <div className="dhq-media-network__lane-head">
        <span><Radio size={13} /> EA SPORTS NETWORK</span>
        <b>{captured ? 'OFFICIAL FEED' : legacy ? 'VERIFIED ARCHIVE' : 'AWAITING CAPTURE'}</b>
      </div>
      <strong>{captured ? (official.headline || 'Official game coverage') : legacy ? 'Official coverage evidence preserved' : 'No official article captured for this week'}</strong>
      {!compact ? <p>{captured
        ? (official.summary || 'Official in-game coverage captured from College Football 27.')
        : legacy
          ? `${official.factCount || 0} verified coverage fact${official.factCount === 1 ? '' : 's'} remain attached to this week. The older importer did not preserve the original article identity, so DynastyHQ will not invent one.`
          : 'This lane stays empty until an EA SPORTS Network screen is actually captured from the game.'}</p> : null}
      {official.factCount > 0 ? <small><ShieldCheck size={11} /> {official.factCount} VERIFIED FACTS</small> : null}
    </article>
  );
};

const DynastyLane = ({ model, compact = false, onNewsroom, onPodcast }) => {
  const { dynasty } = model;
  return (
    <article className="dhq-media-network__lane is-dynasty">
      <div className="dhq-media-network__lane-head">
        <span><Newspaper size={13} /> DYNASTYHQ</span>
        <b>{dynasty.newsroomReady ? 'EDITORIAL DESK' : 'DESK OPEN'}</b>
      </div>
      <strong>{dynasty.headline || 'DynastyHQ coverage follows the verified career story'}</strong>
      {!compact ? <p>{dynasty.dek || 'Newsroom, podcast, photos, and career context remain separate from the official in-game feed.'}</p> : null}
      <div className="dhq-media-network__chips">
        <button type="button" disabled={!dynasty.newsroomReady} onClick={onNewsroom}><Newspaper size={11} /> {dynasty.newsroomReady ? 'NEWSROOM READY' : 'NO ARTICLE'}</button>
        <button type="button" disabled={!dynasty.podcastReady} onClick={onPodcast}><Headphones size={11} /> {dynasty.finishedPodcast ? 'FINISHED EPISODE' : dynasty.podcastReady ? 'PODCAST READY' : 'NO EPISODE'}</button>
        {dynasty.frontPageReady ? <span><CheckCircle2 size={11} /> FRONT PAGE</span> : null}
        {dynasty.photoCount > 0 ? <span>{dynasty.photoCount} PHOTO{dynasty.photoCount === 1 ? '' : 'S'}</span> : null}
      </div>
    </article>
  );
};

const NetworkWire = ({ items = [], variant = 'hub', onNewsroom }) => {
  const visibleItems = items.slice(0, variant === 'home' || variant === 'newsroom' ? 3 : 4);
  if (!visibleItems.length) return null;
  const loopItems = [...visibleItems, ...visibleItems];
  const ariaText = visibleItems.map((item) => `${item.source}: ${item.text}`).join('. ');

  return (
    <div className="dhq-network-wire" aria-label={`Live Network Wire. ${ariaText}`}>
      <div className="dhq-network-wire__bug" aria-hidden="true">
        <span className="dhq-network-wire__live-dot" />
        <div><b>LIVE</b><strong>NETWORK WIRE</strong></div>
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
        <button type="button" className="dhq-network-wire__desk" onClick={onNewsroom}>OPEN MEDIA DESK <ChevronRight size={12} /></button>
      ) : null}
    </div>
  );
};

const NetworkBoard = ({ model, variant = 'hub', onNewsroom, onPodcast }) => {
  if (!model) return null;
  const compact = variant === 'home' || variant === 'newsroom';
  return (
    <section className={`dhq-media-network dhq-media-network--${variant}`} aria-label="DynastyHQ media network">
      <header className="dhq-media-network__header">
        <div><span>MEDIA NETWORK</span><strong>OFFICIAL FEED + DYNASTYHQ COVERAGE</strong></div>
        <p>S{model.season} · W{model.week}{model.opponent ? ` · ${model.opponent.toUpperCase()}` : ''}</p>
      </header>
      <div className="dhq-media-network__lanes">
        <OfficialLane model={model} compact={compact} />
        <DynastyLane model={model} compact={compact} onNewsroom={onNewsroom} onPodcast={onPodcast} />
      </div>
      <NetworkWire items={model.ticker} variant={variant} onNewsroom={onNewsroom} />
    </section>
  );
};

const MediaNetworkLayerPortal = () => {
  const { career } = useOwnerCareer();
  const [homeMount, setHomeMount] = useState(null);
  const [hubMount, setHubMount] = useState(null);
  const [newsroomMount, setNewsroomMount] = useState(null);
  const [hubContext, setHubContext] = useState(null);
  const [newsroomContext, setNewsroomContext] = useState(null);

  const homeContext = useMemo(() => career ? latestCompletedMediaContext(career) : null, [career]);
  const homeModel = useMemo(() => career && homeContext ? buildMediaNetworkLayer(career, homeContext) : null, [career, homeContext]);
  const hubModel = useMemo(() => career && hubContext ? buildMediaNetworkLayer(career, hubContext) : null, [career, hubContext]);
  const newsroomModel = useMemo(() => career && newsroomContext ? buildMediaNetworkLayer(career, newsroomContext) : null, [career, newsroomContext]);

  const openNewsroom = () => (visibleNavButton('The Newsroom') || visibleNavButton('Newsroom'))?.click();
  const openPodcast = () => visibleNavButton('Podcast')?.click();

  useEffect(() => {
    if (!career) return undefined;
    let homeNode = null;
    let hubNode = null;
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

      const hubAnchor = document.querySelector('.dhq-game-hub .dhq-gh-official-card');
      const nextHub = parseHubContext();
      if (hubAnchor && nextHub) {
        hubNode = hubNode?.isConnected ? hubNode : ensureMount(hubAnchor, 'beforebegin', '[data-media-network-hub="true"]', 'mediaNetworkHub');
        setHubMount((current) => current === hubNode ? current : hubNode);
        setHubContext((current) => current?.season === nextHub.season && current?.week === nextHub.week ? current : nextHub);
      } else {
        cleanup(hubNode); hubNode = null; setHubMount(null); setHubContext(null);
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
      cleanup(hubNode);
      cleanup(newsroomNode);
    };
  }, [career]);

  return (
    <>
      {homeMount && homeModel ? createPortal(<NetworkBoard model={homeModel} variant="home" onNewsroom={openNewsroom} onPodcast={openPodcast} />, homeMount) : null}
      {hubMount && hubModel ? createPortal(<NetworkBoard model={hubModel} variant="hub" onNewsroom={openNewsroom} onPodcast={openPodcast} />, hubMount) : null}
      {newsroomMount && newsroomModel ? createPortal(<NetworkBoard model={newsroomModel} variant="newsroom" onNewsroom={openNewsroom} onPodcast={openPodcast} />, newsroomMount) : null}
    </>
  );
};

export default MediaNetworkLayerPortal;
