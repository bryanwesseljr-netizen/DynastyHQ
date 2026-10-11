import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {seasonEndArchiveContext,SEASON_END_WEEK_LABEL} from './seasonEndArchiveContext.js';

const savedCareer=()=>({
  currentSeason:4,currentWeek:20,
  player:{name:'Bryan Wessel',college:'Oregon',school:'Oregon'},
  rtg:{},
  gameLogs:[
    {season:4,week:17,opponent:'LSU',result:'W',didPlay:true,
      teamScore:44,opponentScore:10,weekLabel:'CFP FIRST ROUND'},
    {season:4,week:18,opponent:'BYU',result:'W',didPlay:true,
      teamScore:35,opponentScore:20,weekLabel:'CFP QUARTERFINAL · SUGAR BOWL'},
    {season:4,week:19,opponent:'Alabama',result:'L',didPlay:true,
      teamScore:33,opponentScore:48,weekLabel:'CFP SEMIFINAL · COTTON BOWL',
      postseason:{stage:'semifinal',bowlName:'Cotton Bowl'}},
  ],
  seasonSchedules:[{season:4,school:'Oregon',entries:[
    {week:17,opponent:'LSU',label:'Bowl 1',postseasonRound:'first-round',completed:true},
    {week:18,opponent:'BYU',label:'Bowl 2',postseasonRound:'quarterfinal',bowlName:'Sugar Bowl',completed:true},
    {week:19,opponent:'Alabama',label:'Bowl 3',postseasonRound:'semifinal',bowlName:'Cotton Bowl',completed:true},
  ]}],
  currentWeekSetup:{
    label:'CFP SEMIFINAL · COTTON BOWL',opponent:'Alabama',
    isBye:false,
  },
  newsroomIssues:[],podcastEpisodes:[],careerChronicle:[],
});

test('W20 after the verified Alabama semifinal loss is an offseason archive slot, not a second Cotton Bowl',()=>{
  const career=savedCareer();
  const end=seasonEndArchiveContext(career,4,20);
  assert.equal(end.isSeasonEnd,true);
  assert.equal(end.label,SEASON_END_WEEK_LABEL);
  assert.equal(end.lastGameWeek,19);
  assert.equal(end.lastOpponent,'Alabama');
  assert.equal(seasonEndArchiveContext(career,4,19).isSeasonEnd,false);
  assert.equal(career.gameLogs.find(x=>x.week===19).opponent,'Alabama');
  assert.equal(career.gameLogs.find(x=>x.week===19).opponentScore,48);
});

test('copied W19 Cotton Bowl schedule row at W20 remains read-only offseason context',()=>{
  const career=savedCareer();
  career.seasonSchedules[0].entries.push({
    week:20,opponent:'Alabama',label:'Bowl 3',
    postseasonRound:'semifinal',bowlName:'Cotton Bowl',
    status:'upcoming',completed:false,
  });
  assert.equal(seasonEndArchiveContext(career,4,20).isSeasonEnd,true);
  assert.equal(seasonEndArchiveContext(career,4,20).label,SEASON_END_WEEK_LABEL);
});

test('a genuinely different confirmed W20 opponent is not hidden by offseason detection',()=>{
  const career=savedCareer();
  career.seasonSchedules[0].entries.push({
    week:20,opponent:'Notre Dame',label:'Bowl 4',
    postseasonRound:'championship',status:'upcoming',
  });
  assert.equal(seasonEndArchiveContext(career,4,20).isSeasonEnd,false);
  assert.equal(career.seasonSchedules[0].entries.at(-1).opponent,'Notre Dame');
});

test('an actual W20 recorded game takes priority over the offseason placeholder',()=>{
  const career=savedCareer();
  career.gameLogs.push({
    season:4,week:20,opponent:'Texas',result:'W',
    teamScore:24,opponentScore:21,didPlay:true,weekLabel:'CFP NATIONAL CHAMPIONSHIP',
  });
  assert.equal(seasonEndArchiveContext(career,4,20).isSeasonEnd,false);
});

test('W19 Cotton Bowl is not suppressed before an archived semifinal result exists',()=>{
  const career=savedCareer();
  career.gameLogs=career.gameLogs.filter(x=>x.week!==19);
  assert.equal(seasonEndArchiveContext(career,4,20).isSeasonEnd,false);
});

