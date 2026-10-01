import React, { useMemo, useState } from 'react';
import {
  Archive, BarChart3, Bell, BookOpen, CalendarDays, Check, ChevronDown, ChevronRight,
  ClipboardList, FileText, Headphones, Home, Image as ImageIcon, LockKeyhole, Menu,
  Mic2, MoreHorizontal, Newspaper, Pencil, Play, Search, ShieldCheck, Trophy,
  Upload, UserRound, X, Zap
} from 'lucide-react';
import stadium from '../assets/dynastyhq-football-stadium-bg.webp';
import podcastCover from '../assets/gridiron-grind-cover.webp';
import './preview.css';

const pages = [
  ['home','Home',Home],
  ['gamehub','Game Hub',CalendarDays],
  ['newsroom','Newsroom',Newspaper],
];

const sample = {
  player: { name:'BRYAN WESSEL', number:6, pos:'QB', school:'OREGON' },
  season: 4,
  week: 10,
  score: { us:54, them:48, opponent:'ILLINOIS' },
  next: { week:11, opponent:'MARYLAND' },
  stats: { pass:286, rush:124, total:410, td:7 },
};

function Logo({team='O', type=''}) {
  return <span className={'team-logo '+type} aria-hidden="true">{team}</span>;
}

function App(){
  const [page,setPage] = useState('home');
  const [mobileMenu,setMobileMenu] = useState(false);
  const [season,setSeason] = useState(4);
  const [week,setWeek] = useState(10);
  const [articleOpen,setArticleOpen] = useState(false);
  const [statsTab,setStatsTab] = useState('player');
  const [toast,setToast] = useState('');
  const [playing,setPlaying] = useState(false);

  const pageTitle = useMemo(()=>pages.find(p=>p[0]===page)?.[1] || 'Home',[page]);
  const go = (next) => { setPage(next); setMobileMenu(false); window.scrollTo({top:0,behavior:'smooth'}); };
  const notify = (message) => { setToast(message); window.setTimeout(()=>setToast(''),2200); };

  return <div className="site-shell">
    <header className="site-header">
      <div className="top-row">
        <button className="brand" onClick={()=>go('home')}>DYNASTY<span>HQ</span></button>

        <nav className="desktop-nav" aria-label="Primary">
          {pages.map(([id,label])=><button key={id} className={page===id?'active':''} onClick={()=>go(id)}>{label}</button>)}
          <button onClick={()=>notify('Offseason is intentionally disabled in this visual preview.')}>Offseason</button>
          <button onClick={()=>notify('Career is intentionally disabled in this visual preview.')}>Career</button>
          <button onClick={()=>notify('Chronicle is intentionally disabled in this visual preview.')}>Chronicle</button>
        </nav>

        <div className="header-actions">
          <button className="icon-btn" aria-label="Search" onClick={()=>notify('Search preview') }><Search size={19}/></button>
          <button className="icon-btn" aria-label="Notifications" onClick={()=>notify('No new notifications in the mockup.') }><Bell size={19}/></button>
          <Logo />
          <button className="menu-btn" onClick={()=>setMobileMenu(v=>!v)} aria-label="Menu">{mobileMenu?<X/>:<Menu/>}</button>
        </div>
      </div>

      <div className={'mobile-drawer '+(mobileMenu?'open':'')}>
        {pages.map(([id,label,Icon])=><button key={id} onClick={()=>go(id)}><Icon size={17}/>{label}</button>)}
      </div>

      <div className="career-row">
        <div className="career-copy"><b>ROAD TO GLORY</b><i/>BRYAN WESSEL #6<i/>OREGON</div>
        <div className="selectors">
          <label>SEASON
            <select value={season} onChange={e=>setSeason(Number(e.target.value))}>
              <option value="4">4</option><option value="3">3</option>
            </select><ChevronDown size={13}/>
          </label>
          <label>WEEK
            <select value={week} onChange={e=>setWeek(Number(e.target.value))}>
              <option value="10">10</option><option value="9">9</option>
            </select><ChevronDown size={13}/>
          </label>
          <button className="dynasty-lock" onClick={()=>notify('Dynasty mode stays locked in this RTG preview.')}><LockKeyhole size={15}/>Dynasty</button>
        </div>
      </div>

      <ScoreRibbon/>
    </header>

    <main>
      {page==='home' && <HomePage go={go} openArticle={()=>setArticleOpen(true)} notify={notify}/>}
      {page==='gamehub' && <GameHub go={go} statsTab={statsTab} setStatsTab={setStatsTab} notify={notify}/>}
      {page==='newsroom' && <Newsroom openArticle={()=>setArticleOpen(true)} go={go} playing={playing} setPlaying={setPlaying}/>}
    </main>

    <nav className="mobile-bottom">
      <button className={page==='home'?'active':''} onClick={()=>go('home')}><Home/><span>Home</span></button>
      <button className={page==='gamehub'?'active':''} onClick={()=>go('gamehub')}><CalendarDays/><span>Week</span></button>
      <button className={page==='newsroom'?'active':''} onClick={()=>go('newsroom')}><Play/><span>Media</span></button>
      <button onClick={()=>notify('Career preview coming after the three approved screens.')}><BarChart3/><span>Career</span></button>
      <button onClick={()=>setMobileMenu(v=>!v)}><MoreHorizontal/><span>More</span></button>
    </nav>

    {articleOpen && <ArticleReader onClose={()=>setArticleOpen(false)} go={go}/>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

function ScoreRibbon(){
  return <div className="score-ribbon">
    <div><span>W10</span><b>FINAL</b></div>
    <div className="score-team"><Logo/><span>OREGON</span><strong>54</strong></div>
    <span className="dash">–</span>
    <div className="score-team away"><strong>48</strong><Logo team="I" type="illinois"/><span>ILLINOIS</span></div>
    <div className="score-sep"/>
    <div className="upnext"><b>UP NEXT</b><span>W11</span><Logo team="M" type="maryland"/><strong>MARYLAND</strong></div>
  </div>;
}

function HomePage({go,openArticle,notify}){
  return <div className="page home-page">
    <section className="hero" style={{'--stadium':`url(${stadium})`}}>
      <div className="hero-overlay"/>
      <div className="hero-copy">
        <span className="eyebrow">WEEK 10 <i/> FINAL</span>
        <h1>A NIGHT TO <em>REMEMBER</em></h1>
        <div className="hero-score">
          <div><Logo/><strong>54</strong><small>OREGON</small></div>
          <span>FINAL</span>
          <div><strong>48</strong><Logo team="I" type="illinois"/><small>ILLINOIS</small></div>
        </div>
        <div className="hero-stats">
          <div><strong>286</strong><span>PASS YDS</span></div>
          <div><strong>124</strong><span>RUSH YDS</span></div>
          <div><strong>7</strong><span>TOTAL TD</span></div>
        </div>
        <div className="hero-actions">
          <button className="yellow" onClick={openArticle}><CalendarDays/>Open game recap<ChevronRight/></button>
          <button className="outline" onClick={()=>go('gamehub')}><BarChart3/>View verified stats</button>
        </div>
      </div>
      <div className="player-standin" aria-hidden="true">
        <div className="helmet"><Logo/></div>
        <div className="jersey">6</div>
        <div className="arm left"/>
        <div className="arm right"/>
      </div>
    </section>

    <section className="home-cards">
      <article className="dark-card next-week">
        <CardHeader title="YOUR NEXT WEEK"/>
        <div className="next-body">
          <Logo team="M" type="maryland big"/>
          <div><small>WEEK 11</small><h3>MARYLAND</h3></div>
        </div>
        <p>Keep building. Prepare for your next opponent in your career journey.</p>
        <button className="yellow" onClick={()=>notify('Next-week preparation is sample-only in this preview.')}><CalendarDays/>Prepare next week<ChevronRight/></button>
      </article>

      <article className="dark-card wrap-card">
        <CardHeader title="WEEK 10 WRAP-UP"/>
        <CheckRow title="Game stats reviewed" sub="Player and team performance updated"/>
        <CheckRow title="Coverage ready" sub="Article, media, and highlights available"/>
        <CheckRow title="Career updated" sub="Progress, milestones, and records tracked"/>
        <button className="outline full" onClick={()=>go('gamehub')}><BarChart3/>Open Game Hub<ChevronRight/></button>
      </article>

      <article className="paper-card newsroom-card">
        <CardHeader title="FROM THE NEWSROOM" light/>
        <div className="news-flex">
          <div><h3>Wessel leads Oregon past Illinois</h3><p>Oregon secures a 54–48 victory behind 286 passing yards, 124 rush yards and 7 total TD from Bryan Wessel.</p></div>
          <div className="thumb"><span>6</span></div>
        </div>
        <button className="pod-mini" onClick={()=>go('newsroom')}>
          <img src={podcastCover} alt="The Huddle"/>
          <span><b>THE HUDDLE</b><small>Illinois recap · 28:14</small></span><Play/>
        </button>
      </article>
    </section>

    <section className="journey-strip">
      <div><b>YOUR JOURNEY</b><small>One career. Every chapter.</small></div>
      <div className="stage active"><span>🏈</span><b>Player</b><small>Build your legacy<br/>as a college star</small></div>
      <div className="stage"><Headphones/><b>Coordinator</b><small>Future Mode</small></div>
      <div className="stage"><Trophy/><b>Head coach</b><small>Future Mode</small></div>
    </section>
  </div>;
}

function CardHeader({title,light=false}){ return <div className={'card-title '+(light?'light':'')}><b>{title}</b><ChevronRight size={17}/></div>; }
function CheckRow({title,sub}){ return <div className="check-row"><span><Check/></span><div><b>{title}</b><small>{sub}</small></div></div>; }

function GameHub({go,statsTab,setStatsTab,notify}){
  const statContent = statsTab==='player'
    ? [['286','PASSING YARDS'],['124','RUSHING YARDS'],['410','TOTAL YARDS'],['7','TOTAL TD']]
    : statsTab==='team'
      ? [['54','POINTS'],['468','TOTAL YARDS'],['7','TOUCHDOWNS'],['0','TURNOVERS']]
      : [['7','SCORING DRIVES'],['4','PASS TD'],['3','RUSH TD'],['48','OPP PTS']];
  return <div className="page gamehub-page">
    <section className="hub-hero" style={{'--stadium':`url(${stadium})`}}>
      <div><h1>GAME <em>HUB</em></h1><p>WEEK 10 / ILLINOIS / POSTGAME</p></div>
      <button className="yellow import" onClick={()=>notify('Screenshot import is disabled in this mockup preview.')}><Upload/>IMPORT SCREENSHOTS</button>
    </section>

    <section className="complete-strip">
      <div><h2>WEEK 10 COMPLETE</h2><p>All items belong to Season 4 • Week 10</p></div>
      <div className="flow">{['Import','Review','Coverage','Archive'].map(x=><React.Fragment key={x}><span className="flow-step"><i><Check/></i>{x}</span>{x!=='Archive'&&<b/>}</React.Fragment>)}</div>
    </section>

    <section className="hub-grid">
      <div className="left-stack">
        <article className="paper-panel verified">
          <div className="panel-head"><h2>VERIFIED GAME DATA</h2>
            <div className="tabs">
              <button className={statsTab==='team'?'active':''} onClick={()=>setStatsTab('team')}>Team stats</button>
              <button className={statsTab==='player'?'active':''} onClick={()=>setStatsTab('player')}>Player stats</button>
              <button className={statsTab==='drives'?'active':''} onClick={()=>setStatsTab('drives')}>Scoring drives</button>
            </div>
          </div>

          <div className="player-summary">
            <div className="player-photo"><div className="fake-player">6</div></div>
            <div className="player-copy"><div className="player-name"><Logo/><div><h3>BRYAN WESSEL</h3><p>#6 &nbsp; | &nbsp; QB &nbsp; | &nbsp; OREGON</p></div></div>
              <div className="stat-grid">{statContent.map(([v,l])=><div key={l}><strong>{v}</strong><span>{l}</span></div>)}</div>
            </div>
          </div>
          <div className="panel-actions">
            <button className="ghost" onClick={()=>notify('Source screenshots are not connected in the visual preview.')}><Upload/>VIEW SOURCE SCREENSHOTS</button>
            <button className="ghost" onClick={()=>notify('Editing is disabled in the visual preview.')}><Pencil/>EDIT VERIFIED DATA</button>
          </div>
        </article>

        <article className="paper-panel material">
          <h2>GAME MATERIAL</h2>
          <div className="material-grid">
            <Material icon={FileText} title="Box score" sub="Game statistics and team totals attached."/>
            <Material icon={ClipboardList} title="Scoring summary" sub="All scoring drives attached to this game."/>
            <Material icon={UserRound} title="Player ratings" sub="Individual player ratings attached."/>
          </div>
        </article>
      </div>

      <div className="right-stack">
        <article className="paper-panel coverage">
          <h2>WEEKLY COVERAGE</h2>
          <CoverageRow icon={Newspaper} title="Newsroom edition" sub="Game recap and analysis." onClick={()=>go('newsroom')}/>
          <CoverageRow icon={Mic2} title="Podcast transcript" sub="Full episode transcript." onClick={()=>go('newsroom')}/>
          <CoverageRow icon={BookOpen} title="NotebookLM pack" sub="Game files and key moments." onClick={()=>notify('NotebookLM pack is a sample interaction in this preview.')}/>
          <button className="yellow full" onClick={()=>go('newsroom')}><Zap/>OPEN COVERAGE<ChevronRight/></button>
        </article>

        <article className="paper-panel development">
          <h2>PLAYER DEVELOPMENT</h2>
          <SimpleRow icon={BarChart3} title="Attribute changes" sub="See how this week impacted your player."/>
          <SimpleRow icon={UserRound} title="Coach trust" sub="Build your role and earn opportunities."/>
          <SimpleRow icon={ClipboardList} title="Training notes" sub="Focus areas for next week."/>
          <button className="ghost full" onClick={()=>notify('Player development details are sample-only.')}><BarChart3/>REVIEW CHANGES<ChevronRight/></button>
        </article>
      </div>
    </section>

    <section className="hub-bottom">
      <div><b>UP NEXT</b><span>• WEEK 11</span><Logo team="M" type="maryland"/><strong>MARYLAND</strong></div>
      <button className="yellow" onClick={()=>notify('Week 11 preparation is sample-only.')}><CalendarDays/>PREPARE NEXT WEEK<ChevronRight/></button>
      <div className="future"><Archive/><span><b>DYNASTY WORKSPACE</b><small>Recruiting · Depth chart · Staff</small></span><em>COMING SOON</em></div>
    </section>
  </div>;
}

function Material({icon:Icon,title,sub}){ return <button className="material-card"><Icon/><div><b>{title}</b><small>{sub}</small></div><span><Check/></span><ChevronRight/></button>; }
function CoverageRow({icon:Icon,title,sub,onClick}){ return <button className="coverage-row" onClick={onClick}><Icon/><span><b>{title}</b><small>{sub}</small></span><em>READY</em><ChevronRight/></button>; }
function SimpleRow({icon:Icon,title,sub}){ return <button className="coverage-row simple"><Icon/><span><b>{title}</b><small>{sub}</small></span><ChevronRight/></button>; }

function Newsroom({openArticle,go,playing,setPlaying}){
  return <div className="page newsroom-page">
    <section className="journal">
      <header className="masthead">
        <div className="mast-row"><h1>THE FOOTBALL JOURNAL</h1><span>OREGON EDITION • SEASON 4 • WEEK 10</span></div>
        <div className="journal-tabs"><button className="active">Front Page</button><button>Local Beat</button><button>National</button><button>Archive</button></div>
      </header>

      <section className="lead-story">
        <div className="lead-copy">
          <span>GAME RECAP</span>
          <h2>WESSEL WINS<br/>THE SHOOTOUT.</h2>
          <p>Oregon survives Illinois, 54–48.<br/>Revisit the game, the numbers, and<br/>the moments behind the result.</p>
          <button className="yellow" onClick={openArticle}>Read full story<ChevronRight/></button>
        </div>
        <div className="lead-image" style={{backgroundImage:`linear-gradient(0deg,rgba(5,12,9,.2),rgba(5,12,9,.1)),url(${stadium})`}}>
          <div className="journal-player"><span>6</span></div>
        </div>
      </section>

      <section className="journal-score">
        <div><Logo/><b>OREGON</b><strong>54</strong></div><span>FINAL</span><div><strong>48</strong><Logo team="I" type="illinois"/><b>ILLINOIS</b></div><i/>
        <div><b>WESSEL</b></div><div><strong>410</strong><small>TOTAL YARDS</small></div><div><strong>7</strong><small>TOTAL TD</small></div>
      </section>

      <section className="journal-lower">
        <article className="journal-box inside">
          <CardHeader title="INSIDE THE GAME" light/>
          <p>The numbers behind the win.</p>
          <div className="inside-grid"><div className="tiny-photo">6</div><div><button onClick={()=>go('gamehub')}><ClipboardList/>Player stats<ChevronRight/></button><button onClick={()=>go('gamehub')}><BarChart3/>Scoring drives<ChevronRight/></button></div></div>
        </article>

        <article className="journal-box huddle">
          <CardHeader title="THE HUDDLE" light/>
          <div className="huddle-grid">
            <button className="cover-play" onClick={()=>setPlaying(v=>!v)}><img src={podcastCover} alt="The Huddle"/><span><Play/></span></button>
            <div><small>Week 10</small><h3>The Illinois Shootout</h3><p>Game breakdown, key plays, and what’s next for Wessel and the Ducks.</p><b>28:14</b></div>
          </div>
          <div className="huddle-actions"><button><FileText/>Print transcript</button><button><Zap/>NotebookLM pack</button></div>
          {playing && <div className="now-playing">▶ Playing preview audio…</div>}
        </article>

        <article className="journal-box career-file">
          <CardHeader title="THE CAREER FILE" light/>
          <div className="career-grid"><div className="back-photo">WESSEL<br/><b>6</b></div><div><h3>From first start<br/>to the spotlight.</h3><p>Revisit the early chapters of Bryan Wessel’s journey and how he became the face of this program.</p><button onClick={()=>go('gamehub')}>Explore Chronicle<ChevronRight/></button></div></div>
        </article>
      </section>
    </section>
  </div>;
}

function ArticleReader({onClose,go}){
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <article className="article-reader">
      <button className="close" onClick={onClose}><X/></button>
      <div className="article-hero" style={{backgroundImage:`linear-gradient(0deg,rgba(5,12,9,.85),transparent),url(${stadium})`}}><span>GAME RECAP • WEEK 10</span></div>
      <div className="article-body">
        <small>THE FOOTBALL JOURNAL</small>
        <h1>WESSEL WINS THE SHOOTOUT.</h1>
        <p className="deck">Oregon survives Illinois, 54–48, as Bryan Wessel accounts for 410 total yards and seven touchdowns.</p>
        <p>This is sample editorial copy for the interactive preview. It demonstrates the reading experience, typography, spacing, score context, and how a finished article would feel inside the redesigned DynastyHQ.</p>
        <p>The final connected version could populate this story from the verified game packet. For now, no live career data is read or written.</p>
        <button className="outline" onClick={()=>{onClose();go('gamehub')}}><BarChart3/>View game data</button>
      </div>
    </article>
  </div>;
}

export default App;
