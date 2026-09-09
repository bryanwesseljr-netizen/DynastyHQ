import { DEFAULT_CAREER_STATE } from '../domain/defaultCareerState.js';
import { createPublishedWeek, createWeekKey } from '../domain/weeklyEngine.js';
export const STORAGE_KEY = 'dynastyhq:redesign-demo:v1';
export const sampleGame = (week = 6) => ({ season: 1, week, opponent: week === 6 ? 'Houston' : 'UCF', homeScore: 31, awayScore: 24, passYds: 84, passTD: 1, rushYds: 18, rushTD: 0, int: 0, completions: 7, attempts: 10 });
export function publishDemo(state, draft, { sample = true, sources = [] } = {}) {
  const game = { ...draft, result: Number(draft.homeScore) > Number(draft.awayScore) ? 'W' : Number(draft.homeScore) < Number(draft.awayScore) ? 'L' : 'T' };
  if (!game.opponent?.trim()) throw new Error('Add the opponent before confirming.');
  for (const key of ['homeScore','awayScore','passYds','passTD','rushYds','rushTD','int']) {
    if (game[key] === '' || !Number.isFinite(Number(game[key])) || !Number.isInteger(Number(game[key])) || (key !== 'rushYds' && Number(game[key]) < 0)) throw new Error('Enter valid whole-number scores and stats.');
    game[key] = Number(game[key]);
  }
  const week = Number(game.week), id = createWeekKey(1, week);
  const next = createPublishedWeek({state, game, rtg:state.rtg, week, season:1, sources, facts:[]});
  const headline = `Cincinnati ${game.result === 'W' ? 'finds a way past' : game.result === 'L' ? 'falls to' : 'finishes level with'} ${game.opponent}, ${game.homeScore}–${game.awayScore}`;
  const body = `Cincinnati finished Week ${week} with a ${game.homeScore}–${game.awayScore} ${game.result === 'W' ? 'win over' : game.result === 'L' ? 'loss to' : 'tie against'} ${game.opponent}. ${state.player.name} recorded ${game.passYds} passing yards, ${game.passTD} passing touchdown${game.passTD === 1 ? '' : 's'}, and ${game.rushYds} rushing yards.\n\nFor the ${state.rtg.rank} quarterback, the larger picture remains development. The verified week is now part of the career record, with the game result, player statistics, and current RTG snapshot linked to the same publication.\n\nThis is an illustrative local recap built from the confirmed demo facts. No quotes, unverified personal details, or additional game events have been added.`;
  const article = {id:`article-${id}`, publicationId:id, week, season:1, headline, body, outlet:'Local', source:sample?'Sample session':'Manual entry', sample};
  next.newsroomIssues = [...state.newsroomIssues, {id, publicationId:id,week,season:1,articles:[article]}];
  next.podcastEpisodes = [...state.podcastEpisodes, {id:`podcast-${id}`,publicationId:id,week,season:1,showName:'The Huddle', title:`Week ${week}: ${game.opponent} in review`, script:body, status:'Script ready'}];
  next.demoSources = {...state.demoSources,[id]:sources.map(s=>({name:s.fileName || s.name || 'Sample session'}))};
  next.currentWeekSetup = {opponent: week === 6 ? 'UCF' : 'Next opponent',kickoff:'SATURDAY · 7:30 PM',venue:'NIPPERT STADIUM'};
  return next;
}
export function seedDemo() {
  let state = structuredClone(DEFAULT_CAREER_STATE);
  Object.assign(state,{currentWeek:3,currentSeason:1,careerStage:'College',player:{...state.player,name:'Jordan Hayes',pos:'QB',number:12,school:'Cincinnati',college:'Cincinnati',isCommitted:true,stars:3,overall:72,height:'6′ 2″',weight:'205 lb',classYear:'Freshman',archetype:'Dual threat'},rtg:{...state.rtg,rank:'QB2',coachTrust:4200,energy:86,gpa:3.4,skillPoints:310},demoSources:{}});
  const games = [{week:3,opponent:'Miami (OH)',homeScore:28,awayScore:14,passYds:42,passTD:0,rushYds:8}, {week:4,opponent:'Iowa State',homeScore:17,awayScore:24,passYds:26,passTD:0,rushYds:6},{week:5,opponent:'UCF',homeScore:34,awayScore:21,passYds:67,passTD:1,rushYds:22}];
  for (const g of games) state=publishDemo(state,{...sampleGame(g.week),...g},{sources:[{name:'Illustrative sample box score'}]});
  state.currentWeekSetup={opponent:'Houston',opponentRecord:'3–2',kickoff:'SATURDAY · 7:30 PM',venue:'NIPPERT STADIUM'};
  return state;
}
export function loadDemo() { try {const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)); if(saved?.player?.name && Array.isArray(saved.gameLogs) && Array.isArray(saved.factLedger)) return saved;} catch { /* Fresh demo when unavailable. */ } return seedDemo(); }
