import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildNotebookLmProducerPack,
  latestNotebookGameSelection,
} from './notebookLmProducerPack.js';

const state={
  currentSeason:4,
  currentWeek:13,
  gameLogs:[
    {
      season:4,week:11,opponent:'Iowa',result:'W',homeAway:'home',
      homeScore:31,awayScore:20,passYds:245,passTD:2,rushYds:36,rushTD:0,int:1,
    },
    {
      season:4,week:12,opponent:'Wisconsin',result:'W',homeAway:'away',
      homeScore:24,awayScore:34,passYds:287,passTD:3,rushYds:51,rushTD:1,int:1,
    },
  ],
};

const data={
  state,
  season:4,
  player:{name:'Bryan Wessel',school:'Oregon',pos:'QB'},
  game:{
    raw:state.gameLogs[1],
    week:12,opponent:'Wisconsin',result:'W',us:34,them:24,
    pass:287,passTD:3,rush:51,rushTD:1,total:338,td:4,interceptions:1,
    team:{
      totalYards:482,opponentTotalYards:351,firstDowns:24,opponentFirstDowns:18,
      turnovers:1,opponentTurnovers:2,rushYards:195,opponentRushYards:121,
      passYards:287,opponentPassYards:230,
    },
  },
};

const episode={
  title:'Oregon Week 12: Wisconsin and the stretch run',
  summary:'Oregon beat Wisconsin and Wessel looked more confident than ever.',
  transcript:'Mark Thompson: Oregon handled Wisconsin in Week 12.\n\nSarah Chen: The balance stood out.',
  chapters:[{title:'Opening Drive',summary:'Why Oregon won.'}],
  episode:{
    storylineThreads:[
      {label:'ROLE PROMOTION'},
      {label:'IMPACT PERFORMANCE'},
      {label:'WINNING STREAK'},
      {label:'Stretch-run momentum',summary:'Oregon has kept stacking verified wins as the season enters the stretch run.'},
      {label:'Coach Trust climbed again and should be discussed'},
    ],
  },
};

