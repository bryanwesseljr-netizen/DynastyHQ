import React, { useMemo, useState } from 'react';
import {
  Archive,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Film,
  Headphones,
  Home,
  LayoutDashboard,
  Menu,
  Mic2,
  Newspaper,
  Pause,
  Play,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
  UploadCloud,
  UserRound,
  X,
} from 'lucide-react';
import stadium from '../assets/dynastyhq-football-stadium-bg.webp';
import bearcats from '../assets/bearcats-mark.png';
import podcastCover from '../assets/gridiron-grind-cover.webp';

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'gamehub', label: 'Game Hub', icon: LayoutDashboard },
  { id: 'newsroom', label: 'Newsroom', icon: Newspaper },
  { id: 'podcast', label: 'Podcast', icon: Headphones },
  { id: 'chronicle', label: 'Chronicle', icon: BookOpen },
];

const weekCards = [
  { week: 7, opponent: 'Purdue', label: 'POSTGAME', status: 'ARCHIVED' },
  { week: 8, opponent: 'Ohio State', label: 'GAME WEEK', status: 'ARCHIVED' },
  { week: 9, opponent: 'Michigan', label: 'LATEST', status: 'CURRENT' },
];

const storyCards = [
  {
    eyebrow: 'CAREER TURNING POINT',
    title: 'The first start against Vanderbilt changed the shape of the season.',
    copy: 'A milestone worth preserving as a real chapter, not just another row of stats.',
  },
  {
    eyebrow: 'WEEK 8 • OHIO STATE',
    title: 'Pressure, progress and the kind of week that belongs in the archive.',
    copy: 'Game data, player context and coverage come together in one story package.',
  },
  {
    eyebrow: 'WEEK 9 • MICHIGAN',
    title: 'The latest chapter gets the front-page treatment.',
    copy: 'The newest uploaded game becomes the center of the home page, Game Hub and media experience.',
  },
];

const checklist = [
  ['Game result', 'ready'],
  ['Team statistics', 'ready'],
  ['Player statistics', 'ready'],
  ['Scoring drives', 'ready'],
  ['RTG progression', 'ready'],
  ['Newsroom package', 'ready'],
];

function App() {
  const [active, setActive] = useState('home');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(9);
  const [playing, setPlaying] = useState(false);
  const [article, setArticle] = useState(null);

  const pageLabel = useMemo(
    () => navItems.find((item) => item.id === active)?.label || 'Home',
    [active],
  );

  const go = (id) => {
    setActive(id);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mock-shell">
      <header className="mock-header">
        <div className="mock-topbar">
          <button className="brand" onClick={() => go('home')} aria-label="DynastyHQ preview home">
            <span>DYNASTY</span><b>HQ</b>
            <small>YOUR CAREER. YOUR LEGACY.</small>
          </button>

          <div className="season-context">
            <span className="status-dot" />
            COLLEGE FOOTBALL 27
            <i />
            ROAD TO GLORY
            <i />
            WEEK 9
          </div>

          <div className="top-actions">
            <span className="preview-chip"><ShieldCheck size={13} /> READ-ONLY MOCKUP</span>
            <button className="profile-chip" aria-label="Player profile">
              <img src={bearcats} alt="" />
              <span><b>QB</b><small>Cincinnati</small></span>
            </button>
            <button className="mobile-toggle" onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle navigation">
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>

        <nav className={mobileOpen ? 'primary-nav is-open' : 'primary-nav'} aria-label="DynastyHQ preview navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={active === id ? 'is-active' : ''} onClick={() => go(id)}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>

        <div className="season-wire">
          <strong><Radio size={13} /> SEASON WIRE</strong>
          <span>VANDERBILT • FIRST START</span>
          <span>OHIO STATE • WEEK 8</span>
          <span>MICHIGAN • WEEK 9</span>
          <em>PREVIEW VALUES • LIVE BUILD UNCHANGED</em>
        </div>
      </header>

      <main className="mock-main">
        <div className="page-kicker">
          <span>DYNASTYHQ REDESIGN CONCEPT</span>
          <b>{pageLabel}</b>
        </div>

        {active === 'home' && <HomePage go={go} setArticle={setArticle} />}
        {active === 'gamehub' && (
          <GameHub
            selectedWeek={selectedWeek}
            setSelectedWeek={setSelectedWeek}
            go={go}
          />
        )}
        {active === 'newsroom' && <Newsroom setArticle={setArticle} />}
        {active === 'podcast' && <Podcast playing={playing} setPlaying={setPlaying} />}
        {active === 'chronicle' && <Chronicle go={go} />}

        <section className="safety-note">
          <ShieldCheck size={18} />
          <div>
            <strong>Preview boundary</strong>
            <p>This branch is presentation-only. It does not import Firebase, call DynastyHQ APIs, save career data, or write to the live build.</p>
          </div>
        </section>
      </main>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={active === id ? 'is-active' : ''} onClick={() => go(id)}>
            <Icon size={19} />
            <span>{label === 'Chronicle' ? 'Career' : label}</span>
          </button>
        ))}
      </nav>

      {article && <ArticleModal story={article} onClose={() => setArticle(null)} />}
    </div>
  );
}

