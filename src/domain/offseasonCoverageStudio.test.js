import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  offseasonCoverageFacts, offseasonPublicationId,
  normalizeOffseasonDraft, upsertOffseasonEdition, offseasonNotebookSourcePack,
} from './offseasonCoverageStudio.js';
import {splitCareerStateForStorage,hydrateCareerStateFromArchives} from './careerStorage.js';

const career=()=>({
  currentSeason:4,currentWeek:19,
  player:{name:'Sample QB',college:'Oregon',school:'Oregon',overall:84},
  rtg:{rank:'QB1'},
  seasonSchedules:[{season:4,school:'Oregon',entries:[
    {week:17,label:'Bowl 1',opponent:'LSU',status:'completed',completed:true,
      postseasonRound:'first-round',result:'W',teamScore:44,opponentScore:10},
    {week:18,label:'Bowl 2',opponent:'BYU',status:'completed',completed:true,
      postseasonRound:'quarterfinal',bowlName:'Sugar Bowl',result:'W',teamScore:35,opponentScore:20},
    {week:19,label:'Bowl 3',opponent:'Alabama',status:'completed',completed:true,
      postseasonRound:'semifinal',bowlName:'Cotton Bowl',result:'L',teamScore:21,opponentScore:28},
  ]}],
  gameLogs:[
    {season:4,week:17,opponent:'LSU',result:'W',didPlay:true,passYds:240,passTD:2,rushYds:32,rushTD:1,int:0,
      teamScore:44,opponentScore:10,weekLabel:'CFP FIRST ROUND',postseason:{stage:'first-round'}},
    {season:4,week:18,opponent:'BYU',result:'W',didPlay:true,passYds:254,passTD:3,rushYds:55,rushTD:1,int:0,
      teamScore:35,opponentScore:20,weekLabel:'CFP QUARTERFINAL · SUGAR BOWL',
      postseason:{stage:'quarterfinal'}},
    {season:4,week:19,opponent:'Alabama',result:'L',didPlay:true,passYds:220,passTD:1,rushYds:27,rushTD:0,int:2,
      teamScore:21,opponentScore:28,weekLabel:'CFP SEMIFINAL · COTTON BOWL',
      postseason:{stage:'semifinal'}},
  ],
  newsroomIssues:[{id:'season-4-week-19',publicationId:'season-4-week-19',season:4,week:19,
    articles:[{headline:'Alabama defeats Oregon in semifinal'}]}],
  podcastEpisodes:[{id:'season-4-week-19',publicationId:'season-4-week-19',season:4,week:19,
    title:'Alabama Week 19 Postgame',segments:[{hostId:'mark',text:'Postgame recap'}],audioStatus:'ready'}],
  playerRecruiting:{transfer:{status:'inactive',targets:[],decisions:[]}},
  trophies:[],careerMilestones:[],weeklyUpdates:[],factLedger:[],
});
const makeGenerated=()=>{
  const paragraph='Oregon completed a difficult postseason stretch, and the verified results show both the winning moments and the decisive semifinal loss against Alabama. The season record stands on the reported games rather than speculation about what might happen next.';
  const scriptTurn='Looking at the full record, the production and the semifinal exit together changes how this season is remembered. The result against Alabama ended the playoff run, but the verified earlier results against LSU and BYU remain part of the story.';
  return {
    article:{headline:'Oregon Season 4 Ends in Cotton Bowl Semifinal',dek:'A playoff run concludes one victory short of the title game.',paragraphs:Array(6).fill(paragraph)},
    podcast:{title:'The Huddle: Season 4 Retrospective',summary:'A conversation about the playoff run and the final setback.',
      chapters:Array.from({length:5},(_,i)=>({title:'Chapter '+(i+1),summary:'Verified football discussion'})),
      segments:Array.from({length:14},(_,i)=>({speaker:i%2===0?'Mark Thompson':'Sarah Chen',text:scriptTurn}))},
  };
};

test('season review is based on finished season and preserves the 21–28 Alabama loss',()=>{
 const state=career();
 const f=offseasonCoverageFacts(state,'season-review');
 assert.equal(f.publicationId,'offseason-season-4-season-review');
 assert.equal(f.latestGame.opponent,'Alabama');
 assert.deepEqual(f.latestGame.score,{team:21,opponent:28});
 assert.equal(f.latestGame.outcome,'loss');
 assert.equal(f.completedGames.length,3);
 assert.equal(f.playerTotals.passingYards,714);
 assert.equal(f.portal,null);
});

test('portal coverage requires confirmed in-game event and cannot name a future school',()=>{
 const state=career();
 assert.throws(()=>offseasonCoverageFacts(state,'portal-entry'),/confirm.*transfer portal/i);
 const f=offseasonCoverageFacts(state,'portal-entry',{portalConfirmed:true});
 assert.equal(f.publicationId,'offseason-season-4-portal-entry');
 assert.equal(f.portal.entered,true);
 assert.equal(f.portal.destinationConfirmed,false);
 assert.equal(f.portal.destination,'');
 assert.deepEqual(f.portal.offers,[]);
 assert.match(f.portal.eligibility,/one season remaining/);
});