const facts=[
  {key:'game.passYds',label:'Passing yards',value:287,verified:true},
  {key:'rtg.coachTrust',label:'Coach Trust',value:9999,verified:true},

  {key:'program.coverage.scoring.1',label:'Oregon · Marco Ortiz · 22-yard touchdown reception · 8:15 1st Quarter',value:'22-yard TD pass from Bryan Wessel',verified:true},
  {key:'program.coverage.scoring.1-summary',label:'ORE · M.Ortiz · receiving touchdowns',value:1,verified:true},
  {key:'program.coverage.scoring.2',label:'WIS · John Gruttadauria · 31 Yd FG · 2:46 2nd Quarter',value:'31-yard field goal',verified:true},
  {key:'program.coverage.scoring.2-summary',label:'WIS · John Gruttadauria · Field Goal',value:'31 Yd',verified:true},

  {key:'program.coverage.passing.ore.comp',label:'ORE · B.Wessel · Completions',value:26,verified:true},
  {key:'program.coverage.passing.ore.att',label:'ORE · B.Wessel · Attempts',value:34,verified:true},
  {key:'program.coverage.passing.ore.avg',label:'ORE · B.Wessel · AVG',value:9.8,verified:true},
  {key:'program.coverage.passing.ore.rating',label:'ORE · B.Wessel · RTG',value:181.4,verified:true},
  {key:'program.coverage.passing.ore.long',label:'ORE · B.Wessel · Longest Completion',value:42,verified:true},
  {key:'program.coverage.passing.wisc.comp',label:'WISC · H.Hendrix · Completions',value:20,verified:true},
  {key:'program.coverage.passing.wisc.att',label:'WISC · H.Hendrix · Attempts',value:38,verified:true},
  {key:'program.coverage.passing.wisc.int',label:'WISC · H.Hendrix · Interceptions',value:2,verified:true},
  {key:'program.coverage.passing.wisc.avg',label:'WISC · H.Hendrix · AVG',value:5.1,verified:true},
  {key:'program.coverage.passing.wisc.rating',label:'WISC · H.Hendrix · RTG',value:93.4,verified:true},

  {key:'program.coverage.player.1',label:'ORE · Marco Ortiz · Receptions',value:6,verified:true},
  {key:'program.coverage.player.2',label:'ORE · Marco Ortiz · Receiving yards',value:101,verified:true},
  {key:'program.coverage.receiving.2-average',label:'ORE · Marco Ortiz · AVG',value:16.8,verified:true},
  {key:'program.coverage.player.2-rac',label:'ORE · Marco Ortiz · RAC yards',value:22,verified:true},
  {key:'program.coverage.player.2-drops',label:'ORE · Marco Ortiz · Drops',value:0,verified:true},

  {key:'program.coverage.defense.1',label:'ORE · K.Hicks · Total Tackles',value:8,verified:true},
  {key:'program.coverage.defense.2',label:'ORE · K.Hicks · Solo Tackles',value:6,verified:true},
  {key:'program.coverage.defense.3',label:'ORE · K.Hicks · Assisted Tackles',value:2,verified:true},
  {key:'program.coverage.defense.4',label:'ORE · K.Hicks · Tackles For Loss',value:1,verified:true},
  {key:'program.coverage.defense.5',label:'ORE · K.Hicks · Sacks',value:0,verified:true},
  {key:'program.coverage.defense.6',label:'ORE · K.Hicks · Interceptions',value:1,verified:true},
  {key:'program.coverage.defense.7',label:'ORE · K.Hicks · Interception Return Yards',value:42,verified:true},
  {key:'program.coverage.defense.8',label:'ORE · K.Hicks · Pass Deflections',value:2,verified:true},
  {key:'program.coverage.defense.9',label:'ORE · K.Hicks · Forced Fumbles',value:1,verified:true},
  {key:'program.coverage.defense.10',label:'ORE · K.Hicks · Fumble Recoveries',value:0,verified:true},
  {key:'program.coverage.defense.11',label:'WISC · D.Jones · Total Tackles',value:9,verified:true},
  {key:'program.coverage.defense.12',label:'WISC · D.Jones · Tackles For Loss',value:2,verified:true},
  {key:'program.coverage.defense.13',label:'WISC · D.Jones · Sacks',value:1,verified:true},
  {key:'program.coverage.rushing.ore.att',label:'ORE · B.Smith · ATT',value:18,verified:true},
  {key:'program.coverage.rushing.ore.yds',label:'ORE · B.Smith · Rushing yards',value:125,verified:true},
  {key:'program.coverage.rushing.ore.avg',label:'ORE · B.Smith · AVG',value:6.9,verified:true},
  {key:'program.coverage.rushing.ore.btk',label:'ORE · B.Smith · BTK',value:4,verified:true},
  {key:'program.coverage.rushing.ore.fum',label:'ORE · B.Smith · FUM',value:0,verified:true},
  {key:'program.coverage.rushing.ore.yac',label:'ORE · B.Smith · YAC',value:47,verified:true},
  {key:'program.coverage.rushing.ore.twenty',label:'ORE · B.Smith · 20+ YDS',value:2,verified:true},
  {key:'program.coverage.defense.14',label:'WISC · D.Jones · Pass Deflections',value:1,verified:true},
];

test('latest NotebookLM game selection resolves the most recent completed uploaded game',()=>{
  assert.deepEqual(latestNotebookGameSelection(state),{season:4,week:12,opponent:'Wisconsin'});
});

