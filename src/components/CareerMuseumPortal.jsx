import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Award, BookOpen, Camera, Headphones, Landmark, Medal, Newspaper, Radio, Sparkles, Trophy } from 'lucide-react';
import { buildCareerMuseum } from '../domain/careerMuseum.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './career-museum.css';

const clean = (value) => String(value ?? '').trim();
const numberOf = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

const tabs = [
  ['signatures', 'SIGNATURE GAMES'],
  ['records', 'RECORD BOOK'],
  ['media', 'MEDIA VAULT'],
  ['stops', 'CAREER STOPS'],
];

const SignatureExhibit = ({ games }) => (
  <div className="dhq-museum__exhibit-grid">
    {games.length ? games.slice(0, 12).map((entry) => {
      const game = entry.game || {};
      const totalTD = numberOf(game.passTD) + numberOf(game.rushTD);
      return (
        <article key={entry.id} className="dhq-museum__signature-card">
          <span>SEASON {entry.season} · WEEK {entry.week}</span>
          <strong>{entry.signatureLabel || 'SIGNATURE GAME'}</strong>
          <h4>{clean(game.opponent) ? `${clean(game.result).toUpperCase() || 'FINAL'} vs ${clean(game.opponent)}` : entry.title}</h4>
          <p>{game.didPlay === false ? 'DNP' : `${numberOf(game.passYds)} pass yds · ${totalTD} TD`}</p>
          <small>{entry.signatureReasons?.slice(0, 2).join(' · ')}</small>
        </article>
      );
    }) : <p className="dhq-museum__empty">The first true career-defining game will be placed here automatically.</p>}
  </div>
);

const RecordBook = ({ museum }) => (
  <div className="dhq-museum__record-layout">
    <section className="dhq-museum__totals">
      <div><strong>{museum.totals.appearances}</strong><span>APPEARANCES</span></div>
      <div><strong>{museum.totals.passYds.toLocaleString()}</strong><span>PASS YDS</span></div>
      <div><strong>{museum.totals.totalTD}</strong><span>TOTAL TD</span></div>
      <div><strong>{museum.totals.rushYds.toLocaleString()}</strong><span>RUSH YDS</span></div>
    </section>
    <section className="dhq-museum__highs">
      <header><Medal size={15} /><span>CAREER HIGHS</span></header>
      {museum.highs.map((high) => (
        <article key={high.label}>
          <span>{high.label}</span>
          <strong>{high.value.toLocaleString()}</strong>
          <small>S{high.season} W{high.week}{high.opponent ? ` · vs ${high.opponent}` : ''}</small>
        </article>
      ))}
      {!museum.highs.length ? <p className="dhq-museum__empty">Career highs will populate from verified appearances.</p> : null}
    </section>
    <section className="dhq-museum__honors">
      <header><Award size={15} /><span>HONORS & RECORDS</span></header>
      {[...museum.awards, ...museum.championships, ...museum.records].slice(0, 10).map((entry) => (
        <article key={entry.id || `${entry.type}-${entry.season}-${entry.week}`}>
          <strong>{entry.title || entry.achievement || clean(entry.type).toUpperCase()}</strong>
          <small>Season {entry.season || '—'} · Week {entry.week ?? '—'}</small>
        </article>
      ))}
      {!museum.awards.length && !museum.championships.length && !museum.records.length ? <p className="dhq-museum__empty">Awards, titles and verified records will live here when they happen.</p> : null}
    </section>
  </div>
);

const MediaVault = ({ media }) => (
  <div className="dhq-museum__media-vault">
    <article><Radio size={19} /><strong>{media.official}</strong><span>EA SPORTS NETWORK</span><small>Official in-game stories preserved</small></article>
    <article><Newspaper size={19} /><strong>{media.newsroom}</strong><span>NEWSROOM STORIES</span><small>DynastyHQ reporting attached to career moments</small></article>
    <article><Headphones size={19} /><strong>{media.podcast}</strong><span>THE HUDDLE</span><small>Episodes and transcripts in the archive</small></article>
    <article><Camera size={19} /><strong>{media.photos}</strong><span>GAME PHOTOS</span><small>Visual memories linked to preserved weeks</small></article>
  </div>
);

