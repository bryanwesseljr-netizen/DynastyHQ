import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive, Award, BarChart3, Bell, BookOpen, CalendarDays, Camera, Check, ChevronDown, ChevronRight,
  ClipboardList, FileText, Headphones, Home, Image as ImageIcon, LockKeyhole, Menu,
  Mic2, MoreHorizontal, Newspaper, Pencil, Play, Search, Shield, ShieldCheck, Sparkles, Target,
  TrendingUp, Trophy, Upload, UserRound, X, Zap
} from 'lucide-react';
import stadium from '../assets/dynastyhq-football-stadium-bg.webp';
import podcastCover from '../assets/gridiron-grind-cover.webp';
import './preview.css';
import { useReadOnlyLiveCareer } from './useReadOnlyLiveCareer.js';

const playerPhoto = 'data:image/webp;base64,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';

const pages = [
  ['home','Home',Home],
  ['gamehub','Game Hub',CalendarDays],
  ['newsroom','Newsroom',Newspaper],
  ['podcast','Podcast',Headphones],
  ['offseason','Off-Season',Target],
  ['career','Career',UserRound],
  ['chronicle','Chronicle',BookOpen],
];

const fallbackData = {
  player: { name:'BRYAN WESSEL', number:'6', pos:'QB', school:'OREGON', overall:'76', headshot:'' },
  season: 4,
  week: 10,
  game: { week:10, opponent:'ILLINOIS', result:'W', us:54, them:48, pass:286, rush:124, total:410, passTD:6, rushTD:1, td:7, interceptions:2 },
  next: { week:11, opponent:'MARYLAND' },
  rtg: { rank:'QB1', coachTrust:'' },
  news: { headline:'Wessel leads Oregon past Illinois', dek:'Oregon secures a 54–48 victory behind 286 passing yards, 124 rush yards and 7 total TD from Bryan Wessel.' },
  podcast: { title:'Illinois recap', duration:'28:14' },
  totals: { passYds:2846, rushYds:742, passTD:28, rushTD:9, interceptions:8, appearances:4 },
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
  const [podcastTab,setPodcastTab] = useState('episode');
  const [liveAuthOpen,setLiveAuthOpen] = useState(false);
  const [liveEmail,setLiveEmail] = useState('');
  const [livePassword,setLivePassword] = useState('');
  const live = useReadOnlyLiveCareer();
  const data = live.data || fallbackData;

  useEffect(() => {
    if (!live.data) return;
    setSeason(live.data.season);
    setWeek(live.data.week);
  }, [live.data?.season, live.data?.week]);

  const pageTitle = useMemo(()=>pages.find(p=>p[0]===page)?.[1] || 'Home',[page]);
  const go = (next) => { setPage(next); if(next!=='newsroom') setArticleOpen(false); setMobileMenu(false); window.scrollTo({top:0,behavior:'smooth'}); };
  const openNewsArticle = () => { setPage('newsroom'); setArticleOpen(true); setMobileMenu(false); window.scrollTo({top:0,behavior:'smooth'}); };
  const openPodcast = (tab='episode') => { setPodcastTab(tab); setPage('podcast'); setArticleOpen(false); setMobileMenu(false); window.scrollTo({top:0,behavior:'smooth'}); };
  const notify = (message) => { setToast(message); window.setTimeout(()=>setToast(''),2200); };
  const connectLiveCareer = async (event) => {
    event.preventDefault();
    const ok = await live.signIn(liveEmail,livePassword);
    if (ok) {
      setLivePassword('');
      setLiveAuthOpen(false);
    }
  };

  return <div className="site-shell">
    <header className="site-header">
      <div className="top-row">
        <button className="brand" onClick={()=>go('home')}>DYNASTY<span>HQ</span></button>

        <nav className="desktop-nav" aria-label="Primary">
          {pages.map(([id,label])=><button key={id} className={page===id?'active':''} onClick={()=>go(id)}>{label}</button>)}

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
        <div className="career-copy"><b>ROAD TO GLORY</b><i/>{data.player.name} #{data.player.number}<i/>{data.player.school}</div>
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

      <ScoreRibbon data={data}/>
    </header>

    <LiveDataBar
      live={live}
      open={liveAuthOpen}
      setOpen={setLiveAuthOpen}
      email={liveEmail}
      setEmail={setLiveEmail}
      password={livePassword}
      setPassword={setLivePassword}
      onConnect={connectLiveCareer}
    />

    <main>
      {page==='home' && <HomePage data={data} go={go} openArticle={openNewsArticle} openPodcast={openPodcast} notify={notify}/>} 
      {page==='gamehub' && <GameHub data={data} go={go} openPodcast={openPodcast} statsTab={statsTab} setStatsTab={setStatsTab} notify={notify}/>} 
      {page==='newsroom' && <Newsroom data={data} articleOpen={articleOpen} setArticleOpen={setArticleOpen} openArticle={openNewsArticle} openPodcast={openPodcast} go={go} playing={playing} setPlaying={setPlaying} notify={notify}/>} 
      {page==='podcast' && <PodcastPage data={data} go={go} playing={playing} setPlaying={setPlaying} podcastTab={podcastTab} setPodcastTab={setPodcastTab} notify={notify}/>} 
      {page==='offseason' && <OffseasonPage go={go} openPodcast={openPodcast} openArticle={openNewsArticle} notify={notify}/>}
      {page==='career' && <CareerPage go={go}/>}
      {page==='chronicle' && <ChroniclePage go={go} openPodcast={openPodcast} openArticle={openNewsArticle}/>}
    </main>

    <nav className="mobile-bottom">
      <button className={page==='home'?'active':''} onClick={()=>go('home')}><Home/><span>Home</span></button>
      <button className={page==='gamehub'?'active':''} onClick={()=>go('gamehub')}><CalendarDays/><span>Week</span></button>
      <button className={page==='newsroom'?'active':''} onClick={()=>go('newsroom')}><Newspaper/><span>News</span></button>
      <button className={page==='podcast'?'active':''} onClick={()=>openPodcast('episode')}><Headphones/><span>Podcast</span></button>
      <button className={page==='offseason'?'active':''} onClick={()=>go('offseason')}><Target/><span>Offseason</span></button>
      <button className={page==='career'?'active':''} onClick={()=>go('career')}><UserRound/><span>Career</span></button>
      <button className={page==='chronicle'?'active':''} onClick={()=>go('chronicle')}><BookOpen/><span>Chronicle</span></button>
    </nav>

    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

function LiveDataBar({live,open,setOpen,email,setEmail,password,setPassword,onConnect}){
  const connected=live.status==='connected';
  return <section className={'live-data-bar '+(connected?'is-connected':'')}>
    <div className="live-data-status">
      <ShieldCheck/>
      <span><b>{connected?'REAL CAREER DATA · READ ONLY':'SAMPLE PREVIEW DATA'}</b><small>{connected?'Reading your current live DynastyHQ save. No production writes are enabled.':'Connect your DynastyHQ account to populate this redesign from your real career without changing live data.'}</small></span>
    </div>
    {connected
      ? <button className="live-data-action" onClick={live.disconnect}>Disconnect</button>
      : <button className="live-data-action" onClick={()=>setOpen(v=>!v)}>{open?'Close':'Connect live career'}</button>}
    {open && !connected && <form className="live-auth-form" onSubmit={onConnect}>
      <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" required/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label>
      <button className="yellow" disabled={live.status==='loading'}>{live.status==='loading'?'Connecting…':'Connect read-only'}</button>
      {live.error && <p>{live.error}</p>}
    </form>}
  </section>;
}

function ScoreRibbon({data}){
  const game=data.game;
  const next=data.next;
  return <div className="score-ribbon">
    <div><span>W{game.week}</span><b>FINAL</b></div>
    <div className="score-team"><Logo team={data.player.school.slice(0,1)}/><span>{data.player.school}</span><strong>{game.us}</strong></div>
    <span className="dash">–</span>
    <div className="score-team away"><strong>{game.them}</strong><Logo team={game.opponent.slice(0,1)}/><span>{game.opponent}</span></div>
    <div className="score-sep"/>
    <div className="upnext"><b>UP NEXT</b><span>W{next.week}</span><Logo team={next.opponent.slice(0,1)}/><strong>{next.opponent}</strong></div>
  </div>;
}

function HomePage({data,go,openArticle,openPodcast,notify}){
  return <div className="page home-page">
    <section className="hero" style={{'--stadium':`url(${stadium})`,'--player':`url(${playerPhoto})`}}>
      <div className="hero-overlay"/>
      <div className="hero-copy">
        <span className="eyebrow">WEEK {data.game.week} <i/> FINAL</span>
        <h1><span>A NIGHT TO</span><em>REMEMBER</em></h1>
        <div className="hero-score">
          <div className="hero-score-team home-team"><Logo team={data.player.school.slice(0,1)}/><strong>{data.game.us}</strong><small>{data.player.school}</small></div>
          <span className="hero-final">FINAL</span>
          <div className="hero-score-team away-team"><strong>{data.game.them}</strong><Logo team={data.game.opponent.slice(0,1)}/><small>{data.game.opponent}</small></div>
        </div>
        <div className="hero-stats">
          <div><strong>{data.game.pass}</strong><span>PASS YDS</span></div>
          <div><strong>{data.game.rush}</strong><span>RUSH YDS</span></div>
          <div><strong>{data.game.td}</strong><span>TOTAL TD</span></div>
        </div>
        <div className="hero-actions">
          <button className="yellow" onClick={openArticle}><CalendarDays/>Open game recap<ChevronRight/></button>
          <button className="outline" onClick={()=>go('gamehub')}><BarChart3/>View verified stats</button>
        </div>
      </div>
      <div className="player-standin" aria-hidden="true">
        <div className="helmet"><Logo team={data.player.school.slice(0,1)}/></div>
        <div className="jersey">{data.player.number}</div>
        <div className="arm left"/>
        <div className="arm right"/>
      </div>
    </section>

    <section className="home-cards">
      <article className="dark-card next-week reference-next-week">
        <CardHeader title="YOUR NEXT WEEK"/>
        <div className="next-body">
          <Logo team={data.next.opponent.slice(0,1)} type="big"/>
          <div><small>WEEK {data.next.week}</small><h3>{data.next.opponent}</h3></div>
        </div>
        <p>Keep building. Prepare for your next opponent in your career journey.</p>
        <button className="yellow" onClick={()=>notify('Next-week preparation is sample-only in this preview.')}><CalendarDays/>Prepare next week<ChevronRight/></button>
      </article>

      <article className="dark-card wrap-card reference-wrap">
        <CardHeader title={`WEEK ${data.game.week} WRAP-UP`}/>
        <CheckRow title="Game stats reviewed" sub="Player and team performance updated"/>
        <CheckRow title="Coverage ready" sub="Article, media, and highlights available"/>
        <CheckRow title="Career updated" sub="Progress, milestones, and records tracked"/>
        <button className="outline full" onClick={()=>go('gamehub')}><BarChart3/>Open Game Hub<ChevronRight/></button>
      </article>

      <article className="paper-card newsroom-card reference-newsroom-card">
        <CardHeader title="FROM THE NEWSROOM" light/>
        <div className="news-flex">
          <div><h3>{data.news.headline}</h3><p>{data.news.dek}</p></div>
          <div className="thumb photo-tile" style={{backgroundImage:`url(${playerPhoto})`}}/>
        </div>
        <button className="pod-mini" onClick={()=>openPodcast('episode')}>
          <img src={podcastCover} alt="The Huddle"/>
          <span className="pod-copy"><b>THE HUDDLE</b><small>{data.podcast.title}</small><em>{data.podcast.duration}</em></span>
          <span className="pod-wave" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></span>
          <span className="pod-play"><Play/></span>
        </button>
      </article>
    </section>

    <section className="journey-strip">
      <div><b>YOUR JOURNEY</b><small>One career. Every chapter.</small></div>
      <div className="stage active"><span className="journey-helmet" aria-hidden="true"></span><b>Player</b><small>Build your legacy<br/>as a college star</small></div>
      <div className="stage"><Headphones/><b>Coordinator</b><small>Future Mode</small></div>
      <div className="stage"><Trophy/><b>Head coach</b><small>Future Mode</small></div>
    </section>
  </div>;
}

function CardHeader({title,light=false}){ return <div className={'card-title '+(light?'light':'')}><b>{title}</b><ChevronRight size={17}/></div>; }
function CheckRow({title,sub}){ return <div className="check-row"><span><Check/></span><div><b>{title}</b><small>{sub}</small></div></div>; }

function GameHub({data,go,openPodcast,statsTab,setStatsTab,notify}){
  const statContent = statsTab==='player'
    ? [[String(data.game.pass),'PASSING YARDS'],[String(data.game.rush),'RUSHING YARDS'],[String(data.game.total),'TOTAL YARDS'],[String(data.game.td),'TOTAL TD']]
    : statsTab==='team'
      ? [['54','POINTS'],['468','TOTAL YARDS'],['7','TOUCHDOWNS'],['0','TURNOVERS']]
      : [['7','SCORING DRIVES'],['4','PASS TD'],['3','RUSH TD'],['48','OPP PTS']];
  return <div className="page gamehub-page">
    <section className="hub-hero" style={{'--stadium':`url(${stadium})`,'--player':`url(${playerPhoto})`}}>
      <div><h1>GAME <em>HUB</em></h1><p>WEEK {data.game.week} / {data.game.opponent} / POSTGAME</p></div>
      <button className="yellow import" onClick={()=>notify('Screenshot import is disabled in this mockup preview.')}><Upload/>IMPORT SCREENSHOTS</button>
    </section>

    <section className="complete-strip">
      <div><h2>WEEK {data.game.week} COMPLETE</h2><p>All items belong to Season {data.season} • Week {data.game.week}</p></div>
      <div className="flow">{['Import','Review','Coverage','Archive'].map(x=><React.Fragment key={x}><span className="flow-step"><i><Check/></i>{x}</span>{x!=='Archive'&&<b/>}</React.Fragment>)}</div>
    </section>

    <section className="hub-grid">
      <div className="left-stack">
        <article className="paper-panel verified reference-verified">
          <div className="panel-head"><h2 className="verified-title"><span className="desktop-label">VERIFIED GAME DATA</span><span className="mobile-label">PLAYER STATS</span></h2>
            <div className="tabs">
              <button className={statsTab==='team'?'active':''} onClick={()=>setStatsTab('team')}>Team stats</button>
              <button className={statsTab==='player'?'active':''} onClick={()=>setStatsTab('player')}>Player stats</button>
              <button className={statsTab==='drives'?'active':''} onClick={()=>setStatsTab('drives')}>Scoring drives</button>
            </div>
          </div>

          <div className="player-summary">
            <div className="player-photo"><div className="fake-player photo-tile" style={{backgroundImage:`linear-gradient(0deg,rgba(0,24,18,.10),rgba(0,24,18,.05)),url(${playerPhoto})`}}/></div>
            <div className="player-copy"><div className="player-name"><Logo team={data.player.school.slice(0,1)}/><div><h3>{data.player.name}</h3><p>#{data.player.number} &nbsp; | &nbsp; {data.player.pos} &nbsp; | &nbsp; {data.player.school}</p></div></div>
              <div className="stat-grid">{statContent.map(([v,l])=><div key={l}><strong>{v}</strong><span>{l}</span></div>)}</div>
            </div>
          </div>
          <div className="panel-actions">
            <button className="ghost" onClick={()=>notify('Source screenshots are not connected in the visual preview.')}><Upload/>VIEW SOURCE SCREENSHOTS</button>
            <button className="ghost" onClick={()=>notify('Editing is disabled in the visual preview.')}><Pencil/>EDIT VERIFIED DATA</button>
          </div>
        </article>

        <article className="paper-panel material reference-material">
          <h2>GAME MATERIAL</h2>
          <div className="material-grid">
            <Material icon={FileText} title="Box score" sub="Game statistics and team totals attached." onClick={()=>notify('Box score detail is sample-only in this visual preview.')}/>
            <Material icon={ClipboardList} title="Scoring summary" sub="All scoring drives attached to this game." onClick={()=>setStatsTab('drives')}/>
            <Material icon={UserRound} title="Player ratings" sub="Individual player ratings attached." onClick={()=>notify('Player ratings detail is sample-only in this visual preview.')}/>
          </div>
        </article>
      </div>

      <div className="right-stack">
        <article className="paper-panel coverage reference-coverage">
          <h2>WEEKLY COVERAGE</h2>
          <CoverageRow icon={Newspaper} title="Newsroom edition" sub="Game recap and analysis." onClick={()=>go('newsroom')}/>
          <CoverageRow icon={Mic2} title="Podcast transcript" sub="Full episode transcript." onClick={()=>openPodcast('transcript')}/>
          <CoverageRow icon={BookOpen} title="NotebookLM pack" sub="Game files and key moments." onClick={()=>openPodcast('notebook')}/>
          <button className="yellow full" onClick={()=>go('newsroom')}><Zap/>OPEN COVERAGE<ChevronRight/></button>
        </article>

        <article className="paper-panel development reference-development">
          <h2>PLAYER DEVELOPMENT</h2>
          <SimpleRow icon={BarChart3} title="Attribute changes" sub="See how this week impacted your player." onClick={()=>notify('Attribute-change details are sample-only in this visual preview.')}/>
          <SimpleRow icon={UserRound} title="Coach trust" sub="Build your role and earn opportunities." onClick={()=>notify('Coach-trust details are sample-only in this visual preview.')}/>
          <SimpleRow icon={ClipboardList} title="Training notes" sub="Focus areas for next week." onClick={()=>notify('Training-note details are sample-only in this visual preview.')}/>
          <button className="ghost full" onClick={()=>notify('Player development details are sample-only.')}><BarChart3/>REVIEW CHANGES<ChevronRight/></button>
        </article>
      </div>
    </section>

    <section className="hub-bottom">
      <div><b>UP NEXT</b><span>• WEEK {data.next.week}</span><Logo team={data.next.opponent.slice(0,1)}/><strong>{data.next.opponent}</strong></div>
      <button className="yellow" onClick={()=>notify(`Week ${data.next.week} preparation is still preview-only.`)}><CalendarDays/>PREPARE NEXT WEEK<ChevronRight/></button>
      <div className="future"><Archive/><span><b>DYNASTY WORKSPACE</b><small>Recruiting · Depth chart · Staff</small></span><em>COMING SOON</em></div>
    </section>
  </div>;
}

function Material({icon:Icon,title,sub,onClick}){ return <button className="material-card" onClick={onClick}><Icon/><div><b>{title}</b><small>{sub}</small></div><span><Check/></span><ChevronRight/></button>; }
function CoverageRow({icon:Icon,title,sub,onClick}){ return <button className="coverage-row" onClick={onClick}><Icon/><span><b>{title}</b><small>{sub}</small></span><em>READY</em><ChevronRight/></button>; }
function SimpleRow({icon:Icon,title,sub,onClick}){ return <button className="coverage-row simple" onClick={onClick}><Icon/><span><b>{title}</b><small>{sub}</small></span><ChevronRight/></button>; }

function PodcastPage({data,go,playing,setPlaying,podcastTab,setPodcastTab,notify}){
  const episode=data.podcast || {};
  const game=data.game || {};
  const transcript = episode.segments?.length
    ? episode.segments.map((segment,index)=>[segment.speaker || `HOST ${index+1}`,segment.text])
    : [
      ['EPISODE BRIEF',episode.summary || 'This week does not have a generated podcast transcript yet.'],
      ['GAME CONTEXT',`${data.player.school} ${game.us}–${game.them} ${game.opponent}. ${game.pass} passing yards, ${game.rush} rushing yards, ${game.td} total touchdowns.`],
    ];
  const chapters=episode.chapters?.length
    ? episode.chapters.slice(0,6)
    : [
      {title:'Opening Drive',summary:`The Week ${game.week} result and why it mattered.`},
      {title:`${data.player.name.split(' ').at(-1)}’s Night`,summary:`${game.pass} passing, ${game.rush} rushing, ${game.td} total touchdowns.`},
      {title:'What Comes Next',summary:`The Week ${data.next.week} setup against ${data.next.opponent}.`},
    ];
  const facts=episode.sourceFacts || [];
  const scoringFacts=facts.filter((fact)=>/scor|drive|touchdown|field goal/i.test(`${fact?.key||''} ${fact?.label||''}`));
  const developmentFacts=facts.filter((fact)=>String(fact?.key||'').startsWith('rtg.') || String(fact?.key||'').includes('overall') || String(fact?.key||'').includes('development'));
  const prior=episode.previous || [];
  const playEpisode=()=> {
    if(episode.audioReady){
      setPlaying(v=>!v);
      notify('Saved podcast audio is detected. Full audio-file playback wiring is the next functionality pass.');
    } else {
      notify('This saved episode does not currently have ready audio attached. The transcript and source data are still available.');
    }
  };

  return <div className="page podcast-page">
    <section className="podcast-hero">
      <div className="podcast-hero-art">
        <img src={podcastCover} alt="The Huddle podcast cover"/>
        <button className="podcast-main-play" onClick={playEpisode}>{playing?<span className="pause-bars"><i/><i/></span>:<Play/>}</button>
      </div>
      <div className="podcast-hero-copy">
        <span className="podcast-kicker">THE HUDDLE • WEEK {game.week}</span>
        <h1 className="podcast-live-title">{episode.title || `WEEK ${game.week} RECAP`}</h1>
        <p>{episode.summary || `Game breakdown and verified career context from ${data.player.school} vs. ${game.opponent}.`}</p>
        <div className="podcast-meta"><span>{episode.duration || '—'}</span><i/><span>Season {data.season}</span><i/><span>Week {game.week}</span></div>

        <div className="audio-console">
          <button className="audio-play" onClick={playEpisode}>{playing?<span className="pause-bars"><i/><i/></span>:<Play/>}</button>
          <div className="audio-track">
            <div className="audio-wave" aria-hidden="true">{Array.from({length:34}).map((_,i)=><i key={i}/>)}</div>
            <div className="audio-time"><span>{episode.audioReady?(playing?'PLAYING':'SAVED AUDIO'):'SCRIPT ONLY'}</span><b>{episode.duration || '—'}</b></div>
          </div>
        </div>

        <div className="podcast-actions">
          <button className="yellow" onClick={()=>{setPodcastTab('transcript');setTimeout(()=>document.querySelector('.podcast-workspace')?.scrollIntoView({behavior:'smooth'}),50)}}><FileText/>OPEN TRANSCRIPT</button>
          <button className="outline" onClick={()=>{setPodcastTab('notebook');setTimeout(()=>document.querySelector('.podcast-workspace')?.scrollIntoView({behavior:'smooth'}),50)}}><Zap/>NOTEBOOKLM PACK</button>
        </div>
      </div>
    </section>

    <section className="podcast-context-strip">
      <div><small>FINAL</small><strong>{data.player.school} {game.us}–{game.them} {game.opponent}</strong></div>
      <i/>
      <div><small>{data.player.name.split(' ').at(-1)}</small><strong>{game.total} TOTAL YARDS</strong></div>
      <div><small>TOUCHDOWNS</small><strong>{game.td} TOTAL TD</strong></div>
      <button onClick={()=>go('gamehub')}>VIEW GAME DATA<ChevronRight/></button>
    </section>

    <section className="podcast-workspace">
      <div className="podcast-tabs">
        <button className={podcastTab==='episode'?'active':''} onClick={()=>setPodcastTab('episode')}>Episode</button>
        <button className={podcastTab==='transcript'?'active':''} onClick={()=>setPodcastTab('transcript')}>Transcript</button>
        <button className={podcastTab==='notebook'?'active':''} onClick={()=>setPodcastTab('notebook')}>NotebookLM</button>
      </div>

      {podcastTab==='episode' && <div className="episode-layout">
        <article className="episode-story">
          <span className="section-kicker">EPISODE BRIEF</span>
          <h2>{episode.title || `Week ${game.week} postgame show`}</h2>
          <p>{episode.summary || 'The episode uses the saved verified game packet and career context for this week.'}</p>
          <div className="episode-chapters">
            {chapters.map((chapter,index)=><div key={chapter.id||chapter.title||index}><b>{String(index+1).padStart(2,'0')}</b><span><strong>{chapter.title || `Chapter ${index+1}`}</strong><small>{chapter.summary || 'Saved episode chapter.'}</small></span></div>)}
          </div>
        </article>
        <aside className="episode-side">
          <section>
            <span>THIS SAVED EPISODE USES</span>
            <div><Check/>{facts.length} verified source facts</div>
            <div><Check/>{episode.segments?.length || 0} transcript segments</div>
            <div><Check/>{scoringFacts.length} scoring/drive references</div>
            <div><Check/>{developmentFacts.length} development references</div>
          </section>
          <section>
            <span>RELATED</span>
            <button onClick={()=>go('newsroom')}><Newspaper/><b>Read the game story</b><ChevronRight/></button>
            <button onClick={()=>go('gamehub')}><BarChart3/><b>Open Game Hub</b><ChevronRight/></button>
          </section>
        </aside>
      </div>}

      {podcastTab==='transcript' && <div className="transcript-layout">
        <article className="transcript-paper">
          <div className="transcript-head">
            <div><span>THE HUDDLE • SAVED TRANSCRIPT</span><h2>{episode.title || `Week ${game.week} Recap`}</h2><p>Season {data.season} • Week {game.week} • {data.player.school} {game.us}, {game.opponent} {game.them}</p></div>
            <button className="ghost" onClick={()=>window.print()}><FileText/>PRINT TRANSCRIPT</button>
          </div>
          {transcript.map(([title,body],index)=><section key={`${title}-${index}`}><h3>{title}</h3><p>{body}</p></section>)}
          <div className="transcript-note">{episode.segments?.length ? 'This is the complete saved DynastyHQ transcript for the selected real career week.' : 'No generated transcript is saved for this week yet; only verified game context is shown.'}</div>
        </article>
        <aside className="transcript-sidebar">
          <span>GAME REFERENCES</span>
          <div><small>Passing</small><b>{game.pass} YDS • {game.passTD} TD</b></div>
          <div><small>Rushing</small><b>{game.rush} YDS • {game.rushTD} TD</b></div>
          <div><small>Total offense</small><b>{game.total} YDS</b></div>
          <div><small>Final score</small><b>{data.player.school} {game.us} • {game.opponent} {game.them}</b></div>
          <button onClick={()=>go('gamehub')}>VERIFY IN GAME HUB<ChevronRight/></button>
        </aside>
      </div>}

      {podcastTab==='notebook' && <div className="notebook-layout">
        <article className="notebook-card">
          <div className="notebook-icon"><Zap/></div>
          <span className="section-kicker">NOTEBOOKLM SOURCE PACK</span>
          <h2>Week {game.week} • {game.opponent}</h2>
          <p>This view is now grounded in the same saved facts and transcript attached to the real DynastyHQ week.</p>
          <div className="source-list">
            <div><Check/><span><b>Game overview</b><small>{data.player.school} {game.us}–{game.them} {game.opponent} · Season {data.season}, Week {game.week}.</small></span></div>
            <div><Check/><span><b>Verified source facts</b><small>{facts.length} saved verified facts are attached to this publication.</small></span></div>
            <div><Check/><span><b>Scoring summary</b><small>{scoringFacts.length} saved facts reference scoring, drives, touchdowns, or field goals.</small></span></div>
            <div><Check/><span><b>Player development</b><small>{developmentFacts.length} saved facts reference RTG status, overall, or development.</small></span></div>
            <div><Check/><span><b>Podcast transcript</b><small>{episode.segments?.length || 0} saved transcript segments are available for source material.</small></span></div>
          </div>
          <button className="yellow" onClick={()=>notify('The real source data is mapped read-only. Download/export will be reconnected later in the preview workflow pass.')}><Zap/>SOURCE PACK STATUS<ChevronRight/></button>
        </article>
        <aside className="notebook-tip">
          <BookOpen/>
          <span>READ-ONLY BRIDGE</span>
          <h3>Same saved week. New presentation.</h3>
          <p>This redesign is reading the real DynastyHQ episode and verified publication data without changing the live career record.</p>
        </aside>
      </div>}
    </section>

    <section className="previous-episodes">
      <div className="previous-head"><div><span>THE ARCHIVE</span><h2>Previous Episodes</h2></div><button onClick={()=>notify('Archive selection will be wired during the workflow pass; these titles are already coming from your saved career.')}>View all episodes<ChevronRight/></button></div>
      <div className="episode-cards">
        {prior.length ? prior.map((item,index)=><button key={item.publicationId||index} onClick={()=>notify(`${item.title} is a real saved archive entry. Archive switching is the next interaction layer.`)}><span>{item.week? `WEEK ${item.week}` : `SEASON ${item.season}`}</span><b>{item.title}</b><small>{item.duration} • {item.audioReady?'Audio ready':'Transcript'}</small><Play/></button>) : <button onClick={()=>notify('No earlier saved podcast episodes were found in this career yet.')}><span>ARCHIVE</span><b>No previous saved episodes</b><small>Your older episodes will appear here automatically.</small><Archive/></button>}
      </div>
    </section>
  </div>;
}

function OffseasonPage({go,openPodcast,openArticle,notify}){
  const phases = [
    ['01','Season Review','done'],
    ['02','Career Decision','waiting'],
    ['03','Development','waiting'],
    ['04','Next Chapter','waiting'],
  ];
  return <div className="page offseason-page">
    <section className="offseason-hero-redesign">
      <div className="offseason-hero-copy">
        <span className="offseason-kicker"><Target/>END OF SEASON · OFFSEASON MODE</span>
        <small>SEASON 4 · OREGON</small>
        <h1>FINISH THE YEAR.<br/><em>BUILD WHAT’S NEXT.</em></h1>
        <p>Review the season, make the stay-or-transfer decision, capture offseason development, and preserve the year before the next chapter begins.</p>
        <div className="offseason-facts">
          <div><strong>5–3</strong><span>TEAM RECORD</span></div>
          <div><strong>4</strong><span>STARTS / APPS</span></div>
          <div><strong>QB1</strong><span>CURRENT ROLE</span></div>
          <div><strong>LIVE</strong><span>SEASON STATUS</span></div>
        </div>
      </div>
      <div className="offseason-hero-photo" style={{backgroundImage:`linear-gradient(90deg,rgba(0,24,18,.15),rgba(0,24,18,.02)),url(${playerPhoto})`}}/>
    </section>

    <section className="offseason-phase-rail">
      {phases.map(([num,label,state])=><div key={num} className={`offseason-phase is-${state}`}><span>{state==='done'?<Check/>:num}</span><div><small>{state==='done'?'COMPLETE':state==='current'?'NOW':'LATER'}</small><strong>{label}</strong></div></div>)}
    </section>

    <section className="offseason-waiting">
      <div><CalendarDays/><span><small>THE SEASON IS STILL LIVE</small><strong>Offseason decisions stay locked until the schedule closes.</strong></span></div>
      <p>This mockup shows the full Offseason workspace now, but the connected version will keep career decisions and next-season controls gated until the verified season is actually complete.</p>
      <button onClick={()=>go('gamehub')}>BACK TO GAME HUB<ChevronRight/></button>
    </section>

    <section className="offseason-section offseason-review">
      <div className="offseason-section-head"><div><span>01 · SEASON REVIEW</span><h2>What the season became</h2></div><Trophy/></div>
      <div className="offseason-review-grid">
        <article><span>TEAM SEASON</span><strong>5–3</strong><p>Current verified sample record through Week 10.</p></article>
        <article className="offseason-line-card"><span>YOUR SEASON</span><strong>STARTER CHAPTER</strong><div><b>2,846<small>PASS YDS</small></b><b>37<small>TOTAL TD</small></b><b>742<small>RUSH YDS</small></b><b>8<small>INT</small></b></div></article>
        <article><span>WHERE YOU STAND</span><strong>QB1</strong><p>76 OVR · Oregon starter · preview data</p></article>
      </div>
      <div className="offseason-season-notes">
        <div><span><TrendingUp/>HIGH-WATER MARK</span><strong>410 total yards vs Illinois</strong><small>Week 10 · 7 total touchdowns</small></div>
        <div><span><Award/>SEASON STORY</span><strong>Named starter → first start → signature game</strong><small>The major career beats already preserved in Chronicle.</small></div>
      </div>
    </section>

    <section className="offseason-section offseason-decision">
      <div className="offseason-section-head"><div><span>02 · CAREER DECISION</span><h2>Stay or write a new chapter?</h2></div><Archive/></div>
      <p className="offseason-lead">When the season ends, this becomes the decision desk. Returning to Oregon keeps the current chapter going; entering the portal opens a new branch without rewriting the season you just finished.</p>
      <div className="offseason-choice-grid">
        <article><UserRound/><span>RETURN</span><strong>OREGON</strong><p>Carry the starter chapter into the next season.</p></article>
        <article><Target/><span>TRANSFER PORTAL</span><strong>EXPLORE OPTIONS</strong><p>Compare schools, fit, role, and the next career opportunity.</p></article>
      </div>
      <button className="offseason-primary" onClick={()=>notify('The transfer decision desk will reconnect to your existing recruiting/portal workflow when we wire in real functionality.')}>PREVIEW DECISION DESK<ChevronRight/></button>
    </section>

    <section className="offseason-section offseason-development">
      <div className="offseason-section-head"><div><span>03 · OFFSEASON DEVELOPMENT</span><h2>Build the next version of your player</h2></div><Sparkles/></div>
      <p className="offseason-lead">DynastyHQ should compare your next RTG status capture against the player who finished this season. It won’t invent rating jumps—the changes come from what you upload.</p>
      <div className="offseason-development-grid">
        <div><span>OVERALL</span><strong>76</strong><small>Current saved rating</small></div>
        <div><span>ROLE</span><strong>QB1</strong><small>Current depth-chart spot</small></div>
        <div><span>SKILL POINTS</span><strong>—</strong><small>Captured from RTG status</small></div>
        <div><span>FOLLOWERS</span><strong>—</strong><small>Captured when available</small></div>
      </div>
      <button className="offseason-secondary" onClick={()=>go('gamehub')}>CAPTURE OFFSEASON UPDATE<ChevronRight/></button>
    </section>

    <section className="offseason-section offseason-coverage">
      <div className="offseason-section-head"><div><span>SEASON COVERAGE</span><h2>How the season was told</h2></div><Newspaper/></div>
      <div className="offseason-coverage-grid">
        <article><Newspaper/><span>NEWSROOM · WEEK 10</span><strong>Wessel Wins the Shootout</strong><p>The Illinois story stays part of the season archive.</p><button onClick={openArticle}>READ COVERAGE<ChevronRight/></button></article>
        <article><Headphones/><span>THE HUDDLE · WEEK 10</span><strong>The Illinois Shootout</strong><p>Episode, transcript, and source pack are preserved with the year.</p><button onClick={()=>openPodcast('episode')}>OPEN THE HUDDLE<ChevronRight/></button></article>
        <article><BookOpen/><span>CAREER CHRONICLE</span><strong>The Starter Chapter</strong><p>Season moments remain attached to the timeline.</p><button onClick={()=>go('chronicle')}>OPEN CHRONICLE<ChevronRight/></button></article>
      </div>
    </section>

    <section className="offseason-next">
      <div><span>04 · NEXT CHAPTER</span><h2>The next season stays behind the curtain for now.</h2><p>Finish Season 4, record the stay-or-transfer decision, capture development, then advance. Season 4 remains archived exactly as it happened.</p></div>
      <div><button onClick={()=>go('career')}><UserRound/>REVIEW CAREER</button><button onClick={()=>go('chronicle')}><BookOpen/>VIEW SEASON ARCHIVE</button></div>
    </section>

    <footer className="offseason-footer"><BookOpen/><p><strong>Nothing from Season 4 gets rewritten.</strong> Results, player stats, coverage, and career moments remain preserved when the next season begins.</p></footer>
  </div>;
}

function CareerPage({go}){
  const timeline = [
    ['S4 · W10','Illinois Shootout','410 total yards and seven touchdowns in a 54–48 Oregon win.'],
    ['S4 · W9','Michigan Road Test','Another major chapter in the first season as Oregon’s starter.'],
    ['S4 · W8','Ohio State Under the Lights','A national-stage week preserved across Game Hub, Newsroom, and The Huddle.'],
    ['S4 · W1','First College Start','The Vanderbilt week that moved the career from waiting to playing.'],
    ['PRESEASON','Named the Starter','The moment the Oregon quarterback job became Wessel’s.'],
  ];
  return <div className="page career-page">
    <section className="career-hero-redesign">
      <div className="career-portrait" style={{backgroundImage:`linear-gradient(0deg,rgba(0,23,17,.18),rgba(0,23,17,.04)),url(${playerPhoto})`}}/>
      <div className="career-identity">
        <span className="career-kicker"><Sparkles/>CAREER OVERVIEW</span>
        <h1>BRYAN<br/><em>WESSEL</em></h1>
        <p>#6 · QB · OREGON</p>
        <div className="career-chapter">
          <div><small>CURRENT CHAPTER</small><strong>ROAD TO GLORY PLAYER</strong><span>Season 4 · Week 10</span></div>
          <div><small>COLLEGE RECORD</small><strong>5–3</strong><span>Current sample season</span></div>
        </div>
      </div>
    </section>

    <section className="career-stat-row">
      <article><TrendingUp/><span>CAREER PASSING</span><strong>2,846</strong><small>28 TD · 8 INT · preview data</small></article>
      <article><Target/><span>CAREER RUSHING</span><strong>742</strong><small>9 rushing TD · preview data</small></article>
      <article><Shield/><span>DEVELOPMENT</span><strong>76 OVR</strong><small>QB1 · Oregon</small></article>
      <article><Trophy/><span>LEGACY</span><strong>6</strong><small>honors + milestones · preview</small></article>
    </section>

    <section className="career-content-grid">
      <article className="career-panel career-story-panel">
        <div className="career-panel-head"><div><span>CAREER STORY</span><h2>Timeline</h2></div><BookOpen/></div>
        <div className="career-timeline-list">
          {timeline.map(([meta,title,body],index)=><button key={title} onClick={()=>index===0?go('chronicle'):go('chronicle')}><i/><span><small>{meta}</small><strong>{title}</strong><p>{body}</p></span><ChevronRight/></button>)}
        </div>
      </article>

      <aside className="career-side-stack">
        <article className="career-panel">
          <div className="career-panel-head"><div><span>PLAYER PROFILE</span><h2>Current Snapshot</h2></div><UserRound/></div>
          <dl className="career-profile-list">
            <div><dt>Position</dt><dd>QB</dd></div>
            <div><dt>Program</dt><dd>Oregon</dd></div>
            <div><dt>Overall</dt><dd>76</dd></div>
            <div><dt>Depth Chart</dt><dd>QB1</dd></div>
            <div><dt>Career Stage</dt><dd>College Player</dd></div>
          </dl>
        </article>
        <article className="career-panel career-current-panel">
          <div className="career-panel-head"><div><span>CURRENT CHAPTER</span><h2>Road to Glory</h2></div><TrendingUp/></div>
          <strong>Season 4</strong>
          <p>The career has moved from earning the job to building a résumé as Oregon’s starter.</p>
          <button onClick={()=>go('gamehub')}>OPEN GAME HUB<ChevronRight/></button>
        </article>
      </aside>
    </section>

    <section className="career-lower-grid">
      <article className="career-panel">
        <div className="career-panel-head"><div><span>HISTORY</span><h2>Rivalry Ledger</h2></div><ShieldCheck/></div>
        <div className="career-rivalries">
          <div><span>Illinois</span><strong>1–0</strong><small>Last played S4</small></div>
          <div><span>Michigan</span><strong>1 meeting</strong><small>Season 4</small></div>
          <div><span>Ohio State</span><strong>1 meeting</strong><small>Season 4</small></div>
          <div><span>Vanderbilt</span><strong>1 meeting</strong><small>First start</small></div>
        </div>
      </article>
      <article className="career-panel">
        <div className="career-panel-head"><div><span>ACHIEVEMENTS</span><h2>Honors & Milestones</h2></div><Award/></div>
        <div className="career-honors">
          <div><Trophy/><span><strong>Named Oregon Starter</strong><small>Preseason · Season 4</small></span></div>
          <div><Trophy/><span><strong>First College Start</strong><small>Vanderbilt · Season 4</small></span></div>
          <div><Trophy/><span><strong>Seven-TD Signature Game</strong><small>Illinois · Week 10</small></span></div>
        </div>
      </article>
    </section>

    <footer className="career-footer-redesign">
      <span>DynastyHQ Career · Your Career. Your Legacy. Your Dynasty.</span>
      <button onClick={()=>go('chronicle')}>OPEN CAREER CHRONICLE<ChevronRight/></button>
    </footer>
  </div>;
}

function ChroniclePage({go,openPodcast,openArticle}){
  const [season,setSeason] = useState(4);
  const [moment,setMoment] = useState('illinois');
  const [museumTab,setMuseumTab] = useState('signatures');
  const moments = {
    illinois:{week:'W10',label:'SIGNATURE GAME',title:'W vs Illinois',score:'54–48',copy:'A seven-touchdown performance turns a shootout into one of the defining games of the season.',pass:'286',td:'7',int:'2'},
    michigan:{week:'W9',label:'ROAD TEST',title:'Michigan',score:'SEASON 4',copy:'A major road chapter preserved as the first season as starter kept building.',pass:'—',td:'—',int:'—'},
    ohio:{week:'W8',label:'NATIONAL STAGE',title:'Ohio State',score:'SEASON 4',copy:'A spotlight week with the game, coverage, and podcast preserved together.',pass:'—',td:'—',int:'—'},
    vandy:{week:'W1',label:'FIRST START',title:'Vanderbilt',score:'SEASON 4',copy:'The week the career changed from backup context to a verified college start.',pass:'—',td:'—',int:'—'},
  };
  const active=moments[moment];
  return <div className="page chronicle-page">
    <section className="chronicle-hero-redesign">
      <div>
        <span><Sparkles/>CAREER CHRONICLE</span>
        <h1>THE FILM OF<br/><em>THE CAREER</em></h1>
        <p>Seasons become chapters. Signature games, stories, shows, photos, and defining career moments stay attached to the week where they happened.</p>
      </div>
      <aside>
        <div><strong>4</strong><span>SEASONS</span></div>
        <div><strong>S4</strong><span>CURRENT</span></div>
        <div><strong>3</strong><span>SIGNATURES</span></div>
        <div><strong>MEDIA</strong><span>LINKED</span></div>
      </aside>
    </section>

    <nav className="chronicle-season-nav" aria-label="Career seasons">
      {[1,2,3,4].map(s=><button key={s} className={season===s?'active':''} onClick={()=>setSeason(s)}><span>SEASON {s}</span><strong>{s===4?'OREGON':'CAREER CHAPTER'}</strong><small>{s===4?'5–3 · QB':'Archived chapter'}</small></button>)}
    </nav>

    {season===4 ? <>
      <section className="chronicle-chapter">
        <div><span><CalendarDays/>SEASON 4 · OREGON</span><h2>THE STARTER CHAPTER</h2><p>A season that began with winning the job and is now producing nationally visible moments.</p></div>
        <div className="chronicle-season-line">
          <div><strong>5–3</strong><span>RECORD</span></div>
          <div><strong>W10</strong><span>CURRENT</span></div>
          <div><strong>4</strong><span>PRESERVED WEEKS</span></div>
          <div><strong>3</strong><span>SIGNATURES</span></div>
        </div>
      </section>

      <section className="chronicle-signatures">
        <header><div><span><Trophy/>SIGNATURE GAMES</span><h2>The weeks worth remembering</h2></div><small>Selected from verified career history</small></header>
        <div className="chronicle-signature-grid">
          <button className={moment==='illinois'?'active':''} onClick={()=>setMoment('illinois')}><span>WEEK 10 · SIGNATURE GAME</span><strong>W vs Illinois</strong><p>54–48 · 286 pass yds · 7 TD</p><small>Seven touchdowns · 410 total yards</small><ChevronRight/></button>
          <button className={moment==='ohio'?'active':''} onClick={()=>setMoment('ohio')}><span>WEEK 8 · NATIONAL STAGE</span><strong>Ohio State</strong><p>Major spotlight week</p><small>Newsroom + Huddle preserved</small><ChevronRight/></button>
          <button className={moment==='vandy'?'active':''} onClick={()=>setMoment('vandy')}><span>WEEK 1 · FIRST START</span><strong>Vanderbilt</strong><p>The beginning of the starter chapter</p><small>Career turning point</small><ChevronRight/></button>
        </div>
      </section>

      <section className="chronicle-moment">
        <div className="chronicle-moment-main">
          <span>{active.label} · SEASON 4 · {active.week}</span>
          <h2>{active.title}</h2>
          <p>{active.copy}</p>
          <div className="chronicle-moment-stats">
            <div><strong>{active.score}</strong><span>SCORE / CONTEXT</span></div>
            <div><strong>{active.pass}</strong><span>PASS YDS</span></div>
            <div><strong>{active.td}</strong><span>TOTAL TD</span></div>
            <div><strong>{active.int}</strong><span>INT</span></div>
          </div>
          <div className="chronicle-why"><span>WHY DYNASTYHQ KEPT THIS ONE</span><p>{active.copy}</p></div>
          <div className="chronicle-media-actions">
            <button onClick={openArticle}><Newspaper/>READ NEWSROOM</button>
            <button onClick={()=>openPodcast('episode')}><Headphones/>PLAY THE HUDDLE</button>
            <button onClick={()=>go('gamehub')}><BarChart3/>OPEN GAME DATA</button>
          </div>
        </div>
        <aside className="chronicle-memory-stack">
          <span>MEMORY STACK</span>
          <article><Newspaper/><div><small>DYNASTYHQ NEWSROOM</small><strong>Wessel Leads Oregon Past Illinois</strong><p>The complete editorial recap stays attached to Week 10.</p></div></article>
          <article><Headphones/><div><small>THE HUDDLE</small><strong>The Illinois Shootout</strong><p>Episode, transcript, and NotebookLM source pack preserved with the week.</p></div></article>
          <article><ImageIcon/><div><small>PHOTO LIBRARY</small><strong>Game imagery</strong><p>Visual memories remain tied to the career moment.</p></div></article>
        </aside>
      </section>

      <section className="chronicle-timeline">
        <header><div><span><BookOpen/>SEASON TIMELINE</span><h2>Every verified chapter</h2></div><small>4 preserved entries</small></header>
        <div>
          <button className={moment==='illinois'?'active':''} onClick={()=>setMoment('illinois')}><span>W10</span><strong>Illinois Shootout</strong><small>W · 54–48 · signature game</small><Newspaper/><Headphones/><ChevronRight/></button>
          <button className={moment==='michigan'?'active':''} onClick={()=>setMoment('michigan')}><span>W9</span><strong>Michigan Road Test</strong><small>Season 4 career chapter</small><Newspaper/><ChevronRight/></button>
          <button className={moment==='ohio'?'active':''} onClick={()=>setMoment('ohio')}><span>W8</span><strong>Ohio State Under the Lights</strong><small>National-stage week</small><Headphones/><ChevronRight/></button>
          <button className={moment==='vandy'?'active':''} onClick={()=>setMoment('vandy')}><span>W1</span><strong>First Start vs Vanderbilt</strong><small>Starter chapter begins</small><ChevronRight/></button>
        </div>
      </section>
    </> : <section className="chronicle-archived-season"><Archive/><span>SEASON {season}</span><h2>Archived Career Chapter</h2><p>This preview keeps earlier seasons intentionally compact. In the connected build, verified games, milestones, media, and stats for this season populate here automatically.</p></section>}

    <section className="chronicle-museum">
      <header><div><span><Trophy/>CAREER MUSEUM</span><h2>The Legacy So Far</h2></div><small>Built automatically from preserved history</small></header>
      <nav>
        {[['signatures','SIGNATURE GAMES'],['records','RECORD BOOK'],['media','MEDIA VAULT'],['stops','CAREER STOPS']].map(([id,label])=><button key={id} className={museumTab===id?'active':''} onClick={()=>setMuseumTab(id)}>{label}</button>)}
      </nav>
      <div className="museum-content">
        {museumTab==='signatures' && <div className="museum-signature-grid"><article><span>S4 · W10</span><strong>ILLINOIS SHOOTOUT</strong><p>410 total yards · 7 TD</p></article><article><span>S4 · W8</span><strong>OHIO STATE</strong><p>National-stage career week</p></article><article><span>S4 · W1</span><strong>FIRST START</strong><p>Vanderbilt · starter chapter begins</p></article></div>}
        {museumTab==='records' && <div className="museum-record-grid"><article><strong>410</strong><span>TOTAL YARDS</span><small>Career high · S4 W10</small></article><article><strong>7</strong><span>TOTAL TD</span><small>Career high · S4 W10</small></article><article><strong>124</strong><span>RUSH YDS</span><small>Signature game · S4 W10</small></article></div>}
        {museumTab==='media' && <div className="museum-record-grid"><article><Newspaper/><strong>Newsroom</strong><small>Stories preserved with career weeks</small></article><article><Headphones/><strong>The Huddle</strong><small>Episodes + transcripts archived</small></article><article><Camera/><strong>Game Photos</strong><small>Visual memories linked to moments</small></article></div>}
        {museumTab==='stops' && <div className="museum-stop"><Logo/><span><small>CAREER STOP</small><strong>OREGON</strong><p>Season 4 · Road to Glory Player · current program</p></span></div>}
      </div>
    </section>
  </div>;
}

function Newsroom({data,articleOpen,setArticleOpen,openArticle,openPodcast,go,playing,setPlaying,notify}){
  const news=data.news || {};
  const game=data.game || {};
  const lastName=data.player.name.split(' ').at(-1);
  return <div className="page newsroom-page">
    <section className="journal">
      <header className="masthead">
        <div className="mast-row"><h1>THE FOOTBALL JOURNAL</h1><span>{data.player.school} EDITION • SEASON {data.season} • WEEK {news.week || game.week}</span></div>
        <div className="journal-tabs">
          <button className={!articleOpen?'active':''} onClick={()=>{setArticleOpen(false);window.scrollTo({top:0,behavior:'smooth'})}}>Front Page</button>
          <button onClick={()=>notify(`${news.articles?.length || 0} real saved Newsroom stories are available for this week. Outlet switching is the next Newsroom interaction pass.`)}>Local Beat</button>
          <button onClick={()=>notify('National outlet switching will reuse the real saved Newsroom articles during the workflow pass.')}>National</button>
          <button onClick={()=>notify('The real Newsroom archive is connected in the data bridge; archive selection UI is next.')}>Archive</button>
        </div>
      </header>

      {articleOpen ? (
        <NewsroomArticle data={data} onBack={()=>{setArticleOpen(false);window.scrollTo({top:0,behavior:'smooth'})}} go={go} openPodcast={openPodcast}/>
      ) : (
        <>
          <section className="lead-story">
            <div className="lead-copy">
              <span>{news.kicker || 'GAME RECAP'}</span>
              <h2>{news.headline}</h2>
              <p>{news.dek}</p>
              <button className="yellow" onClick={openArticle}>Read full story<ChevronRight/></button>
            </div>
            <div className="lead-image" style={{backgroundImage:`linear-gradient(90deg,rgba(242,239,230,.22),transparent 28%),linear-gradient(0deg,rgba(0,40,28,.06),transparent),url(${playerPhoto})`}}>
              <div className="journal-player"><span>{data.player.number}</span></div>
            </div>
          </section>

          <section className="journal-score">
            <div><Logo team={data.player.school.slice(0,1)}/><b>{data.player.school}</b><strong>{game.us}</strong></div><span>FINAL</span><div><strong>{game.them}</strong><Logo team={game.opponent.slice(0,1)}/><b>{game.opponent}</b></div><i/>
            <div><b>{lastName}</b></div><div><strong>{game.total}</strong><small>TOTAL YARDS</small></div><div><strong>{game.td}</strong><small>TOTAL TD</small></div>
          </section>

          <section className="journal-lower">
            <article className="journal-box inside reference-journal-box">
              <CardHeader title="INSIDE THE GAME" light/>
              <p>The verified numbers behind the latest saved game.</p>
              <div className="inside-grid"><div className="tiny-photo photo-tile" style={{backgroundImage:`url(${playerPhoto})`}}/><div><button onClick={()=>go('gamehub')}><ClipboardList/>Player stats<ChevronRight/></button><button onClick={()=>go('gamehub')}><BarChart3/>Scoring drives<ChevronRight/></button></div></div>
            </article>

            <article className="journal-box huddle reference-journal-box">
              <CardHeader title="THE HUDDLE" light/>
              <div className="huddle-grid">
                <button className="cover-play" onClick={()=>openPodcast('episode')}><img src={podcastCover} alt="The Huddle"/><span><Play/></span></button>
                <div><small>Week {game.week}</small><h3>{data.podcast.title}</h3><p>{data.podcast.summary}</p><b>{data.podcast.duration}</b></div>
              </div>
              <div className="huddle-actions"><button onClick={()=>openPodcast('transcript')}><FileText/>Print transcript</button><button onClick={()=>openPodcast('notebook')}><Zap/>NotebookLM pack</button></div>
              {playing && <div className="now-playing">▶ Saved episode selected…</div>}
            </article>

            <article className="journal-box career-file reference-journal-box">
              <CardHeader title="THE CAREER FILE" light/>
              <div className="career-grid"><div className="back-photo photo-tile" style={{backgroundImage:`linear-gradient(0deg,rgba(0,28,20,.25),transparent 60%),url(${playerPhoto})`}}><span>{lastName}</span><b>{data.player.number}</b></div><div><h3>From the early chapters<br/>to the current spotlight.</h3><p>Follow {data.player.name}’s preserved career story, milestones, and defining weeks.</p><button onClick={()=>go('chronicle')}>Explore Chronicle<ChevronRight/></button></div></div>
            </article>
          </section>
        </>
      )}
    </section>
  </div>;
}

function NewsroomArticle({data,onBack,go,openPodcast}){
  const news=data.news || {};
  const game=data.game || {};
  const lastName=data.player.name.split(' ').at(-1);
  const paragraphs=news.paragraphs?.length ? news.paragraphs : [
    news.dek || `${data.player.school} completed its latest verified game against ${game.opponent}.`,
    `${data.player.name} finished with ${game.total} total yards and ${game.td} total touchdowns in the saved game record.`,
    `The next scheduled opponent is ${data.next.opponent} in Week ${data.next.week}.`,
  ];
  const published=(()=>{
    if(!news.publishedAt) return '';
    const date=new Date(news.publishedAt);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  })();

  return <article className="newsroom-article digital-feature">
    <div className="newsroom-article-tools">
      <button className="article-back" onClick={onBack}><ChevronRight className="back-chevron"/>Back to Front Page</button>
      <span>{news.kicker || 'GAME RECAP'} • WEEK {news.week || game.week}</span>
    </div>

    <section className="digital-feature-top">
      <header className="digital-feature-head">
        <span className="digital-kicker">{news.kicker || 'GAME RECAP'}</span>
        <h1>{news.headline}</h1>
        <p className="digital-deck">{news.dek}</p>
        <div className="digital-byline">
          <span>By <b>{news.byline || 'DynastyHQ Staff'}</b> · {news.outlet || 'DynastyHQ Sports'}</span>
          {published && <time>{published}</time>}
        </div>
      </header>

      <figure className="digital-hero-figure">
        <div className="digital-hero-photo" style={{backgroundImage:`linear-gradient(90deg,rgba(244,241,233,.12),transparent 18%),linear-gradient(0deg,rgba(0,20,14,.24),transparent 48%),url(${playerPhoto})`}}/>
        <figcaption>
          <span>{news.photoCaption || news.dek}</span>
          <em>Career Photo Library</em>
        </figcaption>
      </figure>
    </section>

    <section className="digital-scorebar">
      <div className="digital-team"><Logo team={data.player.school.slice(0,1)}/><span><b>{data.player.school}</b><strong>{game.us}</strong></span></div>
      <em>FINAL</em>
      <div className="digital-team away"><span><strong>{game.them}</strong><b>{game.opponent}</b></span><Logo team={game.opponent.slice(0,1)}/></div>
      <i/>
      <div className="digital-stat"><strong>{game.pass}</strong><small>PASS YDS</small></div>
      <div className="digital-stat"><strong>{game.rush}</strong><small>RUSH YDS</small></div>
      <div className="digital-stat"><strong>{game.total}</strong><small>TOTAL YARDS</small></div>
      <div className="digital-stat"><strong>{game.td}</strong><small>TOTAL TD</small></div>
    </section>

    <div className="digital-story-layout">
      <main className="digital-story-copy">
        {paragraphs.map((paragraph,index)=><p key={index} className={index===0?'digital-lede':undefined}>{paragraph}</p>)}
        <button className="article-data-link" onClick={()=>go('gamehub')}><BarChart3/>View verified game data<ChevronRight/></button>
      </main>

      <aside className="digital-story-rail">
        <section className="snapshot-card">
          <div className="snapshot-head">GAME SNAPSHOT</div>
          <div className="snapshot-row"><span>Final</span><b>{data.player.school} {game.us}, {game.opponent} {game.them}</b></div>
          <div className="snapshot-row"><span>Passing</span><b>{game.pass} yards, {game.passTD} TD</b></div>
          <div className="snapshot-row"><span>Rushing</span><b>{game.rush} yards, {game.rushTD} TD</b></div>
          <div className="snapshot-row"><span>{lastName}</span><b>{game.total} total yards, {game.td} TD</b></div>
        </section>

        <section className="related-card">
          <span>RELATED COVERAGE</span>
          <button onClick={()=>go('gamehub')}><BarChart3/><b>Inside the Game</b><small>Player stats + scoring drives</small><ChevronRight/></button>
          <button onClick={()=>openPodcast('episode')}><Headphones/><b>The Huddle</b><small>{data.podcast.title} · {data.podcast.duration}</small><ChevronRight/></button>
          <button onClick={()=>go('chronicle')}><Archive/><b>Career File</b><small>Follow the preserved career story</small><ChevronRight/></button>
        </section>
      </aside>
    </div>

    <section className="digital-related-strip">
      <button onClick={()=>go('gamehub')}><BarChart3/><span><small>GAME DATA</small><b>See the verified numbers</b></span><ChevronRight/></button>
      <button onClick={()=>openPodcast('episode')}><Headphones/><span><small>THE HUDDLE</small><b>{data.podcast.title}</b></span><ChevronRight/></button>
      <button onClick={()=>go('chronicle')}><Archive/><span><small>CAREER FILE</small><b>Follow {lastName}’s season story</b></span><ChevronRight/></button>
    </section>
  </article>;
}

export default App;
