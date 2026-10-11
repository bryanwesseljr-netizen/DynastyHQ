import React from 'react';
import { Archive, BarChart3, BookOpen, ChevronRight, Headphones, Newspaper, ShieldCheck } from 'lucide-react';
import { offseasonSpecialLabel } from '../domain/offseasonMediaViews.js';
import './offseason-native-newsroom.css';

const present = (v) => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v));
const fmt = (v) => present(v) ? Number(v).toLocaleString('en-US') : '—';
const list = (v) => Array.isArray(v) ? v.filter(Boolean) : [];

export function OffseasonFrontPage({editions=[],visual={},onRead,onStudio}){
  const lead=editions.find(e=>e.type==='season-review') || editions[0];
  if(!lead) return <section className="offseason-frontpage-unpublished">
    <Newspaper size={30}/><div><span>SEASON COMPLETE · NEWSROOM</span><h2>The season-ending edition has not been published.</h2>
    <p>Your saved games and earlier articles are preserved. Restore and publish the Season Review from Offseason Studio to create this Newsroom feature.</p>
    <button type="button" onClick={onStudio}>OPEN OFFSEASON COVERAGE STUDIO <ChevronRight/></button></div>
  </section>;
  return <>
    <section className="lead-story offseason-newspaper-front">
      <div className="lead-copy">
        <span>THE FOOTBALL JOURNAL · {offseasonSpecialLabel(lead)}</span>
        <h2>{lead.article.headline}</h2>
        <p>{lead.article.dek}</p>
        <div className="lead-outlet-row"><b>DynastyHQ Sports Desk</b><small>SEASON {lead.season} · POSTSEASON EDITION</small></div>
        <button className="yellow" type="button" onClick={()=>onRead(lead)}>READ FULL ARTICLE <ChevronRight/></button>
      </div>
      <div className="lead-image" style={{
        backgroundImage:`linear-gradient(90deg,rgba(242,239,230,.12),transparent 28%),url(${visual.image||''})`,
        backgroundPosition:`${visual.position||'center'} 29%`,
      }}>
        <div className="journal-photo-credit"><span>SEASON FEATURE</span><small>{lead.school} · Season {lead.season}</small></div>
      </div>
    </section>
    <section className="newsroom-edition-deck offseason-front-edition-deck" aria-label="Season-ending feature stories">
      {editions.map(e=><button type="button" key={e.id} className="edition-story-card offseason-front-story" onClick={()=>onRead(e)}>
        <span>{e.type==='portal-entry'?'BREAKING NEWS · TRANSFER PORTAL':'SEASON IN REVIEW'}</span>
        <strong>{e.article.headline}</strong><small>{e.article.dek}</small>
        <em>Read the full {e.type==='portal-entry'?'announcement':'retrospective'} <ChevronRight/></em>
      </button>)}
    </section>
  </>;
}

