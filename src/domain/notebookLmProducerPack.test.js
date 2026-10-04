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
  summary:'Oregon beat Wisconsin behind balanced offense and a four-touchdown day from Bryan Wessel.',
  transcript:'Mark Thompson: Oregon handled Wisconsin in Week 12.\n\nSarah Chen: The balance stood out.',
  chapters:[{title:'Opening Drive',summary:'Why Oregon won.'}],
  episode:{
    storylineThreads:[
      {label:'Stretch-run momentum after another conference win'},
      {label:'Coach Trust climbed again and should be discussed'},
    ],
  },
};

const facts=[
  {key:'game.passYds',label:'Passing yards',value:287,verified:true},
  {key:'rtg.coachTrust',label:'Coach Trust',value:9999,verified:true},
  {key:'program.coverage.scoring.1',label:'Oregon · Marco Ortiz · 22-yard touchdown reception · 8:15 1st Quarter',value:'22-yard TD pass from Bryan Wessel',verified:true},
  {key:'program.coverage.player.1',label:'ORE · Marco Ortiz · Receptions',value:6,verified:true},
  {key:'program.coverage.player.2',label:'ORE · Marco Ortiz · Receiving yards',value:101,verified:true},
  {key:'program.coverage.player.3',label:'WIS · D.Jones · Tackles',value:9,verified:true},
];

test('latest NotebookLM game selection resolves the most recent completed uploaded game',()=>{
  assert.deepEqual(latestNotebookGameSelection(state),{season:4,week:12,opponent:'Wisconsin'});
});

test('Producer Pack 2.0 targets Week 12 Wisconsin and keeps rich football detail without RTG mechanics',()=>{
  const pack=buildNotebookLmProducerPack({data,episode,facts});
  assert.match(pack.text,/NOTEBOOKLM PRODUCER PACK 2\.0/);
  assert.match(pack.text,/Week: 12/);
  assert.match(pack.text,/Opponent: Wisconsin/);
  assert.match(pack.text,/KEY STORYLINES/);
  assert.match(pack.text,/TEAM STATISTICAL COMPARISON/);
  assert.match(pack.text,/SCORING TIMELINE \/ DRIVE DETAILS/);
  assert.match(pack.text,/ORE · Marco Ortiz — Receptions: 6 · Receiving yards: 101/);
  assert.match(pack.text,/PREVIOUS-GAME COMPARISON/);
  assert.match(pack.text,/Previous opponent: Iowa/);
  assert.match(pack.text,/RECENT SEASON CONTEXT/);
  assert.match(pack.text,/DYNASTYHQ GENERATED TRANSCRIPT — COMPLETE/);
  assert.match(pack.text,/Mark Thompson: Oregon handled Wisconsin/);
  assert.match(pack.text,/RECOMMENDED NOTEBOOKLM CUSTOMIZE PROMPT/);
  assert.match(pack.customizePrompt,/Longer Deep Dive/);
  assert.match(pack.customizePrompt,/Mark Thompson and Sarah Chen/);
  assert.doesNotMatch(pack.text,/9999/);
  assert.doesNotMatch(pack.text,/Coach Trust climbed/);
  assert.equal(pack.meta.week,12);
  assert.equal(pack.meta.opponent,'Wisconsin');
  assert.equal(pack.meta.suggestedFileName,'DynastyHQ-S4-W12-Wisconsin-NotebookLM-Producer-Pack.txt');
});
