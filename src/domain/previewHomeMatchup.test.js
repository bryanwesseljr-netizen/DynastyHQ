import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  nextCareerMatchupForHome,
  weekSelectorOptions,
  weekSelectorDisplayLabel,
} from './previewHomeMatchup.js';

const seasonState = (rows, logs = [], currentWeek = 18) => ({
  currentSeason:4,
  currentWeek,
  seasonSchedules:[{season:4,entries:rows}],
  gameLogs:logs.map((game) => ({season:4,didPlay:true,...game})),
});
const lsu={week:17,opponent:'LSU',result:'W',weekLabel:'CFP FIRST ROUND',homeScore:44,awayScore:10};
const byu={week:18,opponent:'BYU',result:'W',weekLabel:'CFP QUARTERFINAL · SUGAR BOWL',
  postseason:{stage:'quarterfinal',bowlName:'Sugar Bowl'},homeScore:35,awayScore:20};
const calendar=[
  {week:17,opponent:'LSU',label:'Bowl 1',completed:true,status:'completed',postseasonRound:'first-round'},
  {week:18,opponent:'BYU',label:'Bowl 2',postseasonRound:'quarterfinal',bowlName:'Sugar Bowl',status:'upcoming'},
];

test('completed BYU game cannot reappear as next game even when saved schedule row remains upcoming',()=>{
 const result=nextCareerMatchupForHome({state:seasonState(calendar,[lsu,byu])});
 assert.equal(result.awaiting,true);
 assert.equal(result.opponent,'TO BE ANNOUNCED');
 assert.equal(result.week,19);
 assert.equal(result.displayLabel,'NEXT PLAYOFF MATCHUP');
});

test('LSU completion reveals scheduled BYU quarterfinal as next matchup',()=>{
 const result=nextCareerMatchupForHome({state:seasonState(calendar,[lsu],17)});
 assert.equal(result.awaiting,false);
 assert.equal(result.week,18);
 assert.equal(result.opponent,'BYU');
 assert.equal(result.displayLabel,'CFP QUARTERFINAL · SUGAR BOWL');
});

test('next actual semifinal opponent wins over completed LSU and BYU history',()=>{
 const rows=[...calendar,{week:19,opponent:'Georgia',label:'Bowl 3',postseasonRound:'semifinal',status:'upcoming'}];
 const result=nextCareerMatchupForHome({state:seasonState(rows,[lsu,byu])});
 assert.equal(result.awaiting,false);
 assert.equal(result.week,19);
 assert.equal(result.opponent,'GEORGIA');
 assert.equal(result.displayLabel,'CFP SEMIFINAL');
});

test('a duplicated BYU quarterfinal in the following calendar slot does not revive the played matchup',()=>{
 const rows=[...calendar,{week:19,opponent:'BYU',label:'Bowl 2',postseasonRound:'quarterfinal',bowlName:'Sugar Bowl',status:'upcoming'}];
 const result=nextCareerMatchupForHome({state:seasonState(rows,[lsu,byu])});
 assert.equal(result.awaiting,true);
 assert.equal(result.opponent,'TO BE ANNOUNCED');
});

test('archive selector uses unique internal weeks and distinct labels even for same named bowl',()=>{
 assert.deepEqual(weekSelectorOptions([18,17,18,'19',19,15]),[19,18,17,15]);
 assert.equal(weekSelectorDisplayLabel(18,'CFP QUARTERFINAL · SUGAR BOWL'),'W18 · CFP QUARTERFINAL · SUGAR BOWL');
 assert.equal(weekSelectorDisplayLabel(19,'CFP QUARTERFINAL · SUGAR BOWL'),'W19 · CFP QUARTERFINAL · SUGAR BOWL');
 assert.equal(weekSelectorDisplayLabel(14,'W14'),'W14');
});

test('preview Home reads the finished game log and provides schedule-only action when matchup is pending',async()=>{
 const app=await readFile(new URL('../option-a-preview/PreviewApp.jsx',import.meta.url),'utf8');
 assert.match(app,/liveCareerNextGame=\(data\)=>nextCareerMatchupForHome\(data\)/);
 assert.match(app,/weekSelectorOptions\(data\.navigation\?\.weeks/);
 assert.match(app,/weekSelectorDisplayLabel\(value,previewWeekLabelFor/);
 assert.match(app,/matchup\.awaiting\?'VIEW THE ROAD AHEAD'/);
 assert.match(app,/matchup\.awaiting\?go\('gamehub'\)/);
});

test('mobile hero headline overrides legacy nowrap rules with wrapping, not clipping',async()=>{
 const css=await readFile(new URL('../option-a-preview/preview.css',import.meta.url),'utf8');
 const marker=css.lastIndexOf('Mobile Home hero: keep every generated');
 assert.ok(marker>0);
 const mobile=css.slice(marker);
 assert.match(mobile,/@media\(max-width:700px\)/);
 assert.match(mobile, /\.home-page \.hero h1>em\{[\s\S]*?white-space:normal!important/);
 assert.match(mobile,/overflow-wrap:break-word!important/);
 assert.match(mobile,/grid-template-columns:minmax\(0,1fr\) 54px minmax\(0,1fr\)!important/);
});