export function OffseasonFeatureArticle({edition,visual={},onBack,onPodcast,onGamehub,onChronicle}){
  const facts=edition?.facts||{};
  const article=edition?.article||{};
  const latest=facts.latestGame||null;
  const record=facts.record||{};
  const totals=facts.playerTotals||{};
  const postseason=list(facts.postseasonGames);
  const published=edition.publishedAt ? new Date(edition.publishedAt) : null;
  const publishedLabel=published && !Number.isNaN(published.getTime())
    ? published.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : '';
  const isPortal=edition.type==='portal-entry';
  const finalScore=latest?.score && present(latest.score.team) && present(latest.score.opponent)
    ? `${edition.school} ${fmt(latest.score.team)}–${fmt(latest.score.opponent)} ${latest.opponent}`
    : '';
  return <article className="newsroom-article digital-feature article-skin-national offseason-native-article" data-audience="national">
    <div className="newsroom-article-tools">
      <button type="button" className="article-back" onClick={onBack}><ChevronRight className="back-chevron"/>Back to Front Page</button>
      <span>{isPortal?'BREAKING NEWS · TRANSFER PORTAL':'SEASON IN REVIEW'} • SEASON {edition.season}</span>
      <span className="offseason-verified-stamp"><ShieldCheck size={15}/> SAVED SPECIAL EDITION</span>
    </div>
    <header className="article-publication-banner">
      <div className="article-publication-mark" aria-hidden="true"><Newspaper/></div>
      <div className="article-publication-copy"><small>THE FOOTBALL JOURNAL · DYNASTYHQ MEDIA NETWORK</small><strong>National College Football Desk</strong></div>
      <div className="article-publication-meta"><span>Season {edition.season}</span><b>{isPortal?'Transfer Portal':'Season Complete'}</b></div>
    </header>
    <figure className="national-article-hero">
      <div style={{backgroundImage:`linear-gradient(0deg,rgba(0,0,0,.30),transparent 55%),url(${visual.image||''})`,backgroundPosition:`${visual.position||'center'} 25%`}}/>
      <figcaption><span>{edition.school} · {isPortal?'The next chapter begins':'A season remembered'}</span><em>DynastyHQ editorial feature</em></figcaption>
    </figure>
    <section className="national-headline-block">
      <span>{article.category || offseasonSpecialLabel(edition)}</span>
      <h1>{article.headline}</h1>
      <p>{article.dek}</p>
      <div className="national-byline"><b>{article.byline||'DynastyHQ Sports Desk'}</b>{publishedLabel&&<time>Published {publishedLabel}</time>}<span>National Desk</span></div>
    </section>
    <div className="offseason-article-context-band">
      <div><small>SEASON {edition.season} · {edition.school}</small><strong>{present(record.wins)&&present(record.losses)?`${fmt(record.wins)}–${fmt(record.losses)}`:'RECORD NOT VERIFIED'}</strong></div>
      <div><small>FINAL POSTSEASON RESULT</small><strong>{finalScore || (latest?.stage||'Not recorded')}</strong></div>
      <div><small>PLAYER</small><strong>{edition.player||facts.player||'Career quarterback'}</strong></div>
    </div>
    <div className="national-article-body offseason-native-article-body">
      <main className="national-copy">
        <div className="article-section-label"><span>{isPortal?'BREAKING NEWS':'SEASON RETROSPECTIVE'}</span><b>DynastyHQ Sports Desk</b></div>
        {list(article.paragraphs).map((paragraph,index)=><p key={index} className={index===0?'digital-lede':''}>{paragraph}</p>)}
        <button className="article-data-link" type="button" onClick={onGamehub}><BarChart3/>Review the verified Season {edition.season} game logs <ChevronRight/></button>
      </main>
      <aside className="national-rail">
        <section className="national-gamecenter offseason-feature-factcard">
          <header><span>SEASON AT A GLANCE</span><b>VERIFIED</b></header>
          <div><small>Appearances</small><strong>{fmt(totals.appearances)}</strong></div>
          <div><small>Passing</small><strong>{fmt(totals.passingYards)} YDS · {fmt(totals.passingTouchdowns)} TD</strong></div>
          <div><small>Rushing</small><strong>{fmt(totals.rushingYards)} YDS · {fmt(totals.rushingTouchdowns)} TD</strong></div>
          <div><small>Last opponent</small><strong>{latest?.opponent||'Not recorded'}</strong></div>
        </section>
        {postseason.length>0&&<section className="offseason-playoff-road">
          <h3>ROAD THROUGH THE PLAYOFF</h3>
          {postseason.map((game,index)=><div key={index}>
            <small>{game.postseason||`W${game.week}`}</small>
            <b>vs {game.opponent}</b>
            <span>{game.score && present(game.score.team) && present(game.score.opponent)
              ?`${fmt(game.score.team)}–${fmt(game.score.opponent)}`:game.result||'Result not recorded'}</span>
          </div>)}
        </section>}
        {isPortal&&<section className="offseason-playoff-road">
          <h3>TRANSFER PORTAL STATUS</h3>
          <p>Entry confirmed. New school and offers have not been verified. This is not a commitment announcement.</p>
        </section>}
      </aside>
    </div>
    <section className="digital-related-strip">
      <button type="button" onClick={onPodcast}><Headphones/><span><small>COMPANION EPISODE</small><b>The Huddle · {edition.podcast?.title||'Offseason Special'}</b></span><ChevronRight/></button>
      <button type="button" onClick={onGamehub}><BarChart3/><span><small>GAME DATA</small><b>Season {edition.season} records</b></span><ChevronRight/></button>
      <button type="button" onClick={onChronicle}><Archive/><span><small>CAREER FILE</small><b>The road to the next chapter</b></span><ChevronRight/></button>
    </section>
  </article>;
}