test('each offseason editorial piece has its own stable ID and does not mutate old media',()=>{
 const state=career();
 const first=normalizeOffseasonDraft(makeGenerated(),offseasonCoverageFacts(state,'season-review'),'gemini');
 const portal=normalizeOffseasonDraft(makeGenerated(),offseasonCoverageFacts(state,'portal-entry',{portalConfirmed:true}),'gemini');
 const saved=upsertOffseasonEdition(upsertOffseasonEdition(state,first),portal);
 assert.equal(saved.offseasonEditions.length,2);
 assert.notEqual(saved.offseasonEditions[0].id,saved.offseasonEditions[1].id);
 assert.deepEqual(saved.gameLogs,state.gameLogs);
 assert.deepEqual(saved.newsroomIssues,state.newsroomIssues);
 assert.deepEqual(saved.podcastEpisodes,state.podcastEpisodes);
 assert.equal(saved.player.college,'Oregon');
 assert.equal(saved.currentSeason,4);
 assert.equal(saved.currentWeek,19);
 assert.equal(saved.playerRecruiting.transfer.status,'inactive');
 const {mainState,archives}=splitCareerStateForStorage(saved);
 const roundTrip=hydrateCareerStateFromArchives(mainState,archives);
 assert.equal(roundTrip.offseasonEditions.length,2);
 assert.equal(roundTrip.gameLogs.length,3);
});

test('NotebookLM pack includes a real transcript and verified source facts',()=>{
 const state=career();
 const edition=normalizeOffseasonDraft(makeGenerated(),offseasonCoverageFacts(state,'season-review'),'gemini');
 const pack=offseasonNotebookSourcePack(edition);
 assert.match(pack,/## VERIFIED FACTS — PRIMARY AUTHORITY/);
 assert.match(pack,/"opponent": "Alabama"/);
 assert.match(pack,/## OPTIONAL EPISODE CHAPTER MAP/);
 assert.match(pack,/## STYLE REFERENCE — DYNASTYHQ GENERATED TRANSCRIPT/);
 assert.match(pack,/Mark Thompson:/);
 assert.match(pack,/Sarah Chen:/);
 assert.match(pack,/no.*invent.*offers/i);
});

test('portal event blocks invented commitment in AI output',()=>{
 const facts=offseasonCoverageFacts(career(),'portal-entry',{portalConfirmed:true});
 const g=makeGenerated();
 g.article.headline='QB has committed to Texas';
 assert.throws(()=>normalizeOffseasonDraft(g,facts,'gemini'),/commitment.*not confirmed/i);
});

test('offseason UI uses separate preview, confirm, transaction, checkpoint and portal recording',async()=>{
 const [app,studio,api]=await Promise.all([
  readFile(new URL('../option-a-preview/PreviewApp.jsx',import.meta.url),'utf8'),
  readFile(new URL('../option-a-preview/OffseasonCoverageStudio.jsx',import.meta.url),'utf8'),
  readFile(new URL('../../api/generate-offseason-coverage.js',import.meta.url),'utf8'),
 ]);
 assert.match(app,/<OffseasonCoverageStudio data=\{data\} notify=\{notify\}\/>/);
 assert.match(app,/OffseasonSpecialLinks data=\{data\} go=\{go\} kind="newsroom"/);
 assert.match(app,/OffseasonSpecialLinks data=\{data\} go=\{go\} kind="podcast"/);
 assert.match(studio,/setDrafts\(old=>/);
 assert.match(studio,/REVIEW PUBLISH CONFIRMATION/);
 assert.match(studio,/YES · PUBLISH SPECIAL/);
 assert.match(studio,/readHydratedCareerInTransaction\(/);
 assert.match(studio,/writeHydratedCareerInTransaction\(/);
 assert.match(studio,/detectDestructiveCareerRegression/);
 assert.match(studio,/upsertOffseasonEdition\(remote,publishedDraft\)/);
 assert.match(studio,/openTransferRecruiting\(next\)/);
 assert.match(studio,/offseason-before-/);
 assert.match(studio,/NOTEBOOKLM PRODUCER PACK/);
 assert.match(api,/allowPaidFallback:false/);
});

test('neutral-site semifinal score uses the saved loss rather than assuming Oregon is the scoreboard home team',()=>{
  const state=career();
  const semifinal=state.gameLogs.find(game=>game.week===19);
  delete semifinal.teamScore;
  delete semifinal.opponentScore;
  semifinal.homeAway='neutral';
  semifinal.homeScore=28;
  semifinal.awayScore=21;
  const facts=offseasonCoverageFacts(state,'season-review');
  assert.deepEqual(facts.latestGame.score,{team:21,opponent:28});
  assert.equal(facts.latestGame.outcome,'loss');
});
