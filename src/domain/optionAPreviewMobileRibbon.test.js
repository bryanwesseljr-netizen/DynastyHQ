import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appUrl = new URL('../option-a-preview/PreviewApp.jsx', import.meta.url);
const cssUrl = new URL('../option-a-preview/preview.css', import.meta.url);

test('CFP semifinal score ribbon differentiates viewed current week from archive context', async () => {
  const app=await readFile(appUrl,'utf8');
  const start=app.indexOf('function ScoreRibbon({data})');
  const end=app.indexOf('const liveCareerNextGame=',start);
  assert.ok(start>=0 && end>start);
  const src=app.slice(start,end);
  assert.match(src,/Number\(data\.season\)===Number\(liveTarget\.season\)/);
  assert.match(src,/Number\(data\.week\)===Number\(liveTarget\.week\)/);
  assert.match(src,/showingLiveWeek\?'live-selected':'archived-selected'/);
  assert.match(src, /data\.weekLabel \|\|/);
  assert.match(src, /<Logo team=\{game\.opponent\}\/>/);
  assert.match(src, /<span>\{game\.opponent\}<\/span>/);
  assert.match(src, /<b>LIVE CAREER<\/b>/);
});

test('narrow viewport shows full playoff title on its own row and both teams on a second row', async () => {
  const css=await readFile(cssUrl,'utf8');
  const start=css.lastIndexOf('Mobile score ribbon v2: large named playoff rounds');
  assert.ok(start>0,'latest mobile ribbon style must be present');
  const section=css.slice(start);
  assert.match(section, /@media \(max-width:700px\)/);
  assert.match(section, /\.score-ribbon\{[\s\S]*display:grid!important/);
  assert.match(section, /height:auto!important/);
  assert.match(section, /grid-template-columns:minmax\(0,1fr\) 24px minmax\(0,1fr\)!important/);
  assert.match(section, /\.score-ribbon>div:first-child\{[\s\S]*grid-column:1\/-1!important/);
  assert.match(section, /white-space:normal!important/);
  assert.match(section, /\.score-ribbon>\.score-team:not\(\.away\)\{[\s\S]*grid-column:1!important/);
  assert.match(section, /\.score-ribbon>\.score-team\.away\{[\s\S]*grid-column:3!important/);
  assert.match(section, /\.score-ribbon\.live-selected>\.upnext\{display:none!important;\}/);
  assert.match(section, /\.score-ribbon\.archived-selected>\.upnext\{[\s\S]*grid-row:3!important/);
  assert.match(section, /\.score-ribbon \.score-team>span:not\(\.team-logo\)\{[\s\S]*display:inline-block!important/);
});

test('score ribbon remains in its original desktop location and responsive CSS is scoped to mobile',async()=>{
  const [app,css]=await Promise.all([readFile(appUrl,'utf8'),readFile(cssUrl,'utf8')]);
  assert.match(app,/<ScoreRibbon data=\{data\}\/>/);
  const section=css.slice(css.lastIndexOf('Mobile score ribbon v2:'));
  assert.ok(section.includes('@media (max-width:700px)'));
  assert.ok(!section.includes('@media (min-width:701px)'));
});
