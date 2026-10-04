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
      season:4,week:11,opponent:'Maryland',result:'W',
      teamScore:44,opponentScore:41,passYds:250,passTD:2,rushYds:30,rushTD:0,int:0,
    },
    {
      season:4,week:12,opponent:'Wisconsin',result:'W',
      teamScore:59,opponentScore:17,passYds:334,passTD:5,rushYds:51,rushTD:0,int:1,
    },
  ],
};

const data={
  state,
  season:4,
  player:{name:'Bryan Wessel',school:'Oregon',pos:'QB'},
  game:{
    raw:state.gameLogs[1],
    week:12,opponent:'Wisconsin',result:'W',us:59,them:17,
    pass:334,passTD:5,rush:51,rushTD:0,total:385,td:5,interceptions:1,
    team:{
      totalYards:602,opponentTotalYards:223,firstDowns:31,opponentFirstDowns:11,
      turnovers:1,opponentTurnovers:2,rushYards:268,opponentRushYards:30,
      passYards:334,opponentPassYards:193,
    },
  },
};

const episode={
  title:'Oregon Week 12: The Wessel Masterclass',
  summary:'Oregon beat Wisconsin.',
  transcript:'Mark Thompson: Oregon handled Wisconsin in Week 12.\n\nSarah Chen: The balance stood out.',
  chapters:[{title:'Opening Drive',summary:'Why Oregon won.'}],
  episode:{storylineThreads:[{label:'WINNING STREAK'}]},
};

const facts=[
  {key:'rtg.coachTrust',label:'Coach Trust',value:9999,verified:true},
  {
    key:'program.coverage.scoring.1',
    label:'ORE · Marco Ortiz · 10 Yd pass from Bryan Wessel · 1:53 1st Quarter',
    value:'Touchdown',
    verified:true,
  },
];

test('latest NotebookLM game selection resolves the most recent completed uploaded game',()=>{
  assert.deepEqual(latestNotebookGameSelection(state),{season:4,week:12,opponent:'Wisconsin'});
});

