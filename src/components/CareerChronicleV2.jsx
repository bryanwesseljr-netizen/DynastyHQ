import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  Camera,
  ChevronRight,
  Film,
  Headphones,
  Newspaper,
  Radio,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react';
import { buildCareerChronicle2 } from '../domain/careerChronicle2.js';
import { resolveTeamMediaProfile } from '../domain/teamMediaProfile.js';
import './career-chronicle-v2.css';

const clean = (value) => String(value ?? '').trim();
const number = (value) => Number(value) || 0;

const navButton = (labels = []) => {
  const wanted = (Array.isArray(labels) ? labels : [labels]).map((value) => clean(value).toUpperCase());
  const buttons = [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')];
  return buttons.find((button) => wanted.includes(clean(button.textContent).toUpperCase()) && button.offsetParent !== null)
    || buttons.find((button) => wanted.includes(clean(button.textContent).toUpperCase()))
    || null;
};

const openNav = (labels) => navButton(labels)?.click();

const scoreFor = (game = {}) => (
  game.homeScore !== '' && game.homeScore !== undefined && game.awayScore !== '' && game.awayScore !== undefined
    ? `${game.homeScore}-${game.awayScore}`
    : 'FINAL'
);

const mediaCount = (media = {}) => (
  Number(Boolean(media.newsroom))
  + Number(Boolean(media.podcast))
  + Number(Boolean(media.official))
  + (media.photos?.length || 0)
);

const MediaButtons = ({ entry, onOpenNewsroom }) => {
  const media = entry.media || {};
  if (!mediaCount(media)) return <p className="dhq-chronicle-v2__empty-media">No finished media artifact is attached to this moment yet.</p>;
  return (
    <div className="dhq-chronicle-v2__media-actions">
      {media.official ? <span className="is-official"><Radio size={13} /> EA SPORTS NETWORK</span> : null}
      {media.newsroom ? (
        <button type="button" onClick={() => onOpenNewsroom?.(media.newsroom.publicationId || entry.publicationId)}>
          <Newspaper size={13} /> READ NEWSROOM
        </button>
      ) : null}
      {media.podcast ? (
        <button type="button" onClick={() => openNav('Podcast')}>
          <Headphones size={13} /> {media.podcast.finished ? 'PLAY THE HUDDLE' : 'OPEN THE HUDDLE'}
        </button>
      ) : null}
      {media.photos?.length ? <span><Camera size={13} /> {media.photos.length} PHOTO{media.photos.length === 1 ? '' : 'S'}</span> : null}
    </div>
  );
};

const SignatureCard = ({ entry, active, onSelect }) => {
  const game = entry.game || {};
  const totalTD = number(game.passTD) + number(game.rushTD);
  const photo = entry.media?.photos?.[0];
  return (
    <button type="button" className={`dhq-chronicle-v2__signature ${active ? 'is-active' : ''}`} onClick={() => onSelect(entry.id)}>
      {photo ? <img src={photo.url} alt="" /> : <div className="dhq-chronicle-v2__signature-art"><Film size={26} /></div>}
      <div className="dhq-chronicle-v2__signature-copy">
        <span>{entry.signatureLabel || 'SIGNATURE GAME'} · WEEK {entry.week}</span>
        <strong>{clean(game.opponent) ? `${clean(game.result).toUpperCase() || 'FINAL'} vs ${clean(game.opponent)}` : entry.title}</strong>
        <p>{scoreFor(game)} · {game.didPlay === false ? 'DNP' : `${number(game.passYds)} pass yds · ${totalTD} TD`}</p>
        <small>{entry.signatureReasons?.slice(0, 2).join(' · ')}</small>
      </div>
      <ChevronRight size={17} />
    </button>
  );
};

const CareerChronicleV2 = ({ state, onOpenNewsroom }) => {
  const chronicle = useMemo(() => buildCareerChronicle2(state), [state]);
  const [seasonId, setSeasonId] = useState(() => Number(state.currentSeason || chronicle.latestSeason?.season || 1));
  const selectedSeason = chronicle.seasons.find((season) => Number(season.season) === Number(seasonId)) || chronicle.latestSeason;
  const [selectedEntryId, setSelectedEntryId] = useState('');

  useEffect(() => {
    if (!selectedSeason) return;
    const preferred = selectedSeason.signatureGames[0] || selectedSeason.entries[0] || null;
    setSelectedEntryId(preferred?.id || '');
  }, [selectedSeason?.season]);

  if (!chronicle.seasons.length) {
    return (
      <section className="dhq-chronicle-v2 is-empty">
        <BookOpen size={42} />
        <span>CAREER CHRONICLE 2.0</span>
        <h2>Your documentary starts with the first verified week.</h2>
        <p>Once DynastyHQ has a game, milestone, or career event, this becomes the permanent film of the journey.</p>
      </section>
    );
  }

  const entry = selectedSeason?.entries.find((item) => item.id === selectedEntryId)
    || selectedSeason?.signatureGames[0]
    || selectedSeason?.entries[0];
  const theme = resolveTeamMediaProfile({ school: selectedSeason?.school || state.player?.college || state.player?.school, state });
  const careerSignatures = chronicle.signatureGames.length;
  const careerSeasons = chronicle.seasons.length;
  const totalAppearances = chronicle.seasons.reduce((sum, season) => sum + season.appearances, 0);
  const totalTD = chronicle.seasons.reduce((sum, season) => sum + season.totalTD, 0);

  return (
    <div
      className="dhq-chronicle-v2"
      style={{
        '--chronicle-primary': theme.primary,
        '--chronicle-secondary': theme.secondary,
        '--chronicle-accent': theme.accent,
      }}
    >
      <header className="dhq-chronicle-v2__hero">
        <div className="dhq-chronicle-v2__hero-copy">
          <span><Sparkles size={13} /> CAREER CHRONICLE 2.0</span>
          <h1>THE FILM OF THE CAREER</h1>
          <p>Seasons become chapters. The games that changed something become signature moments. The stories, shows, photos, and official EA SPORTS Network coverage stay attached to the week where they happened.</p>
        </div>
        <div className="dhq-chronicle-v2__career-stats">
          <div><strong>{careerSeasons}</strong><span>SEASONS</span></div>
          <div><strong>{totalAppearances}</strong><span>APPEARANCES</span></div>
          <div><strong>{totalTD}</strong><span>TOTAL TD</span></div>
          <div><strong>{careerSignatures}</strong><span>SIGNATURE GAMES</span></div>
        </div>
      </header>

      <nav className="dhq-chronicle-v2__season-nav" aria-label="Career seasons">
        {chronicle.seasons.map((season) => (
          <button
            type="button"
            key={season.season}
            className={Number(selectedSeason?.season) === Number(season.season) ? 'is-active' : ''}
            onClick={() => setSeasonId(season.season)}
          >
            <span>SEASON {season.season}</span>
            <strong>{clean(season.school) || 'PROGRAM'}</strong>
            <small>{season.record.wins}-{season.record.losses}{season.role ? ` · ${season.role}` : ''}</small>
          </button>
        ))}
      </nav>

      {selectedSeason ? (
        <>
          <section className="dhq-chronicle-v2__chapter">
            <div>
              <span><CalendarDays size={13} /> SEASON {selectedSeason.season} · {clean(selectedSeason.school).toUpperCase()}</span>
              <h2>{selectedSeason.role ? `${selectedSeason.role} CHAPTER` : 'THE SEASON CHAPTER'}</h2>
              <p>{selectedSeason.record.wins}-{selectedSeason.record.losses} team record · {selectedSeason.appearances} appearance{selectedSeason.appearances === 1 ? '' : 's'} · {selectedSeason.mediaCount} preserved media artifact{selectedSeason.mediaCount === 1 ? '' : 's'}.</p>
            </div>
            <div className="dhq-chronicle-v2__season-line">
              <div><strong>{selectedSeason.passYds}</strong><span>PASS YDS</span></div>
              <div><strong>{selectedSeason.totalTD}</strong><span>TOTAL TD</span></div>
              <div><strong>{selectedSeason.rushYds}</strong><span>RUSH YDS</span></div>
              <div><strong>{selectedSeason.signatureGames.length}</strong><span>SIGNATURES</span></div>
            </div>
          </section>

          <section className="dhq-chronicle-v2__signatures">
            <header>
              <div><span><Trophy size={13} /> SIGNATURE GAMES</span><h2>The weeks worth remembering</h2></div>
              <small>Selected automatically from verified career history</small>
            </header>
            {selectedSeason.signatureGames.length ? (
              <div className="dhq-chronicle-v2__signature-grid">
                {selectedSeason.signatureGames.map((item) => (
                  <SignatureCard key={item.id} entry={item} active={entry?.id === item.id} onSelect={setSelectedEntryId} />
                ))}
              </div>
            ) : <p className="dhq-chronicle-v2__empty-copy">No game has crossed the Signature Game threshold in this season yet. DynastyHQ will promote one when the career produces a real turning point.</p>}
          </section>

          {entry ? (
            <section className="dhq-chronicle-v2__moment">
              <div className="dhq-chronicle-v2__moment-main">
                <span>{entry.signature ? entry.signatureLabel : 'CAREER MOMENT'} · SEASON {entry.season} · WEEK {entry.week}</span>
                <h2>{entry.signature && entry.game ? `${clean(entry.game.result).toUpperCase() || 'FINAL'} vs ${clean(entry.game.opponent)}` : entry.title}</h2>
                <p>{entry.summary || entry.signatureReasons?.join(' · ') || 'A verified moment from the career timeline.'}</p>

                {entry.game ? (
                  <div className="dhq-chronicle-v2__moment-stats">
                    <div><strong>{scoreFor(entry.game)}</strong><span>SCORE</span></div>
                    <div><strong>{entry.game.didPlay === false ? 'DNP' : number(entry.game.passYds)}</strong><span>PASS YDS</span></div>
                    <div><strong>{entry.game.didPlay === false ? 'DNP' : number(entry.game.passTD) + number(entry.game.rushTD)}</strong><span>TOTAL TD</span></div>
                    <div><strong>{entry.game.didPlay === false ? '—' : number(entry.game.int)}</strong><span>INT</span></div>
                  </div>
                ) : null}

                {entry.signatureReasons?.length ? (
                  <div className="dhq-chronicle-v2__why">
                    <span>WHY DYNASTYHQ KEPT THIS ONE</span>
                    <p>{entry.signatureReasons.join(' · ')}</p>
                  </div>
                ) : null}

                <MediaButtons entry={entry} onOpenNewsroom={onOpenNewsroom} />
              </div>

              <aside className="dhq-chronicle-v2__artifact-stack">
                <span>MEMORY STACK</span>
                {entry.media?.official ? <article><Radio size={15} /><div><small>OFFICIAL IN-GAME COVERAGE</small><strong>{entry.media.official.headline || 'EA SPORTS Network coverage'}</strong><p>{entry.media.official.summary}</p></div></article> : null}
                {entry.media?.newsroom ? <article><Newspaper size={15} /><div><small>DYNASTYHQ NEWSROOM</small><strong>{entry.media.newsroom.headline || 'Newsroom edition'}</strong><p>{entry.media.newsroom.dek}</p></div></article> : null}
                {entry.media?.podcast ? <article><Headphones size={15} /><div><small>THE HUDDLE</small><strong>{entry.media.podcast.title}</strong><p>{entry.media.podcast.finished ? 'Finished audio preserved with this week.' : 'Episode transcript preserved with this week.'}</p></div></article> : null}
                {entry.media?.photos?.slice(0, 2).map((photo) => <img key={photo.id} src={photo.url} alt={photo.label || ''} />)}
                {!mediaCount(entry.media) ? <p className="dhq-chronicle-v2__empty-media">This moment currently has no media artifacts attached.</p> : null}
              </aside>
            </section>
          ) : null}

          <section className="dhq-chronicle-v2__timeline">
            <header><div><span><BookOpen size={13} /> SEASON TIMELINE</span><h2>Every verified chapter</h2></div><small>{selectedSeason.entries.length} preserved entries</small></header>
            <div className="dhq-chronicle-v2__timeline-list">
              {selectedSeason.entries.map((item) => (
                <button type="button" key={item.id} className={entry?.id === item.id ? 'is-active' : ''} onClick={() => setSelectedEntryId(item.id)}>
                  <span>W{item.week}</span>
                  <div>
                    <strong>{item.signature ? item.signatureLabel : item.title}</strong>
                    <small>{item.game ? `${clean(item.game.result).toUpperCase() || 'GAME'} · ${clean(item.game.opponent)} · ${scoreFor(item.game)}` : item.summary}</small>
                  </div>
                  <div className="dhq-chronicle-v2__timeline-icons">
                    {item.media?.official ? <Radio size={12} /> : null}
                    {item.media?.newsroom ? <Newspaper size={12} /> : null}
                    {item.media?.podcast ? <Headphones size={12} /> : null}
                    {item.media?.photos?.length ? <Camera size={12} /> : null}
                    <ChevronRight size={14} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <footer className="dhq-chronicle-v2__footer">
        <div><UserRound size={14} /><span>The Chronicle grows automatically from verified career history. No separate weekly upkeep.</span></div>
        <button type="button" onClick={() => openNav('Game Hub')}>OPEN GAME HUB <ChevronRight size={13} /></button>
      </footer>
    </div>
  );
};

export default CareerChronicleV2;
