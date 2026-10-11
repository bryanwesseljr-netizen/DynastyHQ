import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { Archive, BookOpen, Check, Download, FileText, Headphones, Loader2, Newspaper, Shield, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { auth, db, productionAppId } from '../firebase.js';
import { readHydratedCareerInTransaction, writeHydratedCareerInTransaction } from '../services/careerStorageFirestore.js';
import { estimatedJsonBytes, splitCareerStateForStorage } from '../domain/careerStorage.js';
import { detectDestructiveCareerRegression } from '../domain/saveProtection.js';
import { openTransferRecruiting } from '../domain/playerRecruiting.js';
import {
  offseasonCoverageFacts, normalizeOffseasonDraft, offseasonNotebookSourcePack,
  offseasonPublicationId, upsertOffseasonEdition,
} from '../domain/offseasonCoverageStudio.js';
import {
  loadOffseasonDraftBackup, saveOffseasonDraftBackup, clearOffseasonDraftBackup,
  restoreOffseasonDraftFromDownload,
} from '../domain/offseasonDraftRecovery.js';
import './offseason-coverage-studio.css';

const draftBrowserStore=()=>{try{return window.localStorage}catch{return null}};
const SPECIALS=[
  {type:'season-review',eyebrow:'01 · SEASON FINALE',heading:'The Season That Almost Was',summary:'A complete season retrospective, from regular-season performances to the Cotton Bowl semifinal exit.',icon:Newspaper},
  {type:'portal-entry',eyebrow:'02 · BREAKING NEWS',heading:'The Transfer Portal Announcement',summary:'Announce the verified portal entry for your final year. Your next school stays unconfirmed.',icon:Target},
];
const saveText=(name,text)=>{
  const blob=new Blob([text],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};

export default function OffseasonCoverageStudio({data,notify}){
  const [tab,setTab]=useState(()=>{
    try{
      const requested=window.sessionStorage.getItem('dynastyhq-offseason-open-special');
      window.sessionStorage.removeItem('dynastyhq-offseason-open-special');
      return ['portal-entry','season-review'].includes(requested)?requested:'season-review';
    }catch{return 'season-review';}
  });
  const [drafts,setDrafts]=useState({});
  const recoveryPicker=useRef(null);
  const [recoveryMessage,setRecoveryMessage]=useState('');
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [portalConfirmed,setPortalConfirmed]=useState(false);
  const [showPublishConfirm,setShowPublishConfirm]=useState(false);
  const [expanded,setExpanded]=useState({article:true,podcast:false});
  const state=data.state||{};
  const season=Number(state.currentSeason||data.season)||1;
  const ownerUid=auth.currentUser?.uid||'';
  const editions=useMemo(()=>(state.offseasonEditions||[]).filter(e=>Number(e.season)===season),[state.offseasonEditions,season]);
  const persisted=editions.find(e=>e.type===tab)||null;
  const draft=drafts[offseasonPublicationId(season,tab)]||null;
  const shown=draft||persisted;
  useEffect(()=>{
    if(!ownerUid)return;
    const restored={};
    for(const type of ['season-review','portal-entry']){
      if(editions.some(e=>e.type===type))continue;
      const saved=loadOffseasonDraftBackup(draftBrowserStore(),ownerUid,season,type);
      if(saved)restored[saved.id]=saved;
    }
    if(Object.keys(restored).length){
      setDrafts(old=>({...restored,...old}));
      setRecoveryMessage('A previously generated unsaved draft was restored from this browser.');
    }
  },[season,ownerUid,editions]);
  const feature=SPECIALS.find(e=>e.type===tab)||SPECIALS[0];
  const existingPortal=state.playerRecruiting?.transfer?.status==='exploring';
  const portalReady=portalConfirmed||existingPortal;

  const selectTab=(type)=>{setTab(type);setError('');setRecoveryMessage('');setShowPublishConfirm(false);setExpanded({article:true,podcast:false});};
  const generate=async()=>{
    if(busy)return;
    setError('');setShowPublishConfirm(false);
    setBusy('generating');
    try{
      const user=auth.currentUser;
      if(!user)throw new Error('Connect your DynastyHQ owner account first.');
      const facts=offseasonCoverageFacts(state,tab,{portalConfirmed:portalReady});
      const token=await user.getIdToken();
      const response=await fetch('/api/generate-newsroom',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({offseasonSpecial:true,facts}),
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'The offseason desk could not produce a complete special edition.');
      const generated=normalizeOffseasonDraft(result.edition,facts,result.model);
      setDrafts(old=>({...old,[generated.id]:generated}));
      try{
        saveOffseasonDraftBackup(draftBrowserStore(),user.uid,generated);
        setRecoveryMessage('Draft safely saved in this browser. Refreshing will not erase it.');
      }catch{
        setRecoveryMessage('Draft is available now, but this browser blocked automatic storage. Download a draft backup before leaving the page.');
      }
      setExpanded({article:true,podcast:false});
      notify?.('Offseason special drafted. Review the article and transcript, then publish when ready.');
    }catch(e){setError(e?.message||'Generation did not complete; your saved career is unchanged.');}
    finally{setBusy('');}
  };

  const publish=async()=>{
    if(!draft||busy)return;
    setError('');setBusy('publishing');
    try{
      const user=auth.currentUser;
      if(!user)throw new Error('Reconnect your DynastyHQ owner session before publishing.');
      const eventType=tab;
      const publishedDraft=draft;
      const backupId=`offseason-before-${season}-${eventType}-${Date.now()}`;
      await runTransaction(db,async(transaction)=>{
        const loaded=await readHydratedCareerInTransaction({
          transaction,db,appId:productionAppId,userId:user.uid,
        });
        if(!loaded)throw new Error('Could not reload the real career for safe publication.');
        const remote=loaded.state;
        const currentFacts=offseasonCoverageFacts(remote,eventType,{portalConfirmed:portalReady});
        if(currentFacts.publicationId!==publishedDraft.publicationId
          || JSON.stringify(currentFacts.completedGames)!==JSON.stringify(publishedDraft.facts.completedGames)
          || JSON.stringify(currentFacts.record)!==JSON.stringify(publishedDraft.facts.record)){
          throw new Error('Your saved season changed since this draft was generated. Regenerate the special before publishing.');
        }
        let next=upsertOffseasonEdition(remote,publishedDraft);
        if(eventType==='portal-entry' && remote.playerRecruiting?.transfer?.status!=='exploring'){
          if(!portalConfirmed)throw new Error('You must confirm entering the real game transfer portal first.');
          next=openTransferRecruiting(next);
        }
        if(detectDestructiveCareerRegression(remote,next).blocked)
          throw new Error('The save protection system blocked a potential career regression.');
        const split=splitCareerStateForStorage(next);
        if(estimatedJsonBytes(split.mainState)>=940*1024)
          throw new Error('The career main document is too large for safe publishing. Your prior coverage was preserved.');
        const prior=remote.offseasonEditions?.find((entry)=>entry.id===publishedDraft.id)||null;
        const previousTransfer=remote.playerRecruiting?.transfer||null;
        transaction.set(
          doc(db,'artifacts',productionAppId,'users',user.uid,'hq_data',backupId),
          {
            id:backupId,season,type:eventType,createdAt:new Date().toISOString(),
            reason:'Recovery point before offseason coverage publication',
            priorEdition:prior,priorTransfer:previousTransfer,
            playerSchool:remote.player?.college||remote.player?.school||'',
            currentSeason:remote.currentSeason,currentWeek:remote.currentWeek,
          },
        );
        writeHydratedCareerInTransaction({
          transaction,db,appId:productionAppId,userId:user.uid,state:next,
        });
      });
      setDrafts(old=>({...old,[publishedDraft.id]:null}));
      try{clearOffseasonDraftBackup(draftBrowserStore(),user.uid,season,eventType)}catch{}
      setRecoveryMessage('');
      setShowPublishConfirm(false);
      notify?.(tab==='portal-entry'
        ? 'Transfer portal announcement published. Portal exploration recorded; no destination selected.'
        : 'Season retrospective published without changing the semifinal coverage.');
    }catch(e){setError(e?.message||'The offseason special could not be saved. Existing coverage is safe.');}
    finally{setBusy('');}
  };
  const downloadDraftBackup=()=>{
    if(!draft)return;
    saveText(`DynastyHQ-S${season}-${tab}-DRAFT-BACKUP.json`,JSON.stringify(draft,null,2));
  };
  const restoreDownload=async(event)=>{
    const file=event.target?.files?.[0];
    if(event.target)event.target.value='';
    if(!file)return;
    setError('');setRecoveryMessage('');
    try{
      if(file.size>1_500_000)throw new Error('This file is larger than the expected DynastyHQ producer pack. Choose the original text download.');
      if(!auth.currentUser)throw new Error('Connect your DynastyHQ owner account before restoring a draft.');
      const facts=offseasonCoverageFacts(state,tab,{portalConfirmed:portalReady});
      const source=await file.text();
      const recovered=restoreOffseasonDraftFromDownload(source,facts);
      setDrafts(old=>({...old,[recovered.id]:recovered}));
      setExpanded({article:true,podcast:true});
      setShowPublishConfirm(false);
      try{
        saveOffseasonDraftBackup(draftBrowserStore(),auth.currentUser.uid,recovered);
        setRecoveryMessage('Original article, episode chapters and podcast script restored from your download. A recoverable copy is saved in this browser.');
      }catch{
        setRecoveryMessage('Original article and podcast restored. This browser could not save a backup; download the draft backup before refreshing.');
      }
    }catch(e){setError(e?.message||'This file could not restore the previous draft. Nothing was overwritten.');}
  };
  const downloadNotebook=()=>{
    if(!shown)return;
    saveText(`DynastyHQ-S${season}-${tab}-NotebookLM.txt`,offseasonNotebookSourcePack(shown));
  };
  const downloadTranscript=()=>{
    if(!shown)return;
    const p=shown.podcast;
    saveText(`DynastyHQ-S${season}-${tab}-Transcript.txt`,[
      p.showName||'The Huddle',p.title,
      ...p.segments.map(s=>`\n${s.speaker}: ${s.text}`),
    ].join('\n'));
  };
  return <section className="offseason-studio" aria-label="Offseason coverage studio">
    <header className="offseason-studio-header">
      <div><span className="offseason-studio-kicker"><Sparkles size={15}/> DYNASTYHQ MEDIA NETWORK · OFFSEASON STUDIO</span>
        <h2>THE SEASON ENDS. <em>THE STORY DOESN'T.</em></h2>
        <p>Two independent special editions. Publish a full season retrospective, then break the transfer portal news—without replacing the Alabama game coverage.</p>
      </div>
      <div className="offseason-studio-seal"><ShieldCheck size={18}/> OWNER-APPROVED PUBLISHING</div>
    </header>
    <div className="offseason-studio-tabs" role="tablist" aria-label="Coverage edition">
      {SPECIALS.map(item=>{
        const Icon=item.icon;
        const isSaved=editions.some(e=>e.type===item.type);
        return <button type="button" role="tab" aria-selected={tab===item.type} key={item.type}
            onClick={()=>selectTab(item.type)} className={tab===item.type?'active':''}>
          <Icon size={20}/><span><small>{item.eyebrow}</small><strong>{item.heading}</strong></span>
          {isSaved?<Check size={16} className="published-icon"/>:null}
        </button>;
      })}
    </div>
    <div className="offseason-studio-body">
      <div className="offseason-studio-intro">
        <span>{feature.eyebrow}</span><h3>{feature.heading}</h3><p>{feature.summary}</p>
      </div>
      {tab==='portal-entry' && <label className="offseason-portal-confirm">
        <input type="checkbox" checked={portalReady} disabled={existingPortal} onChange={e=>setPortalConfirmed(e.target.checked)}/>
        <span><strong>{existingPortal?'TRANSFER PORTAL ALREADY RECORDED':'I HAVE ENTERED THE TRANSFER PORTAL IN COLLEGE FOOTBALL 27'}</strong>
          <small>Confirm the real in-game event. This announcement must not claim a transfer commitment, offers, or a new school.</small>
        </span>
      </label>}
      <div className="offseason-studio-controls">
        <button type="button" className="offseason-studio-generate" onClick={generate}
          disabled={!!busy||(tab==='portal-entry'&&!portalReady)}>
          {busy==='generating'?<Loader2 className="spin" size={17}/>:<Sparkles size={17}/>}
          {busy==='generating'?'WRITING SPECIAL EDITION…':draft?'REGENERATE UNSAVED DRAFT':'GENERATE ARTICLE + PODCAST'}
        </button>
        {persisted&&!draft&&<span className="offseason-studio-saved"><Check size={16}/> PUBLISHED · {new Date(persisted.publishedAt||persisted.generatedAt).toLocaleDateString()}</span>}
      </div>
      {error&&<p className="offseason-studio-error" role="alert">{error}</p>}
      {recoveryMessage&&<p className="offseason-studio-draft-note"><ShieldCheck size={16}/>{recoveryMessage}</p>}
      <div className="offseason-studio-recovery">
        <div><strong>ALREADY GENERATED THIS STORY?</strong>
          <small>If you refreshed before publishing, you can recover your original article and podcast from the NotebookLM Producer Pack downloaded earlier. No new AI generation required.</small>
        </div>
        <input ref={recoveryPicker} type="file" accept=".txt,.json,text/plain,application/json" className="offseason-studio-recovery-input" aria-label="Restore an offseason draft from a NotebookLM download" onChange={restoreDownload}/>
        <button type="button" onClick={()=>recoveryPicker.current?.click()} disabled={!!busy}>
          <Archive size={16}/> RESTORE PREVIOUS DOWNLOAD
        </button>
        {draft&&<button type="button" className="offseason-studio-backup" onClick={downloadDraftBackup}>
          <Download size={16}/> DOWNLOAD DRAFT BACKUP
        </button>}
      </div>
      {!shown&&<div className="offseason-studio-empty">
        <Newspaper/><div><b>Two distinct stories, no overwritten game coverage.</b><p>Generate this special using the verified completed season. You'll be able to review the complete article, transcript, and episode map before publishing.</p></div>
      </div>}
      {shown&&<>
        <div className="offseason-studio-preview-status">
          <span>{draft?'UNSAVED EDITORIAL DRAFT':'PUBLISHED SPECIAL EDITION'}</span>
          <span>{shown.school} · SEASON {shown.season}</span>
        </div>
        <div className="offseason-studio-publications">
          <article>
            <button type="button" className="offseason-studio-article-head" onClick={()=>setExpanded(old=>({...old,article:!old.article}))}>
              <Newspaper/><span>NEWSROOM <b>{shown.article?.headline}</b></span><BookOpen size={17}/>
            </button>
            <p className="offseason-studio-dek">{shown.article?.dek}</p>
            {expanded.article&&<div className="offseason-studio-article-body">{(shown.article?.paragraphs||[]).map((p,i)=><p key={i}>{p}</p>)}</div>}
          </article>
          <article>
            <button type="button" className="offseason-studio-article-head" onClick={()=>setExpanded(old=>({...old,podcast:!old.podcast}))}>
              <Headphones/><span>THE HUDDLE <b>{shown.podcast?.title}</b></span><BookOpen size={17}/>
            </button>
            <p className="offseason-studio-dek">{shown.podcast?.summary}</p>
            {expanded.podcast&&<div className="offseason-studio-podcast-body">
              <h4>EPISODE CHAPTER MAP</h4>
              {(shown.podcast?.chapters||[]).map((c,i)=><p key={i}><strong>{i+1}. {c.title}</strong> — {c.summary}</p>)}
              <h4>FULL PODCAST TRANSCRIPT</h4>
              {(shown.podcast?.segments||[]).map((seg,i)=><p key={i}><strong>{seg.speaker}:</strong> {seg.text}</p>)}
            </div>}
            <div className="offseason-studio-downloads">
              <button type="button" onClick={downloadTranscript}><FileText size={16}/> DOWNLOAD TRANSCRIPT</button>
              <button type="button" onClick={downloadNotebook}><Download size={16}/> NOTEBOOKLM PRODUCER PACK</button>
            </div>
            <p className="offseason-studio-audio-note">The Huddle transcript is ready for NotebookLM audio generation. Master-audio upload for offseason specials is not yet connected; existing weekly audio stays untouched.</p>
          </article>
        </div>
        {draft&&<>
          {!showPublishConfirm?<button className="offseason-studio-publish" type="button"
            onClick={()=>setShowPublishConfirm(true)} disabled={!!busy}>
            <Archive size={17}/> REVIEW PUBLISH CONFIRMATION
          </button>:<div className="offseason-studio-publish-confirm">
            <Shield size={21}/>
            <div><b>{tab==='portal-entry'?'Publish the portal announcement and record that the portal is open?':'Publish the season retrospective?'}</b>
            <p>{tab==='portal-entry'
              ? 'This adds an independent article and podcast to Season 4, records portal exploration, and leaves Oregon as your current school. It does not select a destination, advance the year, or edit the Alabama game.'
              : 'This adds a separate Season 4 article and podcast. The semifinal result, game stats, existing Newsroom editions and audio remain unchanged.'} A recovery checkpoint is written first.</p>
            <div className="offseason-studio-confirm-actions">
              <button type="button" onClick={()=>setShowPublishConfirm(false)} disabled={!!busy}>CANCEL</button>
              <button type="button" onClick={publish} disabled={!!busy}>
                {busy==='publishing'?<Loader2 className="spin" size={15}/>:<Check size={15}/>}
                {busy==='publishing'?'SAVING…':'YES · PUBLISH SPECIAL'}
              </button>
            </div></div>
          </div>}
        </>}
      </>}
    </div>
  </section>;
}

export function OffseasonSpecialLinks({data,go,kind='newsroom'}){
  const season=Number(data.state?.currentSeason||data.season)||1;
  const saved=(data.state?.offseasonEditions||[]).filter(e=>Number(e.season)===season);
  if(!saved.length)return null;
  const isPodcast=kind==='podcast';
  const Icon=isPodcast?Headphones:Newspaper;
  return <section className="offseason-special-links">
    <div className="offseason-special-links-heading">
      <span><Sparkles size={16}/> OFFSEASON SPECIAL EDITIONS</span>
      <p>Separate from weekly game coverage · Season {season}</p>
    </div>
    <div className="offseason-special-links-grid">
      {saved.map(edition=><button key={edition.id} type="button" onClick={()=>{
        try{window.sessionStorage.setItem('dynastyhq-offseason-open-special',edition.type)}catch{}
        go('offseason');
      }}>
        <Icon size={20}/><span><small>{edition.type==='portal-entry'?'BREAKING NEWS · TRANSFER PORTAL':'SEASON IN REVIEW'}</small>
          <strong>{isPodcast?edition.podcast?.title:edition.article?.headline}</strong>
          <em>OPEN IN OFFSEASON COVERAGE STUDIO →</em>
        </span>
      </button>)}
    </div>
  </section>;
}