test('Week 12 Wisconsin Producer Pack backfills the user-provided screenshot tables exactly enough for NotebookLM',()=>{
  const pack=buildNotebookLmProducerPack({data,episode,facts});

  assert.match(pack.text,/NOTEBOOKLM PRODUCER PACK 2\.0/);
  assert.match(pack.text,/Week: 12/);
  assert.match(pack.text,/Opponent: Wisconsin/);
  assert.match(pack.text,/AUDIO PRIORITY MAP/);
  assert.match(pack.text,/GAME AT A GLANCE/);
  assert.match(pack.text,/COMPLETE VERIFIED SCREENSHOT STAT TABLES/);
  assert.match(pack.text,/AUTHORITATIVE INDIVIDUAL-STAT REFERENCE/);
  assert.match(pack.text,/## SEASON CONTEXT/);
  assert.match(pack.text,/### PREVIOUS GAME/);
  assert.match(pack.text,/### RECENT COMPLETED GAMES/);
  assert.match(pack.text,/STYLE REFERENCE — DYNASTYHQ GENERATED TRANSCRIPT/);
  assert.match(pack.text,/SOURCE RULES — READ BEFORE GENERATING/);
  assert.doesNotMatch(pack.text,/## EPISODE FOCUS/);
  assert.doesNotMatch(pack.text,/## CURRENT GAME — VERIFIED SNAPSHOT/);

  assert.match(pack.text,/### PASSING/);
  assert.match(pack.text,/ORE · B\.Wessel — Passer Rating: 201\.6 · Completions: 26 · Attempts: 34 · Passing yards: 334 · Completion %: 76 · Passing TDs: 5 · Interceptions: 1 · AVG \(yards\/attempt\): 9\.8 · Longest completion: 42/);
  assert.match(pack.text,/WISC · H\.Hendrix — Passer Rating: 93\.4 · Completions: 20 · Attempts: 38 · Passing yards: 193 · Completion %: 52 · Passing TDs: 1 · Interceptions: 2 · AVG \(yards\/attempt\): 5\.0 · Longest completion: 26/);

  assert.match(pack.text,/### RUSHING/);
  assert.match(pack.text,/ORE · B\.Smith — ATT \(Carries\): 10 · Rushing yards: 125 · AVG \(yards\/carry\): 12\.5 · Rushing TDs: 2 · FUMB \(Fumbles\): 0 · BTK \(Broken tackles\): 3 · YAC: 68 · 20\+ YDS: 1 · LONG: 65/);
  assert.match(pack.text,/ORE · B\.Wessel — ATT \(Carries\): 7 · Rushing yards: 51 · AVG \(yards\/carry\): 7\.2 · Rushing TDs: 0 · FUMB \(Fumbles\): 0 · BTK \(Broken tackles\): 0 · YAC: 4 · 20\+ YDS: 0 · LONG: 15/);

  assert.match(pack.text,/### RECEIVING/);
  assert.match(pack.text,/ORE · B\.Bullocks — Receptions: 9 · Receiving yards: 108 · AVG \(yards\/catch\): 12\.0 · Receiving TDs: 2 · RAC yards: 64 · RAC average: 7\.1 · Drops: 0 · Long reception: 29/);
  assert.match(pack.text,/WISC · W\.Clapp — Receptions: 7 · Receiving yards: 84 · AVG \(yards\/catch\): 12\.0 · Receiving TDs: 1 · RAC yards: 24 · RAC average: 3\.4 · Drops: 1 · Long reception: 17/);

  assert.match(pack.text,/### DEFENSE/);
  assert.match(pack.text,/ORE · K\.Hicks — Solo Tackles: 6 · Assisted Tackles: 1 · Total Tackles: 7 · TFL: 0 · Sacks: 0\.0 · Interceptions: 1 · Interception Return Yards: 42 · Interception Return AVG: 42\.0 · Interception Return LONG: 42/);
  assert.match(pack.text,/ORE · D\.Davis — Solo Tackles: 3 · Assisted Tackles: 1 · Total Tackles: 4 · TFL: 2 · Sacks: 1\.0/);
  assert.match(pack.text,/WISC · J\.Watkins — Solo Tackles: 3 · Assisted Tackles: 5 · Total Tackles: 8 · TFL: 1 · Sacks: 0\.0 · Interceptions: 1 · Interception Return Yards: 14 · Interception Return AVG: 14\.0 · Interception Return LONG: 14/);
  assert.match(pack.text,/WISC · T\.Dillard — Solo Tackles: 4 · Assisted Tackles: 5 · Total Tackles: 9 · TFL: 3 · Sacks: 0\.0 · Interceptions: 0/);

  assert.match(pack.text,/### PUNTING/);
  assert.match(pack.text,/WISC · J\.Marvin — Punts: 8 · Punting Yards: 353 · Punting Average: 44\.1 · Net Punting Yards: 296 · Net Punting Average: 37\.0 · Punt Blocks: 0 · Punts Inside 20: 1 · Touchbacks: 0 · Longest Punt: 55/);

  assert.match(pack.text,/OPENING REQUIREMENT:/);
  assert.match(pack.text,/Welcome to another episode of The Huddle Podcast/);
  assert.match(pack.customizePrompt,/Brief Deep Dive/);
  assert.match(pack.customizePrompt,/4–5 minutes/);
  assert.doesNotMatch(pack.text,/RECOMMENDED NOTEBOOKLM CUSTOMIZE PROMPT/);

  assert.doesNotMatch(pack.text,/9999/);
  assert.doesNotMatch(pack.text,/Coach Trust/);
  assert.equal(pack.meta.week,12);
  assert.equal(pack.meta.opponent,'Wisconsin');
  assert.ok(pack.meta.screenshotBackfillCount>0);
  assert.ok(pack.meta.screenshotStatCount>150);
  assert.equal(pack.meta.suggestedFileName,'DynastyHQ-S4-W12-Wisconsin-NotebookLM-Producer-Pack.txt');
});
