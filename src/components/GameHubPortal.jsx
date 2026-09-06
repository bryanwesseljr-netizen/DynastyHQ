import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  CloudUpload,
  FileText,
  Headphones,
  Image as ImageIcon,
  Newspaper,
  Radio,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import footballStadiumBg from '../assets/dynastyhq-football-stadium-bg.webp';
import matchupHelmets from '../assets/matchup-helmets.webp';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './game-hub.css';

const clean = (value) => String(value ?? '').trim();
const numberOf = (value) => Number(value) || 0;
const arrayOf = (value) => (Array.isArray(value) ? value : []);
const formatNumber = (value) => numberOf(value).toLocaleString();

const publicationIdFor = (season, week) => `season-${Number(season) || 1}-week-${Number(week) || 1}`;

const shortName = (value, fallback = 'TEAM') => {
  const text = clean(value) || fallback;
  if (text.length <= 14) return text.toUpperCase();
  const words = text.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.at(-1) : text).slice(0, 14).toUpperCase();
};

const gameSortValue = (game = {}) => (numberOf(game.season) * 100) + numberOf(game.week);

const visibleNavButton = (label) => {
  const matcher = new RegExp(`^${label}$`, 'i');
  const buttons = [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')]
    .filter((button) => matcher.test(clean(button.textContent)));
  return buttons.find((button) => button.offsetParent !== null) || buttons[0] || null;
};

const normalizedCollection = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean);
  return [];
};

const matchesWeek = (entry, season, week, publicationId) => (
  entry?.publicationId === publicationId
  || entry?.weekKey === publicationId
  || entry?.id === publicationId
  || (numberOf(entry?.season || 1) === numberOf(season || 1) && numberOf(entry?.week) === numberOf(week))
);

const mediaUrl = (asset = {}) => asset.downloadUrl || asset.url || asset.imageUrl || '';

const ProgressRail = ({ played, imported, verified, published }) => {
  const steps = [
    ['Played', played],
    ['Imported', imported],
    ['Verified', verified],
    ['Published', published],
  ];
  return (
    <div className="dhq-gh-progress" aria-label="Game processing status">
      {steps.map(([label, done], index) => (
        <div className={done ? 'is-complete' : ''} key={label}>
          <span>{done ? <Check size={11} /> : <Circle size={9} />}</span>
          <strong>{label}</strong>
          {index < steps.length - 1 ? <i /> : null}
        </div>
      ))}
    </div>
  );
};

const ChangeList = ({ changes = [], fallback }) => (
  <div className="dhq-gh-change-list">
    {changes.length ? changes.slice(0, 5).map((change, index) => (
      <div key={`${change.key || change.label}-${index}`}>
        <span>{change.label || change.key || 'Career update'}</span>
        <strong>
          {String(change.previous ?? change.before ?? '—')}
          <ArrowRight size={11} />
          {String(change.current ?? change.after ?? '—')}
        </strong>
      </div>
    )) : <p className="dhq-gh-empty-copy">{fallback}</p>}
  </div>
);

