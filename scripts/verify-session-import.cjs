// Optional integration check: install esbuild and jsdom in a temporary directory,
// then run DHQ_TEST_DEPS=/path/to/node_modules node scripts/verify-session-import.cjs.
const path=require('path');
const {createRequire}=require('module');
const deps=process.env.DHQ_TEST_DEPS ? createRequire(path.join(process.env.DHQ_TEST_DEPS,'__test__.cjs')) : require;
const {build}=deps('esbuild');
const {JSDOM}=deps('jsdom');
const fs=require('fs');
const vm=require('vm');
const assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'..');
const scratch=fs.mkdtempSync(path.join(require('os').tmpdir(),'dhq-react-test-'));
const bundlePath=path.join(scratch,'components.cjs');
(async()=>{
await build({stdin:{contents:`export {default as React,act} from 'react'; export {createRoot} from 'react-dom/client'; export {default as Session} from './src/components/SessionImportPortal.jsx'; export {default as Review} from './src/components/WeeklyReviewPanel.jsx'; export {default as Process} from './src/components/ProcessWeek2Portal.jsx'; export * from './src/domain/weeklyEngine.js';`,resolveDir:repo},bundle:true,format:'cjs',platform:'node',jsx:'automatic',outfile:bundlePath,loader:{'.css':'empty'},plugins:[{name:'test-career',setup(b){b.onResolve({filter:/OwnerCareerContext/},()=>({path:'context',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const useOwnerCareer = () => ({career: globalThis.testCareer});',loader:'js'}));}}]});
const dom=new JSDOM('<!doctype html><style>.dhq-agenda-v2-legacy-scanner{display:none}</style><div id="root"></div>',{url:'http://fixture.test',pretendToBeVisual:true});
for(const k of ['window','document','MutationObserver','CustomEvent','Event','HTMLElement'])global[k]=dom.window[k];
global.IS_REACT_ACT_ENVIRONMENT=true;
global.testCareer={currentSeason:2,currentWeek:3,player:{isCommitted:true},currentWeekSetup:{opponent:'Test Opponent'}};
const {React,act,createRoot,Session,Review,Process,createEmptyScanDraft,mergeScanResult,verifyScanDraftFact}=require(bundlePath);
const h=React.createElement;
const base=createEmptyScanDraft({season:2,week:3,careerPhase:'Player',isCommitted:true});
const draft=mergeScanResult(base,{source:{id:'test-1',fileName:'test.png',detectedTypes:['box_score']},facts:[{id:'f1',key:'game.passYds',label:'Passing yards',value:210,confidence:.5,sourceId:'test-1'}],gamePatch:{passYds:210},rtgPatch:{},coachPatch:{},recruitingPatches:[],retentionPatches:[]});
const appSource=fs.readFileSync(repo+'/src/App.jsx','utf8');
const handler=appSource.slice(appSource.indexOf('  const handleApplyScanDraft = () => {'),appSource.indexOf('\n  const getPublicationTarget'));
let applyCount=0;
function Fixture(){const [current,setCurrent]=React.useState(draft);const [applied,setApplied]=React.useState(null);
const apply=vm.runInNewContext(handler+'\nhandleApplyScanDraft;',{
scanDraft:current,appState:global.testCareer,WEEK_TYPES:{BYE:'bye',NO_APPEARANCE:'no_appearance'},window,CustomEvent,
setNewGame:()=>{},setRtgUpdate:()=>{},setCoachUpdate:()=>{},setAppliedScanDraft:(v)=>{setApplied(v);applyCount++},setScanDraft:setCurrent,setMessageModal:()=>{},setTimeout:()=>{},
});
return h(React.Fragment,null,h('div',{id:'dynastyhq-command-center'},h('button',null,'Import Session')),h('div',{className:'dhq-weekly-agenda-workspace dhq-weekly-agenda-v2'},h('div',{className:'dhq-agenda-v2-legacy-scanner'},h(Review,{draft:current,onApply:apply,onDiscard:()=>setCurrent(null),onVerifyFact:k=>setCurrent(d=>verifyScanDraftFact(d,k)),onChangeFact:()=>{},onChangeWeekType:()=>{}})),applied?h('div',{className:'dhq-agenda-v3-applied-ready'},'Verified draft ready'):null),h(Session),h(Process));}
const root=createRoot(document.getElementById('root'));
const settle=async()=>{await act(async()=>{await new Promise(r=>setTimeout(r,60));});};
const click=async(text)=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text));assert.ok(b,'Button exists: '+text);await act(async()=>b.click());await settle();return b;};
await act(async()=>root.render(h(Fixture)));await settle();
await click('Import Session');
let panel=document.querySelector('#dhq-session-game-review-host .dhq-postgame-review');assert.ok(panel,'Live review is mounted in Session Import');
for(let n=panel;n;n=n.parentElement) assert.notEqual(window.getComputedStyle(n).display,'none','Review has no hidden ancestor');
let next=[...panel.querySelectorAll('button')].find(b=>b.textContent.includes('Continue to RTG Status'));assert.ok(next);assert.equal(next.disabled,true,'Uncertain data cannot be applied');
await click('REVIEW FLAGGED ITEMS');assert.equal(document.activeElement,panel,'Review action focuses the live review panel');
await click('Confirm as shown');next=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Continue to RTG Status'));assert.equal(next.disabled,false);
await click('Continue to RTG Status');assert.equal(applyCount,1,'Actual App handler applies once');assert.ok(document.getElementById('dhq-weekly-rtg-data-host'),'RTG upload host is available');assert.ok(document.querySelector('.dhq-session-import.is-rtg'));
assert.equal(document.querySelector('#dhq-process-week2-inbox-host'),null,'No premature publishing inbox in RTG');
await click('SKIP — NOTHING CHANGED');assert.ok(document.getElementById('dhq-weekly-coverage-data-host'),'Coverage upload host is available');
await click('SKIP OPTIONAL COVERAGE');assert.ok(document.querySelector('.dhq-session-import.is-ready'));
assert.ok([...document.querySelectorAll('button')].some(b=>b.textContent.includes('OPEN PROCESS WEEK')));
await act(async()=>root.render(h(Fixture,{key:'discard-check'})));await settle();
await click('Import Session');
await act(async()=>window.dispatchEvent(new CustomEvent('dynastyhq:game-data-applied',{detail:{publicationId:'season-2-week-99'}})));
assert.ok(document.querySelector('.dhq-session-import.is-review'),'Wrong-week apply event cannot advance the session');
await click('Discard scan');assert.ok(document.querySelector('.dhq-session-import.is-game'),'Discard returns to the Game Data uploader');
await act(async()=>root.unmount());dom.window.close();fs.rmSync(scratch,{recursive:true,force:true});console.log('PASS: real React review mount, review-button focus, verification gate, actual App apply event, RTG → Coverage → Process Week, wrong-week guard, discard recovery');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