function HomePage({ go, setArticle }) {
  return (
    <>
      <section className="broadcast-hero" style={{ '--hero-image': 'url(' + stadium + ')' }}>
        <div className="hero-shade" />
        <div className="hero-copy">
          <span className="network-tag"><Radio size={14} /> SATURDAY BROADCAST</span>
          <p className="hero-overline">THE LATEST CHAPTER • WEEK 9</p>
          <h1>THE STORY<br />KEEPS MOVING.</h1>
          <p className="hero-summary">
            Home becomes the place that makes you want to play the next game: current storyline first,
            career context second, and everything else one click away.
          </p>
          <div className="hero-actions">
            <button className="cta primary" onClick={() => go('gamehub')}>Enter Game Hub <ChevronRight size={17} /></button>
            <button className="cta ghost" onClick={() => go('newsroom')}>Read the front page</button>
          </div>
        </div>

        <div className="hero-scorecard">
          <div className="scorecard-top">
            <span>RTG SPOTLIGHT</span>
            <b>WEEK 9</b>
          </div>
          <div className="matchup-row">
            <div><img src={bearcats} alt="" /><span><small>HOME PROGRAM</small><b>CINCINNATI</b></span></div>
            <strong>VS</strong>
            <div className="opponent-mark">M</div>
          </div>
          <div className="scorecard-meta">
            <span><CalendarDays size={14} /> Michigan week</span>
            <span><UserRound size={14} /> QB career mode</span>
          </div>
          <button onClick={() => go('gamehub')}>Open weekly command center <ChevronRight size={15} /></button>
        </div>
      </section>

      <section className="home-grid">
        <article className="home-feature">
          <div className="section-heading">
            <div><span>THIS WEEK</span><h2>The story at a glance</h2></div>
            <button onClick={() => go('newsroom')}>All coverage <ChevronRight size={14} /></button>
          </div>
          <div className="story-stack">
            {storyCards.map((story, index) => (
              <button key={story.eyebrow} onClick={() => setArticle(story)} className={index === 0 ? 'story-row is-lead' : 'story-row'}>
                <span className="story-number">0{index + 1}</span>
                <div><small>{story.eyebrow}</small><h3>{story.title}</h3><p>{story.copy}</p></div>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </article>

        <aside className="home-sidebar">
          <section className="mini-panel coach-panel">
            <div className="mini-panel-title"><ClipboardCheck size={16} /><span>COACH'S OFFICE</span></div>
            <h3>Weekly command board</h3>
            <div className="command-list">
              {checklist.slice(0, 4).map(([label]) => (
                <div key={label}><span className="check-dot">✓</span><b>{label}</b><small>connected</small></div>
              ))}
            </div>
            <button onClick={() => go('gamehub')}>Open Game Hub <ChevronRight size={14} /></button>
          </section>

          <section className="mini-panel media-panel">
            <div className="mini-panel-title"><Headphones size={16} /><span>GRIDIRON GRIND</span></div>
            <div className="pod-mini">
              <img src={podcastCover} alt="Gridiron Grind cover" />
              <div><small>LATEST EPISODE</small><b>Michigan Week: the next chapter</b><span>Transcript + NotebookLM source pack</span></div>
            </div>
            <button onClick={() => go('podcast')}>Go to podcast <ChevronRight size={14} /></button>
          </section>
        </aside>
      </section>

      <section className="chronicle-strip">
        <div><span>CAREER CHRONICLE</span><h2>Not just stats. A season you can look back on.</h2></div>
        <div className="milestone-pills">
          <span>Vanderbilt • First Start</span>
          <span>Ohio State • Week 8</span>
          <span>Michigan • Week 9</span>
        </div>
        <button onClick={() => go('chronicle')}>Open Chronicle <ChevronRight size={15} /></button>
      </section>
    </>
  );
}

function GameHub({ selectedWeek, setSelectedWeek, go }) {
  const selected = weekCards.find((item) => item.week === selectedWeek) || weekCards[2];

  return (
    <section className="workspace-shell coach-office">
      <header className="workspace-header">
        <div>
          <span className="workspace-eyebrow"><ClipboardCheck size={14} /> COACH'S OFFICE</span>
          <h1>GAME HUB</h1>
          <p>One organized command center for the week: game data, verification, player development, scoring drives and media.</p>
        </div>
        <div className="week-switcher">
          {weekCards.map((item) => (
            <button key={item.week} className={selectedWeek === item.week ? 'is-active' : ''} onClick={() => setSelectedWeek(item.week)}>
              <small>WK {item.week}</small><b>{item.opponent}</b><span>{item.status}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="coach-grid">
        <section className="clipboard-board">
          <div className="board-top">
            <span>WEEK {selected.week}</span>
            <b>{selected.opponent.toUpperCase()}</b>
            <em>{selected.label}</em>
          </div>
          <div className="field-diagram" aria-hidden="true">
            <span className="yard y1" /><span className="yard y2" /><span className="yard y3" /><span className="yard y4" />
            <i className="route r1" /><i className="route r2" /><i className="route r3" />
            <b className="x x1">X</b><b className="x x2">X</b><b className="o o1">O</b><b className="o o2">O</b><b className="o o3">O</b>
          </div>
          <div className="board-copy">
            <small>WEEKLY OBJECTIVE</small>
            <h2>Turn everything you captured into one clean record.</h2>
            <p>The layout keeps the practical stuff together without losing the college-football atmosphere.</p>
          </div>
        </section>

        <section className="data-board">
          <div className="panel-heading"><div><span>VERIFIED WEEK PACKET</span><h2>Data checklist</h2></div><ShieldCheck size={20} /></div>
          <div className="verify-list">
            {checklist.map(([label]) => (
              <div key={label}><span>✓</span><b>{label}</b><small>READY</small></div>
            ))}
          </div>
          <button className="wide-button"><UploadCloud size={16} /> Review uploaded week</button>
        </section>

        <section className="player-board">
          <div className="panel-heading"><div><span>PLAYER DEVELOPMENT</span><h2>QB room</h2></div><Trophy size={19} /></div>
          <div className="player-card">
            <div className="jersey-card">QB</div>
            <div><small>CINCINNATI</small><h3>Road to Glory</h3><p>Progression, regression and weekly status live beside the game — not buried in another screen.</p></div>
          </div>
          <div className="meter-row"><span>COACH TRUST</span><i><b style={{ width: '72%' }} /></i><strong>UP</strong></div>
          <div className="meter-row"><span>PLAYER FORM</span><i><b style={{ width: '64%' }} /></i><strong>STEADY</strong></div>
          <div className="meter-row"><span>CAREER MOMENTUM</span><i><b style={{ width: '81%' }} /></i><strong>RISING</strong></div>
        </section>

        <section className="drive-board">
          <div className="panel-heading"><div><span>SCORING SUMMARY</span><h2>Drive story</h2></div><BarChart3 size={19} /></div>
          <div className="drive-timeline">
            <div><span>Q1</span><b>Opening phase</b><small>Scoring drives would populate here from your uploaded game data.</small></div>
            <div><span>Q2</span><b>Momentum swing</b><small>The board can surface the moments that matter instead of raw tables only.</small></div>
            <div><span>Q4</span><b>Closing sequence</b><small>Designed to feed Newsroom, Podcast and Chronicle from the same packet.</small></div>
          </div>
        </section>
      </div>

      <div className="workspace-actions">
        <button onClick={() => go('newsroom')}>Open generated coverage <Newspaper size={15} /></button>
        <button onClick={() => go('podcast')}>Open podcast package <Headphones size={15} /></button>
        <button onClick={() => go('chronicle')}>View career impact <Archive size={15} /></button>
      </div>
    </section>
  );
}

function Newsroom({ setArticle }) {
  return (
    <section className="journal-shell">
      <header className="journal-masthead">
        <div className="journal-date">DYNASTYHQ • COLLEGE FOOTBALL EDITION</div>
        <h1>THE FOOTBALL JOURNAL</h1>
        <div className="journal-rule"><span>FRONT PAGE</span><b>RTG CAREER DESK</b><span>WEEK 9</span></div>
      </header>

      <div className="journal-grid">
        <button className="lead-article" onClick={() => setArticle(storyCards[2])}>
          <div className="lead-photo" style={{ backgroundImage: 'linear-gradient(0deg, rgba(3,8,12,.96), rgba(3,8,12,.05)), url(' + stadium + ')' }}>
            <span>WEEK 9 • MICHIGAN</span>
          </div>
          <div className="lead-copy">
            <small>THE LATEST CHAPTER</small>
            <h2>Michigan week moves to the center of the story.</h2>
            <p>Instead of feeling like a database, the Newsroom reads like the sports page built around your career.</p>
            <span>READ FEATURE <ChevronRight size={14} /></span>
          </div>
        </button>

        <aside className="journal-column">
          <article>
            <span>FROM THE ARCHIVE</span>
            <h3>Vanderbilt: the first start that became a career marker.</h3>
            <p>The Chronicle, Newsroom and Podcast can all reference the same milestone.</p>
          </article>
          <article>
            <span>WEEK 8</span>
            <h3>Ohio State week gets its own complete media package.</h3>
            <p>Stats and scoring context stay connected to the story rather than becoming separate chores.</p>
          </article>
          <article>
            <span>THE MEDIA DESK</span>
            <h3>Podcast transcript and NotebookLM pack live beside the coverage.</h3>
            <p>No hunting around for the material generated from the week.</p>
          </article>
        </aside>
      </div>

      <div className="journal-secondary">
        {storyCards.map((story) => (
          <button key={story.eyebrow} onClick={() => setArticle(story)}>
            <span>{story.eyebrow}</span><h3>{story.title}</h3><p>{story.copy}</p><b>OPEN STORY <ChevronRight size={13} /></b>
          </button>
        ))}
      </div>
    </section>
  );
}

function Podcast({ playing, setPlaying }) {
  return (
    <section className="podcast-shell">
      <header className="podcast-header">
        <div><span className="workspace-eyebrow"><Mic2 size={14} /> DYNASTYHQ AUDIO</span><h1>THE GRIDIRON GRIND</h1><p>A cleaner media-studio view focused on the episode, transcript and NotebookLM source material.</p></div>
        <span className="studio-live"><span className="status-dot" /> STUDIO READY</span>
      </header>

      <div className="podcast-feature">
        <div className="podcast-art-wrap"><img src={podcastCover} alt="Gridiron Grind podcast cover" /><span>WEEK 9 • MICHIGAN</span></div>
        <div className="episode-copy">
          <small>LATEST EPISODE</small>
          <h2>Michigan Week: The Latest Chapter</h2>
          <p>The finished episode sits first. Production tools stay available, but they stop competing with the thing you actually came here to hear.</p>
          <div className="audio-player">
            <button onClick={() => setPlaying((value) => !value)} aria-label={playing ? 'Pause preview' : 'Play preview'}>
              {playing ? <Pause size={21} /> : <Play size={21} />}
            </button>
            <div><span>00:00</span><i><b style={{ width: playing ? '43%' : '10%' }} /></i><span>18:42</span></div>
          </div>
          <div className="episode-actions">
            <button><Film size={15} /> View transcript</button>
            <button><BookOpen size={15} /> NotebookLM pack</button>
          </div>
        </div>
      </div>

      <div className="podcast-lower">
        <section>
          <span>EPISODE CONTENT</span>
          <h3>Everything generated from the same week packet</h3>
          <div className="content-list">
            <div><b>01</b><span><strong>Opening take</strong><small>What changed this week</small></span></div>
            <div><b>02</b><span><strong>Game story</strong><small>Team + player data</small></span></div>
            <div><b>03</b><span><strong>QB development</strong><small>Progression and regression</small></span></div>
            <div><b>04</b><span><strong>Looking ahead</strong><small>Career implications</small></span></div>
          </div>
        </section>
        <section>
          <span>ARCHIVE</span>
          <h3>Recent episodes</h3>
          <button className="episode-row"><small>WEEK 8</small><b>Ohio State Week</b><ChevronRight size={14} /></button>
          <button className="episode-row"><small>MILESTONE</small><b>First Start vs Vanderbilt</b><ChevronRight size={14} /></button>
        </section>
      </div>
    </section>
  );
}

function Chronicle({ go }) {
  const milestones = [
    { no: '01', tag: 'MILESTONE', title: 'First Start vs Vanderbilt', copy: 'The moment the career shifted from waiting to leading.' },
    { no: '02', tag: 'WEEK 8', title: 'Ohio State', copy: 'A major-game chapter preserved with its supporting media and weekly context.' },
    { no: '03', tag: 'WEEK 9', title: 'Michigan', copy: 'The newest chapter becomes the current endpoint of the documentary timeline.' },
  ];

  return (
    <section className="chronicle-shell">
      <header className="chronicle-hero" style={{ '--hero-image': 'url(' + stadium + ')' }}>
        <div>
          <span><Archive size={15} /> CAREER CHRONICLE</span>
          <h1>THE COLLEGE YEARS</h1>
          <p>The documentary layer of DynastyHQ — memorable games, turning points, media artifacts and the story of how the career changed.</p>
        </div>
        <div className="chronicle-stamp"><small>CURRENT PROGRAM</small><img src={bearcats} alt="" /><b>CINCINNATI</b></div>
      </header>

      <div className="timeline-shell">
        {milestones.map((item) => (
          <article key={item.no}>
            <div className="timeline-no">{item.no}</div>
            <div className="timeline-marker"><span /></div>
            <div className="timeline-card">
              <small>{item.tag}</small><h2>{item.title}</h2><p>{item.copy}</p>
              <div><span>ARTICLE</span><span>PODCAST</span><span>GAME DATA</span></div>
            </div>
          </article>
        ))}
      </div>

      <section className="chronicle-future">
        <Sparkles size={20} />
        <div><span>BUILT TO GROW</span><h2>When RTG becomes Dynasty, the same visual system can become your program history.</h2><p>Player career first. Coaching legacy later. One archive instead of another redesign from scratch.</p></div>
        <button onClick={() => go('home')}>Back to broadcast <ChevronRight size={15} /></button>
      </section>
    </section>
  );
}

function ArticleModal({ story, onClose }) {
  return (
    <div className="article-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <article className="article-reader" role="dialog" aria-modal="true" aria-label="Preview story">
        <button className="reader-close" onClick={onClose}><X size={19} /></button>
        <div className="reader-hero" style={{ backgroundImage: 'linear-gradient(0deg, rgba(2,7,11,.97), rgba(2,7,11,.12)), url(' + stadium + ')' }} />
        <div className="reader-body">
          <span>{story.eyebrow}</span>
          <h1>{story.title}</h1>
          <p className="reader-deck">{story.copy}</p>
          <p>This is intentionally mock editorial copy. The final version can pull the complete verified week packet from DynastyHQ while keeping the reading experience clean and immersive.</p>
          <p>The goal is to make the story feel like a real sports feature while still letting the underlying stats, scoring drives, progression and source material remain traceable in the Game Hub.</p>
          <div className="reader-source"><ShieldCheck size={17} /><span><b>PREVIEW ONLY</b><small>No live career data was changed to create this article view.</small></span></div>
        </div>
      </article>
    </div>
  );
}

export default App;