const GameHubPortal = () => {
  const { career, ready } = useOwnerCareer();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState('auto');
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    const isGameHubButton = (button) => {
      if (!button?.closest?.('.dhq-primary-nav, #mobile-primary-navigation')) return false;
      return clean(button.textContent).toUpperCase() === 'GAME HUB';
    };

    const syncActive = (active) => {
      document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button').forEach((button) => {
        if (clean(button.textContent).toUpperCase() === 'GAME HUB') button.classList.toggle('dhq-game-hub-active', active);
      });
    };

    const capture = (event) => {
      const button = event.target?.closest?.('button');
      if (!button) return;

      if (isGameHubButton(button)) {
        if (window.__dhqAllowLegacyGameHubOnce) {
          delete window.__dhqAllowLegacyGameHubOnce;
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        setSelection('auto');
        setOpen(true);
        syncActive(true);
        return;
      }

      if (openRef.current && button.closest?.('.dhq-primary-nav, #mobile-primary-navigation, .dhq-broadcast-header__actions, .dhq-broadcast-header-logo')) {
        setOpen(false);
        syncActive(false);
      }
    };

    root.addEventListener('click', capture, true);
    return () => {
      root.removeEventListener('click', capture, true);
      syncActive(false);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dhq-game-hub-open', open);
    return () => document.body.classList.remove('dhq-game-hub-open');
  }, [open]);

  const model = useMemo(() => {
    const state = career || {};
    const player = state.player || {};
    const rtg = state.rtg || {};
    const school = clean(player.college || player.school) || 'YOUR PROGRAM';
    const currentSeason = numberOf(state.currentSeason) || 1;
    const currentWeek = numberOf(state.currentWeek) || 1;
    const setup = state.currentWeekSetup || {};

    const games = arrayOf(state.gameLogs)
      .filter((game) => game && game.didPlay !== false && game.stage !== 'high-school' && !game.evaluation && clean(game.opponent))
      .sort((left, right) => gameSortValue(right) - gameSortValue(left));

    const currentSeasonGames = games.filter((game) => numberOf(game.season || 1) === currentSeason);
    const seasonWins = currentSeasonGames.filter((game) => clean(game.result).toUpperCase() === 'W').length;
    const seasonLosses = currentSeasonGames.filter((game) => clean(game.result).toUpperCase() === 'L').length;
    const hasCurrentMatchup = setup.type !== 'bye' && Boolean(clean(setup.opponent));
    const autoSelection = hasCurrentMatchup ? 'current' : (games[0] ? publicationIdFor(games[0].season, games[0].week) : 'current');
    const resolvedSelection = selection === 'auto' ? autoSelection : selection;

    const selectedGame = resolvedSelection === 'current'
      ? null
      : games.find((game) => publicationIdFor(game.season, game.week) === resolvedSelection) || games[0] || null;

    const season = selectedGame ? numberOf(selectedGame.season || 1) : currentSeason;
    const week = selectedGame ? numberOf(selectedGame.week) : currentWeek;
    const publicationId = publicationIdFor(season, week);
    const weeklyUpdate = arrayOf(state.weeklyUpdates).find((entry) => matchesWeek(entry, season, week, publicationId)) || null;
    const issue = arrayOf(state.newsroomIssues).find((entry) => matchesWeek(entry, season, week, publicationId)) || null;
    const podcast = arrayOf(state.podcastEpisodes).find((entry) => matchesWeek(entry, season, week, publicationId) || entry?.id === `podcast-${publicationId}`) || null;
    const frontPage = arrayOf(state.postgameFrontPages).find((entry) => matchesWeek(entry, season, week, publicationId)) || null;
    const coverageReference = normalizedCollection(state.coverageReferences).find((entry) => matchesWeek(entry, season, week, publicationId)) || null;
    const milestones = arrayOf(state.careerMilestones).filter((entry) => matchesWeek(entry, season, week, publicationId));
    const chronicleEntry = arrayOf(state.careerChronicle).find((entry) => matchesWeek(entry, season, week, publicationId)) || null;

    const officialPool = [
      ...normalizedCollection(state.eaSportsNetworkArticles),
      ...normalizedCollection(state.eaSportsNetwork),
      ...normalizedCollection(state.officialCoverage),
    ];
    const official = officialPool.find((entry) => matchesWeek(entry, season, week, publicationId)) || null;

    const mediaLibrary = arrayOf(state.newsroomMediaLibrary);
    const assetIds = new Set();
    if (frontPage?.gamePhotoAssetId) assetIds.add(frontPage.gamePhotoAssetId);
    if (frontPage?.player?.headshotAssetId) assetIds.add(frontPage.player.headshotAssetId);
    arrayOf(issue?.articles).forEach((article) => {
      if (article?.mediaAssetId) assetIds.add(article.mediaAssetId);
      if (article?.assignedMedia?.id) assetIds.add(article.assignedMedia.id);
    });
    const media = mediaLibrary
      .filter((asset) => assetIds.has(asset.id) && mediaUrl(asset))
      .slice(0, 6);

    const game = selectedGame;
    const playerStats = game ? {
      passYds: numberOf(game.passYds),
      passTD: numberOf(game.passTD),
      rushYds: numberOf(game.rushYds),
      rushTD: numberOf(game.rushTD),
      interceptions: numberOf(game.int),
    } : null;
    const totalTD = playerStats ? playerStats.passTD + playerStats.rushTD : 0;
    const scoreMargin = game ? Math.abs(numberOf(game.homeScore) - numberOf(game.awayScore)) : null;
    const rtgChanges = arrayOf(weeklyUpdate?.rtgChanges);
    const primaryArticle = arrayOf(issue?.articles)[0] || null;

    const leadStory = primaryArticle?.headline
      || (game
        ? `${clean(game.result).toUpperCase() === 'W' ? 'Win' : 'Result'} vs. ${clean(game.opponent)}`
        : (hasCurrentMatchup ? `${school} prepares for ${clean(setup.opponent)}` : 'Current week awaiting matchup data'));
    const secondaryStory = milestones[0]?.title
      || rtgChanges[0]?.label
      || (game && totalTD >= 3 ? `${totalTD}-touchdown performance` : 'Career progression remains tied to verified data');
    const coverageLevel = game && (totalTD >= 3 || scoreMargin <= 7 || milestones.length) ? 'Feature package' : game ? 'Standard package' : 'Pregame watch';

    const imported = Boolean(weeklyUpdate && numberOf(weeklyUpdate.sourceCount) > 0);
    const verified = Boolean(weeklyUpdate?.status === 'published' || chronicleEntry);
    const published = Boolean(issue || podcast || frontPage || verified);

    return {
      state,
      player,
      rtg,
      school,
      currentSeason,
      currentWeek,
      setup,
      games,
      seasonWins,
      seasonLosses,
      resolvedSelection,
      selectedGame,
      season,
      week,
      publicationId,
      weeklyUpdate,
      issue,
      podcast,
      frontPage,
      coverageReference,
      official,
      milestones,
      chronicleEntry,
      media,
      playerStats,
      rtgChanges,
      primaryArticle,
      leadStory,
      secondaryStory,
      coverageLevel,
      hasCurrentMatchup,
      imported,
      verified,
      published,
    };
  }, [career, selection]);

  if (!open || typeof document === 'undefined') return null;

  const close = () => setOpen(false);

  const goToNav = (label) => {
    close();
    window.setTimeout(() => visibleNavButton(label)?.click(), 20);
  };

  const openImport = () => {
    window.dispatchEvent(new CustomEvent('dynastyhq:open-session-import'));
  };

  const openAdvanced = () => {
    close();
    window.__dhqAllowLegacyGameHubOnce = true;
    window.setTimeout(() => visibleNavButton('Game Hub')?.click(), 20);
  };

  const selectedGame = model.selectedGame;
  const isCompleted = Boolean(selectedGame);
  const opponent = isCompleted ? clean(selectedGame.opponent) : clean(model.setup.opponent) || 'OPPONENT TBD';
  const teamRecord = `${model.seasonWins}-${model.seasonLosses}`;
  const teamScore = isCompleted ? selectedGame.homeScore : '—';
  const opponentScore = isCompleted ? selectedGame.awayScore : '—';
  const result = isCompleted ? clean(selectedGame.result).toUpperCase() : '';

  return createPortal(
    <section className="dhq-game-hub" aria-label="Game Hub">
      <div className="dhq-game-hub__background" style={{ backgroundImage: `linear-gradient(rgba(1,8,14,.5), rgba(1,8,14,.82)), url(${footballStadiumBg})` }} aria-hidden="true" />
      <div className="dhq-game-hub__scroll">
        <div className="dhq-game-hub__frame">
          <header className="dhq-game-hub__toolbar">
            <div>
              <span>GAME HUB</span>
              <strong>Season {model.season} · Week {model.week}</strong>
            </div>
            <div className="dhq-game-hub__toolbar-actions">
              <label>
                <span>VIEW</span>
                <select value={model.resolvedSelection} onChange={(event) => setSelection(event.target.value)}>
                  <option value="current">Current Week</option>
                  {model.games.map((game) => {
                    const id = publicationIdFor(game.season, game.week);
                    return <option key={id} value={id}>S{game.season || 1} W{game.week} · {clean(game.opponent)}</option>;
                  })}
                </select>
                <ChevronDown size={13} />
              </label>
              <button type="button" onClick={() => goToNav('Home')}>HOME</button>
            </div>
          </header>

          {!ready ? <div className="dhq-game-hub__loading">Loading Game Hub…</div> : (
            <>
              <section className={`dhq-gh-hero ${isCompleted ? 'is-final' : 'is-pregame'}`}>
                <div className="dhq-gh-hero__angles" aria-hidden="true" />
                <div className="dhq-gh-hero__kicker">{isCompleted ? `WEEK ${model.week} · FINAL` : 'CURRENT WEEK'}</div>
                <h1>{isCompleted ? 'THE GAME. THE STORY. THE IMPACT.' : 'GAMEWEEK STARTS HERE.'}</h1>
                <img src={matchupHelmets} alt="Football helmets facing each other" />

                <div className="dhq-gh-team dhq-gh-team--left">
                  <strong>{shortName(model.school)}</strong>
                  <span>{teamRecord}</span>
                  {isCompleted ? <b>{teamScore}</b> : <small>{model.player?.pos || 'PLAYER'} · #{model.player?.number || '—'}</small>}
                </div>
                <div className="dhq-gh-team dhq-gh-team--right">
                  <strong>{shortName(opponent, 'OPPONENT')}</strong>
                  <span>{isCompleted ? (model.setup.opponentRecord || 'FINAL') : (model.setup.opponentRecord || 'RECORD TBD')}</span>
                  {isCompleted ? <b>{opponentScore}</b> : <small>{model.setup.venue || 'VENUE TBD'}</small>}
                </div>

                <div className="dhq-gh-versus">
                  <strong>{isCompleted ? (result || 'FINAL') : 'VS'}</strong>
                  <span>{isCompleted ? `${teamScore}-${opponentScore}` : (model.setup.kickoff || 'KICKOFF TBD')}</span>
                  <small>{isCompleted ? `Season ${model.season} · Week ${model.week}` : (model.setup.venue || 'STADIUM DETAILS PENDING')}</small>
                </div>

                <div className="dhq-gh-hero__actions">
                  {!isCompleted ? <button type="button" className="is-primary" onClick={openImport}><CloudUpload size={15} /> IMPORT SESSION</button> : null}
                  <button type="button" className={isCompleted ? 'is-primary' : 'is-secondary'} onClick={() => goToNav(isCompleted && model.issue ? 'Newsroom' : 'Chronicle')}>
                    {isCompleted ? 'OPEN COVERAGE' : 'VIEW CAREER CONTEXT'} <ChevronRight size={15} />
                  </button>
                </div>
              </section>

              <ProgressRail
                played={isCompleted}
                imported={model.imported}
                verified={model.verified}
                published={model.published}
              />

              {!isCompleted ? (
                <>
                  <section className="dhq-gh-pregame-grid">
                    <article className="dhq-gh-card">
                      <div className="dhq-gh-card__heading"><span><Target size={15} /> PLAYER SNAPSHOT</span></div>
                      <div className="dhq-gh-profile-block">
                        <strong>{clean(model.player?.name) || 'Tracked Player'}</strong>
                        <p>{model.player?.pos || 'Player'} #{model.player?.number || '—'} · {model.player?.overall ? `${model.player.overall} OVR` : 'Overall not captured'}</p>
                        <div><span>Depth Chart</span><b>{model.rtg?.rank || 'Not captured'}</b></div>
                        <div><span>Coach Trust</span><b>{formatNumber(model.rtg?.coachTrust)}</b></div>
                        <div><span>Skill Points</span><b>{formatNumber(model.rtg?.skillPoints)}</b></div>
                      </div>
                    </article>

                    <article className="dhq-gh-card">
                      <div className="dhq-gh-card__heading"><span><Activity size={15} /> THIS WEEK</span></div>
                      <div className="dhq-gh-week-details">
                        <div><span>Opponent</span><strong>{model.hasCurrentMatchup ? clean(model.setup.opponent) : 'Not set yet'}</strong></div>
                        <div><span>Kickoff</span><strong>{clean(model.setup.kickoff) || 'Not captured'}</strong></div>
                        <div><span>Venue</span><strong>{clean(model.setup.venue) || 'Not captured'}</strong></div>
                        <div><span>Week note</span><strong>{clean(model.setup.note) || 'No verified note'}</strong></div>
                      </div>
                    </article>

                    <article className="dhq-gh-card dhq-gh-ready-card">
                      <div className="dhq-gh-card__heading"><span><Sparkles size={15} /> READY TO CAPTURE</span></div>
                      <h2>{model.hasCurrentMatchup ? 'Play the game. Grab the useful screens.' : 'Set the matchup, then play.'}</h2>
                      <p>Session Import is now the primary intake. Upload the scoreboard, stats, progression, EA SPORTS Network coverage, rankings, and anything else that matters. DynastyHQ will route supported facts to verification.</p>
                      <button type="button" onClick={openImport}><CloudUpload size={15} /> IMPORT SESSION</button>
                    </article>
                  </section>

                  <section className="dhq-gh-wide-card dhq-gh-official-card">
                    <div className="dhq-gh-wide-card__brand"><Radio size={19} /><span>EA SPORTS NETWORK</span><small>OFFICIAL IN-GAME MEDIA</small></div>
                    <div>
                      <h2>{model.hasCurrentMatchup ? 'Official coverage will live with this game.' : 'Game coverage has not been captured yet.'}</h2>
                      <p>When an official in-game article or network screen is imported, Game Hub is where it should be preserved alongside DynastyHQ’s own editorial layer.</p>
                    </div>
                  </section>
                </>
              ) : (
                <>
                  <section className="dhq-gh-summary-grid">
                    <article className="dhq-gh-card dhq-gh-performance-card">
                      <div className="dhq-gh-card__heading"><span><TrendingUp size={15} /> PLAYER PERFORMANCE</span></div>
                      <strong className="dhq-gh-player-name">{clean(model.player?.name) || 'Tracked Player'}</strong>
                      <div className="dhq-gh-stat-line">
                        <div><b>{formatNumber(model.playerStats?.passYds)}</b><span>PASS YDS</span></div>
                        <div><b>{formatNumber(model.playerStats?.passTD)}</b><span>PASS TD</span></div>
                        <div><b>{formatNumber(model.playerStats?.rushYds)}</b><span>RUSH YDS</span></div>
                        <div><b>{formatNumber(model.playerStats?.rushTD)}</b><span>RUSH TD</span></div>
                        <div><b>{formatNumber(model.playerStats?.interceptions)}</b><span>INT</span></div>
                      </div>
                    </article>

                    <article className="dhq-gh-card">
                      <div className="dhq-gh-card__heading"><span><Trophy size={15} /> GAME SUMMARY</span></div>
                      <div className="dhq-gh-final-score">
                        <div><span>{shortName(model.school)}</span><b>{teamScore}</b></div>
                        <i>FINAL</i>
                        <div><span>{shortName(opponent)}</span><b>{opponentScore}</b></div>
                      </div>
                      <p>{model.chronicleEntry?.summary || `${result || 'Result'} vs. ${opponent} is preserved as a verified Season ${model.season}, Week ${model.week} career event.`}</p>
                    </article>

                    <article className="dhq-gh-card">
                      <div className="dhq-gh-card__heading"><span><Sparkles size={15} /> CAREER IMPACT</span></div>
                      <ChangeList changes={model.rtgChanges} fallback="No week-over-week RTG progression changes were recorded for this published game." />
                    </article>
                  </section>

                  <section className="dhq-gh-wide-card dhq-gh-official-card">
                    <div className="dhq-gh-wide-card__brand"><Radio size={19} /><span>EA SPORTS NETWORK</span><small>OFFICIAL IN-GAME MEDIA</small></div>
                    <div className="dhq-gh-official-copy">
                      {model.official ? (
                        <>
                          <h2>{model.official.headline || model.official.title || 'Official game coverage'}</h2>
                          <p>{model.official.dek || model.official.summary || model.official.body || 'Official CFB 27 coverage captured for this game.'}</p>
                        </>
                      ) : (
                        <>
                          <h2>Official article not captured for this game.</h2>
                          <p>The slot is intentionally preserved instead of inventing an EA SPORTS Network story. When Session Import gains official-article extraction, this card is already the permanent home for it.</p>
                        </>
                      )}
                      {model.coverageReference ? <span className="dhq-gh-source-badge"><ShieldCheck size={12} /> {model.coverageReference.factCount || 0} verified editorial coverage facts attached</span> : null}
                    </div>
                  </section>

                  <section className="dhq-gh-wide-card dhq-gh-newsroom-card">
                    <div className="dhq-gh-wide-card__brand"><Newspaper size={19} /><span>DYNASTYHQ NEWSROOM</span><small>EDITORIAL COVERAGE</small></div>
                    <div className="dhq-gh-newsroom-feature">
                      {model.primaryArticle ? (
                        <>
                          <span>{model.primaryArticle.outletName || model.issue?.outletProfile?.localOutletName || 'DynastyHQ'}</span>
                          <h2>{model.primaryArticle.headline || model.primaryArticle.title}</h2>
                          <p>{model.primaryArticle.dek || arrayOf(model.primaryArticle.paragraphs)[0] || 'Verified editorial coverage is attached to this game.'}</p>
                          <button type="button" onClick={() => goToNav('Newsroom')}>OPEN NEWSROOM <ChevronRight size={14} /></button>
                        </>
                      ) : (
                        <><h2>No DynastyHQ article is attached yet.</h2><p>The game result is preserved, but this week does not currently have a generated Newsroom edition.</p></>
                      )}
                    </div>
                  </section>

                  <section className="dhq-gh-story-grid">
                    <article className="dhq-gh-card dhq-gh-story-director">
                      <div className="dhq-gh-card__heading"><span><Sparkles size={15} /> STORY DIRECTOR</span></div>
                      <div><small>LEAD STORY</small><strong>{model.leadStory}</strong></div>
                      <div><small>SECONDARY</small><strong>{model.secondaryStory}</strong></div>
                      <div><small>COVERAGE LEVEL</small><strong>{model.coverageLevel}</strong></div>
                      <p>Story priority is based only on saved game results, verified progression, milestones, and existing coverage.</p>
                    </article>

                    <article className="dhq-gh-card">
                      <div className="dhq-gh-card__heading"><span><Trophy size={15} /> MILESTONES</span></div>
                      {model.milestones.length ? (
                        <div className="dhq-gh-milestones">
                          {model.milestones.slice(0, 5).map((milestone, index) => <div key={milestone.id || index}><Trophy size={14} /><span><strong>{milestone.title || milestone.type || 'Career milestone'}</strong><small>{milestone.summary || 'Verified career achievement'}</small></span></div>)}
                        </div>
                      ) : <p className="dhq-gh-empty-copy">No dedicated career milestone was recorded for this game.</p>}
                    </article>

                    <article className="dhq-gh-card dhq-gh-podcast-panel">
                      <div className="dhq-gh-card__heading"><span><Headphones size={15} /> GRIDIRON GRIND</span></div>
                      <div className="dhq-gh-podcast-art"><Headphones size={29} /></div>
                      <strong>{model.podcast?.title || model.podcast?.showName || 'No episode attached yet'}</strong>
                      <p>{model.podcast?.summary || model.podcast?.brief || 'Podcast coverage can be attached to this permanent Game Hub once generated.'}</p>
                      <button type="button" onClick={() => goToNav('Podcast')}>{model.podcast ? 'OPEN EPISODE' : 'OPEN STUDIO'} <ChevronRight size={13} /></button>
                    </article>
                  </section>

                  <section className="dhq-gh-media-section">
                    <div className="dhq-gh-section-title"><div><span>GAME MEDIA</span><h2>Photos & Keepsakes</h2></div><ImageIcon size={22} /></div>
                    {model.media.length ? (
                      <div className="dhq-gh-media-grid">{model.media.map((asset) => <figure key={asset.id}><img src={mediaUrl(asset)} alt="" /><figcaption>{asset.referenceLabel || asset.fileName || 'Game media'}</figcaption></figure>)}</div>
                    ) : (
                      <div className="dhq-gh-media-empty"><ImageIcon size={24} /><span>No game-linked Media Library assets are attached yet.</span></div>
                    )}
                  </section>
                </>
              )}

              <details className="dhq-gh-advanced">
                <summary><span><Settings size={15} /> ADVANCED / CORRECTIONS</span><ChevronRight size={15} /></summary>
                <div>
                  <p>The old Weekly Agenda and verified scanner remain available as the correction layer. Use this only when OCR missed something, a screenshot was not captured, or you need to repair verified data.</p>
                  <button type="button" onClick={openAdvanced}><FileText size={14} /> OPEN VERIFIED DATA TOOLS</button>
                </div>
              </details>

              <footer className="dhq-gh-footer">
                <button type="button" onClick={() => goToNav('Chronicle')}><BookOpen size={14} /> CAREER CHRONICLE</button>
                <p>Game Hub · results, stories, and meaning — not data entry.</p>
              </footer>
            </>
          )}
        </div>
      </div>
    </section>,
    document.body,
  );
};

export default GameHubPortal;