test('end-of-season rendering replaces pregame processing in mobile Home, Game Hub and top ribbon',async()=>{
  const source=await readFile(new URL('../option-a-preview/PreviewApp.jsx',import.meta.url),'utf8');
  const adapter=await readFile(new URL('../option-a-preview/useReadOnlyLiveCareer.js',import.meta.url),'utf8');
  const css=await readFile(new URL('../option-a-preview/preview.css',import.meta.url),'utf8');
  assert.match(adapter,/const endOfSeason=seasonEndArchiveContext\(state,season,week\)/);
  assert.match(adapter,/isSeasonEnd:endOfSeason\.isSeasonEnd/);
  assert.match(adapter,/endOfSeason\.isSeasonEnd\s*\? endOfSeason\.label/);
  assert.match(source,/seasonEndArchiveContext\(state,season,week\)/);
  assert.match(source,/if\(data\.selection\?\.isSeasonEnd\) return <SeasonEndArchiveLanding/);
  assert.match(source,/if\(data\.selection\?\.isSeasonEnd\) return <div className="score-ribbon offseason-ribbon"/);
  assert.match(source,/SEASON \{data\.season\} IS COMPLETE/);
  assert.match(source,/OPEN OFFSEASON COVERAGE STUDIO/);
  assert.match(source,/VIEW CAREER CHRONICLE/);
  assert.match(css,/\.score-ribbon\.offseason-ribbon/);
  assert.match(css,/@media\(max-width:700px\)/);
});

test('a mistakenly duplicated Week 20 game log cannot turn the offseason into a second Cotton Bowl',()=>{
  const career=savedCareer();
  career.gameLogs.push({
    ...career.gameLogs.at(-1),
    week:20,
    publicationId:'season-4-week-20',
  });
  career.seasonSchedules[0].entries.push({
    week:20,opponent:'Alabama',label:'Bowl 3',
    postseasonRound:'semifinal',bowlName:'Cotton Bowl',
    status:'completed',completed:true,
  });
  const end=seasonEndArchiveContext(career,4,20);
  assert.equal(end.isSeasonEnd,true);
  assert.equal(end.label,SEASON_END_WEEK_LABEL);
  assert.equal(end.lastGameWeek,19);
  assert.equal(end.lastOpponent,'Alabama');
  // View classification must never rewrite or delete either underlying log.
  assert.equal(career.gameLogs.length,4);
  assert.equal(career.seasonSchedules[0].entries.length,4);
});

test('a copied Week 20 published semifinal with an uncompleted schedule row is still offseason',()=>{
  const career=savedCareer();
  career.gameLogs.push({...career.gameLogs.at(-1),week:20,weekLabel:'CFP SEMIFINAL · COTTON BOWL'});
  career.seasonSchedules[0].entries.push({
    week:20,opponent:'Alabama',postseasonRound:'semifinal',bowlName:'Cotton Bowl',
    completed:false,status:'upcoming',
  });
  assert.equal(seasonEndArchiveContext(career,4,20).isSeasonEnd,true);
  assert.equal(seasonEndArchiveContext(career,4,19).isSeasonEnd,false);
});

test('a later verified different semifinal opponent remains visible, not silently relabeled',()=>{
  const career=savedCareer();
  career.gameLogs.push({
    season:4,week:20,opponent:'Texas',result:'L',
    teamScore:17,opponentScore:24,didPlay:true,
    weekLabel:'CFP NATIONAL CHAMPIONSHIP',
  });
  career.seasonSchedules[0].entries.push({
    week:20,opponent:'Texas',label:'Bowl 4',postseasonRound:'championship',completed:true,
  });
  assert.equal(seasonEndArchiveContext(career,4,20).isSeasonEnd,false);
});

test('a copied game label is not promoted to a new game even when Week 20 was advanced',()=>{
  const career=savedCareer();
  career.currentWeek=20;
  career.currentWeekSetup={
    label:'CFP SEMIFINAL · COTTON BOWL',
    opponent:'Alabama',
    postseasonRound:'semifinal',
    bowlName:'Cotton Bowl',
  };
  assert.equal(seasonEndArchiveContext(career,4,20).label,'SEASON COMPLETE · OFFSEASON');
  assert.equal(seasonEndArchiveContext(career,4,19).isSeasonEnd,false);
});