test('Producer Pack 2.0 preserves all screenshot stats, organizes defense, enriches QBs, and keeps RTG mechanics out',()=>{
  const pack=buildNotebookLmProducerPack({data,episode,facts});
  assert.match(pack.text,/NOTEBOOKLM PRODUCER PACK 2\.0/);
  assert.match(pack.text,/Week: 12/);
  assert.match(pack.text,/Opponent: Wisconsin/);
  assert.match(pack.text,/KEY STORYLINES/);
  assert.match(pack.text,/TEAM STATISTICAL COMPARISON/);
  assert.match(pack.text,/SCORING TIMELINE \/ DRIVE DETAILS/);
  assert.equal((pack.text.match(/31 Yd FG/g)||[]).length,1);

  assert.match(pack.text,/COMPLETE VERIFIED SCREENSHOT STAT TABLES/);
  assert.match(pack.text,/### PASSING/);
  assert.match(pack.text,/ORE · B\.Wessel — Completions: 26 · Attempts: 34 · Completion %: 76\.5% · AVG \(yards\/attempt\): 9\.8 · RTG \(Passer Rating\): 181\.4 · Longest Completion: 42/);
  assert.match(pack.text,/WISC · H\.Hendrix — Completions: 20 · Attempts: 38 · Completion %: 52\.6% · Interceptions: 2 · AVG \(yards\/attempt\): 5\.1 · RTG \(Passer Rating\): 93\.4/);

  assert.match(pack.text,/### RUSHING/);
  assert.match(pack.text,/ORE · B\.Smith — ATT \(Carries\): 18 · Rushing yards: 125 · AVG \(yards\/carry\): 6\.9 · BTK \(Broken tackles\): 4 · FUM \(Fumbles\): 0 · YAC: 47 · 20\+ YDS: 2/);

  assert.match(pack.text,/### RECEIVING/);
  assert.match(pack.text,/ORE · Marco Ortiz — Receptions: 6 · Receiving yards: 101 · AVG \(yards\/catch\): 16\.8 · RAC yards: 22 · Drops: 0/);

  assert.match(pack.text,/### DEFENSE/);
  assert.match(pack.text,/ORE · K\.Hicks — Total Tackles: 8 · Solo Tackles: 6 · Assisted Tackles: 2 · TFL: 1 · Sacks: 0 · Interceptions: 1/);
  assert.match(pack.text,/ORE · K\.Hicks — .*Interception Return Yards: 42.*Pass Deflections: 2.*Forced Fumbles: 1.*Fumble Recoveries: 0/);
  assert.match(pack.text,/WISC · D\.Jones — Total Tackles: 9 · TFL: 2 · Sacks: 1 · Pass Deflections: 1/);

  assert.match(pack.text,/WINNING STREAK — Oregon has won 2 straight completed games/);
  assert.doesNotMatch(pack.text,/CONTINUING STORYLINE — ROLE PROMOTION/);
  assert.doesNotMatch(pack.text,/CONTINUING STORYLINE — IMPACT PERFORMANCE/);
  assert.doesNotMatch(pack.text,/Editorial brief: .*more confident than ever/);
  assert.match(pack.text,/generated editorial copy, not a verified fact source/i);

  assert.match(pack.text,/OPENING REQUIREMENT:/);
  assert.match(pack.text,/Welcome to another episode of The Huddle Podcast/);
  assert.doesNotMatch(pack.text,/RECOMMENDED NOTEBOOKLM CUSTOMIZE PROMPT/);
  assert.match(pack.customizePrompt,/Brief Deep Dive/);
  assert.match(pack.customizePrompt,/4–5 minutes/);
  assert.match(pack.customizePrompt,/Welcome to another episode of The Huddle Podcast/);
  assert.match(pack.customizePrompt,/completion percentage and passer rating/i);
  assert.match(pack.customizePrompt,/style reference only/);

  assert.match(pack.text,/PREVIOUS-GAME COMPARISON/);
  assert.match(pack.text,/Previous opponent: Iowa/);
  assert.match(pack.text,/RECENT SEASON CONTEXT/);
  assert.match(pack.text,/DYNASTYHQ GENERATED TRANSCRIPT — COMPLETE/);
  assert.match(pack.text,/Mark Thompson: Oregon handled Wisconsin/);

  assert.doesNotMatch(pack.text,/9999/);
  assert.doesNotMatch(pack.text,/Coach Trust climbed/);
  assert.equal(pack.meta.week,12);
  assert.equal(pack.meta.opponent,'Wisconsin');
  assert.ok(pack.meta.screenshotStatCount>=20);
  assert.equal(pack.meta.suggestedFileName,'DynastyHQ-S4-W12-Wisconsin-NotebookLM-Producer-Pack.txt');
});
