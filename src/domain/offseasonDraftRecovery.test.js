import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {offseasonCoverageFacts,normalizeOffseasonDraft,offseasonNotebookSourcePack} from './offseasonCoverageStudio.js';
import {
  offseasonDraftStorageKey,loadOffseasonDraftBackup,saveOffseasonDraftBackup,
  clearOffseasonDraftBackup,restoreOffseasonDraftFromDownload,
} from './offseasonDraftRecovery.js';

const career=()=>({
  currentSeason:4,currentWeek:19,
  player:{name:'Test QB',college:'Oregon'},
  seasonSchedules:[{season:4,school:'Oregon',entries:[
    {week:18,opponent:'BYU',completed:true,status:'completed',postseasonRound:'quarterfinal',bowlName:'Sugar Bowl'},
    {week:19,opponent:'Alabama',completed:true,status:'completed',postseasonRound:'semifinal',bowlName:'Cotton Bowl'},
  ]}],
  gameLogs:[
    {season:4,week:18,opponent:'BYU',result:'W',didPlay:true,teamScore:35,opponentScore:20,passYds:254,passTD:3,rushYds:55,rushTD:1,int:0,weekLabel:'CFP QUARTERFINAL · SUGAR BOWL'},
    {season:4,week:19,opponent:'Alabama',result:'L',didPlay:true,teamScore:33,opponentScore:48,passYds:296,passTD:2,rushYds:38,rushTD:1,int:1,weekLabel:'CFP SEMIFINAL · COTTON BOWL'},
  ],playerRecruiting:{transfer:{status:'inactive',targets:[],decisions:[]}},
  trophies:[],careerMilestones:[],weeklyUpdates:[],factLedger:[],
});
const makeGenerated=(type='season-review')=>{
  const para='The verified result at the Cotton Bowl semifinal completed a meaningful Oregon football season. It followed the win against BYU in the Sugar Bowl and marked the end of the playoff run, without inventing unrecorded performances or future opponents.';
  const segment='The result against Alabama ended the Ducks postseason, but the earlier victory against BYU still matters for assessing the whole year. We should consider the quarterback production and look at what the saved record actually supports.';
  return {
    article:{
      headline:type==='portal-entry'?'Oregon QB Enters Transfer Portal':'Oregon Season Ends After Semifinal Run',
      dek:'The verified season results and postseason path put the next chapter in perspective.',
      paragraphs:Array(6).fill(para),
    },
    podcast:{
      title:type==='portal-entry'?'The Huddle: Portal Announcement':'The Huddle: Season 4 Review',
      summary:'The two hosts unpack the verified season ending.',
      chapters:Array.from({length:5},(_,i)=>({title:'Chapter '+(i+1),summary:'Verified season results and perspective'})),
      segments:Array.from({length:14},(_,i)=>({speaker:i%2?'Sarah Chen':'Mark Thompson',text:segment})),
    },
  };
};
const storage=()=>{
  const map=new Map();
  return {
    getItem:(k)=>map.get(k)??null,
    setItem:(k,v)=>map.set(k,v),
    removeItem:(k)=>map.delete(k),
  };
};

test('generated draft survives refresh through owner-scoped browser backup and clears after publishing',()=>{
  const s=storage();
  const facts=offseasonCoverageFacts(career(),'season-review');
  const draft=normalizeOffseasonDraft(makeGenerated(),facts,'gemini');
  saveOffseasonDraftBackup(s,'user-123',draft);
  assert.deepEqual(loadOffseasonDraftBackup(s,'user-123',4,'season-review'),draft);
  assert.equal(loadOffseasonDraftBackup(s,'user-456',4,'season-review'),null);
  assert.equal(loadOffseasonDraftBackup(s,'user-123',5,'season-review'),null);
  assert.equal(loadOffseasonDraftBackup(s,'user-123',4,'portal-entry'),null);
  clearOffseasonDraftBackup(s,'user-123',4,'season-review');
  assert.equal(loadOffseasonDraftBackup(s,'user-123',4,'season-review'),null);
  assert.equal(offseasonDraftStorageKey('',4,'season-review'),'');
});

