import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Radio, Sparkles, TrendingUp } from 'lucide-react';
import { buildStorylineEngine } from '../domain/storylineEngine.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './storyline-continuity.css';

const clean = (value) => String(value ?? '').trim();
const arrayOf = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const publicationMatches = (entry, publicationId) => (
  entry?.publicationId === publicationId || entry?.id === publicationId || entry?.weekKey === publicationId
);

const contextForPublication = (career = {}, publicationId = '') => {
  const issue = arrayOf(career.newsroomIssues).find((entry) => publicationMatches(entry, publicationId));
  const update = arrayOf(career.weeklyUpdates).find((entry) => publicationMatches(entry, publicationId));
  const game = update?.game || arrayOf(career.gameLogs).find((entry) => (
    Number(entry?.season || 1) === Number(issue?.season || update?.season || 1)
    && Number(entry?.week || 0) === Number(issue?.week || update?.week || 0)
  ));
  const season = Number(issue?.season || update?.season || game?.season || career.currentSeason || 1);
  const week = Number(issue?.week ?? update?.week ?? game?.week ?? career.currentWeek ?? 0);
  return {
    season,
    week,
    publicationId: publicationId || `season-${season}-week-${week}`,
    opponent: clean(game?.opponent || issue?.opponent),
    phase: 'postgame',
  };
};

const currentContextFor = (career = {}) => {
  const setup = career.currentWeekSetup || {};
  const hasMatchup = setup.type !== 'bye' && Boolean(clean(setup.opponent));
  return {
    season: Number(career.currentSeason || 1),
    week: Number(setup.week ?? career.currentWeek ?? 0),
    opponent: clean(setup.opponent),
    phase: hasMatchup ? 'pregame' : 'current',
  };
};

const parseHubContext = (hub, career) => {
  const label = clean(hub?.querySelector('.dhq-game-hub__toolbar strong')?.textContent);
  const match = label.match(/Season\s+(\d+)\s*[·•-]\s*Week\s+(\d+)/i);
  const isPregame = Boolean(hub?.querySelector('.dhq-gh-hero.is-pregame'));
  const opponent = clean(hub?.querySelector('.dhq-gh-team--right strong')?.textContent);
  if (!match) return currentContextFor(career);
  return {
    season: Number(match[1]),
    week: Number(match[2]),
    opponent,
    phase: isPregame ? 'pregame' : 'postgame',
  };
};

const threadStatus = (thread) => {
  if (thread.changedThisWeek) return 'NEW';
  if (thread.recentlyCovered) return 'CARRYOVER';
  return 'ACTIVE';
};

const StorylineBoard = ({ model, compact = false }) => {
  const visible = model.activeThreads
    .filter((thread) => thread.editorialUse !== 'background-only' || thread.priority >= 7)
    .slice(0, compact ? 3 : 4);
  if (!visible.length) return null;

  return (
    <section className={`dhq-storyline-board ${compact ? 'is-compact' : ''}`} aria-label="Active DynastyHQ career storylines">
      <header>
        <div>
          <span><Radio size={12} /> STORYLINE ENGINE 2.0</span>
          <strong>CAREER CONTINUITY</strong>
        </div>
        <p>{model.lead?.title || 'The career story moves forward from verified history.'}</p>
      </header>
      <div className="dhq-storyline-board__threads">
        {visible.map((thread, index) => (
          <article key={thread.key} data-category={thread.category}>
            <div className="dhq-storyline-board__meta">
              <span>{index === 0 ? <Sparkles size={11} /> : index === 1 ? <TrendingUp size={11} /> : <BookOpen size={11} />} {thread.label}</span>
              <b data-status={threadStatus(thread).toLowerCase()}>{threadStatus(thread)}</b>
            </div>
            <strong>{thread.title}</strong>
            <p>{thread.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

const StorylineContinuityPortal = () => {
  const { career } = useOwnerCareer();
  const [dashboardMount, setDashboardMount] = useState(null);
  const [hubMount, setHubMount] = useState(null);
  const [hubContext, setHubContext] = useState(null);

  const dashboardModel = useMemo(() => (
    career ? buildStorylineEngine(career, currentContextFor(career)) : null
  ), [career]);
  const hubModel = useMemo(() => (
    career && hubContext ? buildStorylineEngine(career, hubContext) : null
  ), [career, hubContext]);

  useEffect(() => {
    if (!career) return undefined;
    globalThis.__dhqBuildStorylineContext = (publicationId = '') => buildStorylineEngine(
      career,
      publicationId ? contextForPublication(career, publicationId) : currentContextFor(career),
    );
    return () => {
      if (globalThis.__dhqBuildStorylineContext) delete globalThis.__dhqBuildStorylineContext;
    };
  }, [career]);

  useEffect(() => {
    let dashboardNode = null;
    let hubNode = null;
    let scheduled = false;

    const removeNode = (node) => {
      if (node?.parentElement) node.remove();
    };

    const sync = () => {
      scheduled = false;
      const dashboardAnchor = document.querySelector('.dhq-gameweek-immersion');
      if (dashboardAnchor) {
        if (!dashboardNode?.isConnected) {
          dashboardNode = document.createElement('div');
          dashboardNode.dataset.storylineHome = 'true';
          dashboardAnchor.insertAdjacentElement('afterend', dashboardNode);
        }
        setDashboardMount((current) => current === dashboardNode ? current : dashboardNode);
      } else {
        removeNode(dashboardNode);
        dashboardNode = null;
        setDashboardMount(null);
      }

      const hub = document.querySelector('.dhq-game-hub');
      const isPregame = Boolean(hub?.querySelector('.dhq-gh-hero.is-pregame'));
      const completedAnchor = hub?.querySelector('.dhq-gh-summary-grid');
      if (hub && !isPregame && completedAnchor) {
        if (!hubNode?.isConnected) {
          hubNode = document.createElement('div');
          hubNode.dataset.storylineGameHub = 'true';
          completedAnchor.insertAdjacentElement('afterend', hubNode);
        }
        setHubMount((current) => current === hubNode ? current : hubNode);
        const next = parseHubContext(hub, career || {});
        setHubContext((current) => (
          current?.season === next.season && current?.week === next.week && current?.opponent === next.opponent && current?.phase === next.phase
            ? current
            : next
        ));
      } else {
        removeNode(hubNode);
        hubNode = null;
        setHubMount(null);
        setHubContext(null);
      }
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
      removeNode(dashboardNode);
      removeNode(hubNode);
      setDashboardMount(null);
      setHubMount(null);
    };
  }, [career]);

  return (
    <>
      {dashboardMount && dashboardModel ? createPortal(<StorylineBoard model={dashboardModel} compact />, dashboardMount) : null}
      {hubMount && hubModel ? createPortal(<StorylineBoard model={hubModel} />, hubMount) : null}
    </>
  );
};

export default StorylineContinuityPortal;