const CareerStops = ({ schools, seasons }) => (
  <div className="dhq-museum__stops">
    {schools.length ? schools.map((stop) => {
      const schoolSeasons = seasons.filter((season) => clean(season.school).toLowerCase() === clean(stop.school).toLowerCase());
      return (
        <article key={stop.school}>
          <div className="dhq-museum__stop-mark"><Landmark size={19} /></div>
          <div><span>CAREER STOP</span><strong>{stop.school}</strong><p>{schoolSeasons.map((season) => `Season ${season.season} · ${season.record.wins}-${season.record.losses}${season.role ? ` · ${season.role}` : ''}`).join('  •  ')}</p></div>
        </article>
      );
    }) : <p className="dhq-museum__empty">Program history will appear here as the career develops.</p>}
  </div>
);

const CareerMuseum = ({ career }) => {
  const museum = useMemo(() => buildCareerMuseum(career), [career]);
  const [tab, setTab] = useState('signatures');

  return (
    <section className="dhq-museum" aria-label="Career Museum">
      <header className="dhq-museum__hero">
        <div>
          <span><Sparkles size={13} /> CAREER MUSEUM</span>
          <h2>{museum.retired ? 'THE LEGACY' : 'THE LEGACY SO FAR'}</h2>
          <p>{museum.legacySummary}</p>
        </div>
        <aside className={museum.retired ? 'is-sealed' : ''}>
          <Trophy size={22} />
          <span>{museum.legacyLabel}</span>
          <strong>{museum.signatureGames.length} SIGNATURE GAME{museum.signatureGames.length === 1 ? '' : 'S'}</strong>
        </aside>
      </header>

      <nav className="dhq-museum__tabs" aria-label="Career Museum exhibits">
        {tabs.map(([id, label]) => <button type="button" key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </nav>

      <div className="dhq-museum__gallery">
        {tab === 'signatures' ? <SignatureExhibit games={museum.signatureGames} /> : null}
        {tab === 'records' ? <RecordBook museum={museum} /> : null}
        {tab === 'media' ? <MediaVault media={museum.media} /> : null}
        {tab === 'stops' ? <CareerStops schools={museum.schools} seasons={museum.seasons} /> : null}
      </div>

      <footer><BookOpen size={13} /><span>{museum.retired ? 'Career complete · this museum is the permanent legacy record.' : 'No extra upkeep required · DynastyHQ updates the exhibits from verified career history.'}</span></footer>
    </section>
  );
};

const CareerMuseumPortal = () => {
  const { career } = useOwnerCareer();
  const [host, setHost] = useState(null);
  const owned = useRef(null);

  useEffect(() => {
    const root = document.getElementById('root') || document.body;
    const ensure = () => {
      const chronicle = document.querySelector('.dhq-chronicle-v2');
      if (!chronicle) {
        setHost(null);
        return;
      }
      let node = document.getElementById('dhq-career-museum-host');
      if (!node) {
        node = document.createElement('div');
        node.id = 'dhq-career-museum-host';
        owned.current = node;
      }
      const timeline = chronicle.querySelector('.dhq-chronicle-v2__timeline');
      if (node.parentElement !== chronicle) chronicle.appendChild(node);
      if (timeline && node.previousElementSibling !== timeline) timeline.after(node);
      setHost((current) => current === node ? current : node);
    };
    ensure();
    const observer = new MutationObserver(ensure);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      owned.current?.remove();
      owned.current = null;
    };
  }, []);

  if (!host || !career) return null;
  return createPortal(<CareerMuseum career={career} />, host);
};

export default CareerMuseumPortal;