test('original raw-JSON NotebookLM download restores full draft without new generation',()=>{
  const facts=offseasonCoverageFacts(career(),'season-review');
  const draft=normalizeOffseasonDraft(makeGenerated(),facts,'gemini');
  const pack= [
    '# DYNASTYHQ — OFFSEASON SPECIAL | THE HUDDLE',
    "# DynastyHQ Huddle: Oregon's Season in Review",
    'Season 4 · Oregon · End of Season',
    '',
    '## VERIFIED FACTS — PRIMARY AUTHORITY',
    JSON.stringify(facts,null,2),
    '',
    '## OPTIONAL EPISODE CHAPTER MAP',
    ...draft.podcast.chapters.map((c,i)=>(i+1)+'. '+c.title+' — '+c.summary),
    '',
    '## STYLE REFERENCE — DYNASTYHQ GENERATED TRANSCRIPT',
    'This is a generated editorial style reference.',
    ...draft.podcast.segments.map(s=>s.speaker+': '+s.text),
    '',
    '## EDITORIAL ARTICLE — SECONDARY STYLE REFERENCE',
    draft.article.headline,draft.article.dek,...draft.article.paragraphs,
    '',
    '## SOURCE RULES',
    'Treat verified facts above as authoritative.',
  ].join('\n');
  const recovered=restoreOffseasonDraftFromDownload(pack,facts);
  assert.equal(recovered.id,draft.id);
  assert.deepEqual(recovered.article.paragraphs,draft.article.paragraphs);
  assert.deepEqual(recovered.podcast.segments,draft.podcast.segments);
  assert.deepEqual(recovered.podcast.chapters,draft.podcast.chapters);
  assert.equal(recovered.podcast.title,"DynastyHQ Huddle: Oregon's Season in Review");
  assert.deepEqual(recovered.facts.completedGames,facts.completedGames);
});

test('new readable NotebookLM download restores original article, hosts and map',()=>{
  const facts=offseasonCoverageFacts(career(),'season-review');
  const draft=normalizeOffseasonDraft(makeGenerated(),facts,'gemini');
  const recovered=restoreOffseasonDraftFromDownload(offseasonNotebookSourcePack(draft),facts);
  assert.equal(recovered.article.headline,draft.article.headline);
  assert.deepEqual(recovered.article.paragraphs,draft.article.paragraphs);
  assert.deepEqual(recovered.podcast.segments,draft.podcast.segments);
  assert.deepEqual(recovered.podcast.chapters,draft.podcast.chapters);
});

test('portal downloads only restore into correct edition and season',()=>{
  const facts=offseasonCoverageFacts(career(),'portal-entry',{portalConfirmed:true});
  const draft=normalizeOffseasonDraft(makeGenerated('portal-entry'),facts,'gemini');
  const pack=offseasonNotebookSourcePack(draft);
  assert.deepEqual(restoreOffseasonDraftFromDownload(pack,facts).podcast.segments,draft.podcast.segments);
  const seasonFacts=offseasonCoverageFacts(career(),'season-review');
  assert.throws(()=>restoreOffseasonDraftFromDownload(pack,seasonFacts),/other offseason edition/i);
  const future={...facts,season:5,publicationId:'offseason-season-5-portal-entry'};
  assert.throws(()=>restoreOffseasonDraftFromDownload(pack,future),/different season/i);
});

test('downloaded recovery backup contains full saved original editorial',()=>{
  const facts=offseasonCoverageFacts(career(),'season-review');
  const draft=normalizeOffseasonDraft(makeGenerated(),facts,'gemini');
  const recovered=restoreOffseasonDraftFromDownload(JSON.stringify(draft),facts);
  assert.deepEqual(recovered.article,draft.article);
  assert.deepEqual(recovered.podcast,draft.podcast);
  assert.throws(()=>restoreOffseasonDraftFromDownload(JSON.stringify(draft),{
    ...facts,type:'portal-entry',publicationId:'offseason-season-4-portal-entry',
  }),/does not match the selected season and offseason story/i);
});

test('Offseason Studio persists drafts and offers download restoration',async()=>{
 const app=await readFile(new URL('../option-a-preview/OffseasonCoverageStudio.jsx',import.meta.url),'utf8');
 assert.match(app,/loadOffseasonDraftBackup\(draftBrowserStore\(\),ownerUid,season,type\)/);
 assert.match(app,/saveOffseasonDraftBackup\(draftBrowserStore\(\),user\.uid,generated\)/);
 assert.match(app,/clearOffseasonDraftBackup\(draftBrowserStore\(\),user\.uid,season,eventType\)/);
 assert.match(app,/restoreOffseasonDraftFromDownload\(source,facts\)/);
 assert.match(app,/RESTORE PREVIOUS DOWNLOAD/);
 assert.match(app,/DOWNLOAD DRAFT BACKUP/);
 assert.match(app,/NOTEBOOKLM PRODUCER PACK/);
});
