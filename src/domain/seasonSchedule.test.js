import test from 'node:test';
import assert from 'node:assert/strict';
import {
  manualPostseasonScheduleDraft,
  mergeSeasonSchedule,
  nextScheduledGame,
  normalizeScheduleEntry,
  scheduleDisplayLabel,
  scheduleHighlightWeek,
  schedulePhaseForEntry,
  scheduleWeekSetup,
  syncScheduleWithCareer,
  teamRecordForSeason,
  upsertSeasonSchedule,
} from './seasonSchedule.js';

test('team record includes schedule results for games the tracked player did not play', () => {
  const state = {
    currentSeason: 1,
    currentWeek: 3,
    seasonSchedules: [{
      season: 1,
      school: 'Baylor',
      entries: [
        { week: 1, opponent: 'SMU', status: 'completed', result: 'W', teamScore: 31, opponentScore: 17 },
        { week: 2, opponent: 'Oregon', status: 'completed', result: 'L', teamScore: 21, opponentScore: 45 },
        { week: 3, opponent: 'TCU', status: 'upcoming' },
      ],
    }],
    gameLogs: [
      { season: 1, week: 2, opponent: 'Oregon', result: 'L', homeScore: 21, awayScore: 45, didPlay: true },
    ],
  };

  assert.deepEqual(teamRecordForSeason(state), { wins: 1, losses: 1, games: 2, source: 'schedule' });
  assert.equal(nextScheduledGame(state)?.opponent, 'TCU');
  assert.equal(scheduleWeekSetup(state)?.opponent, 'TCU');
});

test('published game data updates the matching schedule row without erasing schedule-only results', () => {
  const state = {
    currentSeason: 1,
    gameLogs: [{ season: 1, week: 2, opponent: 'Oregon', result: 'W', homeScore: 45, awayScore: 21, didPlay: true }],
  };
  const schedule = {
    season: 1,
    entries: [
      { week: 1, opponent: 'SMU', result: 'W', teamScore: 24, opponentScore: 10, status: 'completed' },
      { week: 2, opponent: 'Oregon', status: 'upcoming' },
    ],
  };
  const synced = syncScheduleWithCareer(state, schedule);
  assert.equal(synced.entries[0].result, 'W');
  assert.equal(synced.entries[1].result, 'W');
  assert.equal(synced.entries[1].teamScore, 45);
  assert.equal(synced.entries[1].opponentScore, 21);
});

test('multiple schedule screenshots merge by week and preserve known finals', () => {
  const first = mergeSeasonSchedule(null, {
    season: 2,
    entries: [
      { week: 1, opponent: 'Utah', result: 'W', teamScore: 28, opponentScore: 17, status: 'completed' },
      { week: 2, opponent: 'Kansas State', status: 'upcoming' },
    ],
  }, 2);
  const merged = mergeSeasonSchedule(first, {
    season: 2,
    entries: [
      { week: 2, opponent: 'Kansas State', homeAway: 'away', status: 'upcoming' },
      { week: 3, opponent: 'BYE', isBye: true, status: 'bye' },
    ],
  }, 2);
  assert.equal(merged.entries.length, 3);
  assert.equal(merged.entries[0].result, 'W');
  assert.equal(merged.entries[1].homeAway, 'away');
  assert.equal(merged.entries[2].isBye, true);
});

test('schedule setup identifies a current bye without skipping to the next opponent', () => {
  const state = {
    currentSeason: 1,
    currentWeek: 3,
    seasonSchedules: [{
      season: 1,
      entries: [
        { week: 3, opponent: 'BYE', isBye: true, status: 'bye' },
        { week: 4, opponent: 'Iowa State', status: 'upcoming' },
      ],
    }],
  };
  const setup = scheduleWeekSetup(state);
  assert.equal(setup.week, 3);
  assert.equal(setup.type, 'bye');
  assert.equal(setup.opponent, '');
  assert.equal(nextScheduledGame(state)?.opponent, 'Iowa State');
});

test('Week 0 is preserved when the game schedule explicitly includes it', () => {
  const entry = normalizeScheduleEntry({ week: 0, opponent: 'Colorado', status: 'upcoming' }, 7);
  assert.equal(entry.week, 0);
  assert.equal(entry.opponent, 'Colorado');
});

test('upsert keeps schedules separated by season', () => {
  const initial = { currentSeason: 2, seasonSchedules: [{ season: 1, entries: [{ week: 1, opponent: 'Old' }] }] };
  const next = upsertSeasonSchedule(initial, { season: 2, entries: [{ week: 1, opponent: 'New' }] });
  assert.equal(next.seasonSchedules.length, 2);
  assert.equal(next.seasonSchedules.find((entry) => entry.season === 1).entries[0].opponent, 'Old');
  assert.equal(next.seasonSchedules.find((entry) => entry.season === 2).entries[0].opponent, 'New');
});


test('visible bowl and CFP labels are treated as postseason without guessing from week number', () => {
  const regular = normalizeScheduleEntry({ week: 14, opponent: 'Michigan', label: 'Week 14', status: 'upcoming' });
  const bowl = normalizeScheduleEntry({ week: 16, opponent: 'Georgia', label: 'Rose Bowl', status: 'upcoming' });
  const cfp = normalizeScheduleEntry({ week: 17, opponent: 'Texas', label: 'CFP Quarterfinal', status: 'upcoming' });

  assert.equal(schedulePhaseForEntry(regular), 'regular-season');
  assert.equal(schedulePhaseForEntry(bowl), 'postseason');
  assert.equal(schedulePhaseForEntry(cfp), 'postseason');
});

test('schedule Week Setup carries visible postseason stage into the active week', () => {
  const state = {
    currentSeason: 4,
    currentWeek: 15,
    seasonSchedules: [{
      season: 4,
      entries: [
        { week: 14, opponent: 'Michigan State', status: 'completed', result: 'W', teamScore: 35, opponentScore: 21 },
        { week: 15, opponent: 'Ohio State', label: 'Big Ten Championship', homeAway: 'neutral', status: 'upcoming' },
      ],
    }],
  };

  const setup = scheduleWeekSetup(state);
  assert.equal(setup.week, 15);
  assert.equal(setup.phase, 'postseason');
  assert.equal(setup.label, 'Big Ten Championship');
  assert.equal(setup.opponent, 'Ohio State');
  assert.equal(setup.venue, 'Neutral site');
});

test('postseason schedule updates append new rows without erasing the regular season', () => {
  const regular = {
    season: 4,
    entries: [
      { week: 13, opponent: 'Washington', status: 'completed', result: 'W', teamScore: 42, opponentScore: 35 },
      { week: 14, opponent: 'Michigan State', status: 'upcoming' },
    ],
  };
  const postseasonUpdate = {
    season: 4,
    entries: [
      { week: 15, opponent: 'Ohio State', label: 'Big Ten Championship', status: 'upcoming', homeAway: 'neutral' },
    ],
  };

  const merged = mergeSeasonSchedule(regular, postseasonUpdate, 4);
  assert.equal(merged.entries.length, 3);
  assert.equal(merged.entries[0].opponent, 'Washington');
  assert.equal(merged.entries[2].opponent, 'Ohio State');
  assert.equal(merged.entries[2].phase, 'postseason');
});


test('CFB 27 postseason slot labels stay user-facing while internal week numbers remain sortable', () => {
  const confChamp = normalizeScheduleEntry({
    week: 16,
    opponent: 'BYE',
    isBye: true,
    status: 'bye',
    label: 'Conf Champ',
  });
  const bowlOne = normalizeScheduleEntry({
    week: 17,
    opponent: 'LSU',
    status: 'upcoming',
    label: 'Bowl 1',
    date: 'Sat, Dec 21',
  });

  assert.equal(schedulePhaseForEntry(confChamp), 'regular-season');
  assert.equal(scheduleDisplayLabel(confChamp), 'CONF CHAMP');
  assert.equal(schedulePhaseForEntry(bowlOne), 'postseason');
  assert.equal(scheduleDisplayLabel(bowlOne), 'BOWL 1');
});

test('Bowl 1 can be the first playable postseason game after conference championship bye', () => {
  const state = {
    currentSeason: 4,
    currentWeek: 16,
    seasonSchedules: [{
      season: 4,
      entries: [
        { week: 15, opponent: 'BYE', isBye: true, status: 'bye' },
        { week: 16, opponent: 'BYE', isBye: true, status: 'bye', label: 'Conf Champ' },
        { week: 17, opponent: 'LSU', status: 'upcoming', label: 'Bowl 1', date: 'Sat, Dec 21' },
      ],
    }],
  };

  assert.equal(nextScheduledGame(state)?.opponent, 'LSU');
  assert.equal(scheduleDisplayLabel(nextScheduledGame(state)), 'BOWL 1');
  assert.equal(scheduleWeekSetup(state)?.label, 'Conf Champ');
});

test('schedule highlight skips byes and advances to the next playable postseason game', () => {
  const entries = [
    normalizeScheduleEntry({ week: 14, opponent: 'Michigan State', status: 'completed', result: 'W', teamScore: 38, opponentScore: 30 }),
    normalizeScheduleEntry({ week: 15, opponent: 'BYE', isBye: true, status: 'bye' }),
    normalizeScheduleEntry({ week: 16, opponent: 'BYE', isBye: true, status: 'bye', label: 'Conf Champ' }),
    normalizeScheduleEntry({ week: 17, opponent: 'LSU', status: 'upcoming', label: 'Bowl 1' }),
  ];

  assert.equal(scheduleHighlightWeek(entries, 15), 17);
  assert.equal(scheduleHighlightWeek(entries, 16), 17);
  assert.equal(scheduleHighlightWeek(entries, 17), 17);
});

test('confirmed playoff round and bowl name replace generic slot labels without touching the internal week', () => {
  const unknown = normalizeScheduleEntry({ week: 17, label: 'Bowl 1', opponent: 'LSU' });
  assert.equal(scheduleDisplayLabel(unknown), 'BOWL 1');
  assert.equal(unknown.week, 17);
  assert.equal(unknown.postseasonRound, '');
  assert.equal(unknown.bowlName, '');

  const first = normalizeScheduleEntry({
    week: 17, label: 'Bowl 1', opponent: 'LSU', postseasonRound: 'first-round',
  });
  assert.equal(scheduleDisplayLabel(first), 'CFP FIRST ROUND');
  assert.equal(first.week, 17);

  const quarter = normalizeScheduleEntry({
    week: 18, label: 'Bowl 2', opponent: 'Texas',
    postseasonRound: 'quarterfinal', bowlName: 'Rose Bowl',
  });
  assert.equal(scheduleDisplayLabel(quarter), 'CFP QUARTERFINAL · ROSE BOWL');
  assert.equal(schedulePhaseForEntry(quarter), 'postseason');

  const semi = normalizeScheduleEntry({
    week: 19, label: 'Bowl 3', opponent: 'Georgia',
    postseasonRound: 'semifinal', bowlName: 'Sugar Bowl',
  });
  assert.equal(scheduleDisplayLabel(semi), 'CFP SEMIFINAL · SUGAR BOWL');
  assert.equal(scheduleDisplayLabel(normalizeScheduleEntry({
    week: 20, label: 'Bowl 4', opponent: 'Penn State',
    postseasonRound: 'national-championship',
  })), 'CFP NATIONAL CHAMPIONSHIP');
});

test('generic schedule re-import retains already confirmed playoff names and preserves game scores', () => {
  const original = mergeSeasonSchedule(null, {
    season: 4,
    entries: [{
      week: 17, label: 'Bowl 1', opponent: 'LSU',
      postseasonRound: 'quarterfinal', bowlName: 'Peach Bowl',
      result: 'W', teamScore: 35, opponentScore: 28,
    }],
  }, 4);
  const merged = mergeSeasonSchedule(original, {
    season: 4,
    entries: [{ week: 17, label: 'Bowl 1', opponent: 'LSU', status: 'upcoming' }],
  }, 4);
  assert.equal(merged.entries[0].postseasonRound, 'quarterfinal');
  assert.equal(merged.entries[0].bowlName, 'Peach Bowl');
  assert.equal(scheduleDisplayLabel(merged.entries[0]), 'CFP QUARTERFINAL · PEACH BOWL');
  assert.equal(merged.entries[0].result, 'W');
  assert.equal(merged.entries[0].teamScore, 35);
});

test('manual matchup entry adds a confirmed future playoff opponent while preserving Oregon vs LSU', () => {
  const original = {
    season: 4,
    school: 'Oregon',
    entries: [
      { week: 17, opponent: 'LSU', label: 'Bowl 1', postseasonRound: 'first-round',
        homeAway: 'home', status: 'completed', result: 'W', teamScore: 44, opponentScore: 10 },
      { week: 18, opponent: '', label: 'Bowl 2', status: 'upcoming' },
    ],
  };
  const updated = manualPostseasonScheduleDraft({
    existing: original,
    season: 4,
    school: 'Oregon',
    week: '18',
    opponent: 'Georgia',
    label: 'Bowl 2',
    date: 'Tue, Dec 24',
    homeAway: 'neutral',
    postseasonRound: 'quarterfinal',
    bowlName: 'Sugar Bowl',
  });
  assert.equal(updated.entries.length, 2);
  const lsu = updated.entries.find(e => e.week === 17);
  const quarterfinal = updated.entries.find(e => e.week === 18);
  assert.equal(lsu.result, 'W');
  assert.equal(lsu.teamScore, 44);
  assert.equal(lsu.opponentScore, 10);
  assert.equal(lsu.postseasonRound, 'first-round');
  assert.equal(lsu.homeAway, 'home');
  assert.equal(quarterfinal.opponent, 'Georgia');
  assert.equal(quarterfinal.date, 'Tue, Dec 24');
  assert.equal(quarterfinal.phase, 'postseason');
  assert.equal(quarterfinal.homeAway, 'neutral');
  assert.equal(scheduleDisplayLabel(quarterfinal), 'CFP QUARTERFINAL · SUGAR BOWL');
  assert.equal(quarterfinal.completed, false);
});

test('manual schedule entry never overwrites a completed match, a bye, or invents a game', () => {
  const existing = {
    season: 4, entries: [
      { week: 16, opponent: 'BYE', isBye: true, label: 'Conf Champ', status: 'bye' },
      { week: 17, opponent: 'LSU', label: 'Bowl 1', status: 'completed', result: 'W' },
    ],
  };
  const add = (patch) => manualPostseasonScheduleDraft({
    existing, season: 4, week: 18, opponent: 'Texas', ...patch,
  });
  assert.throws(() => add({week:17}), /completed or marked as a bye/i);
  assert.throws(() => add({week:16}), /completed or marked as a bye/i);
  assert.throws(() => add({week:18,opponent:'TBD'}), /confirmed opponent/i);
  assert.throws(() => add({week:'x'}), /valid in-game schedule week/i);
  const blankRound = add({postseasonRound:'',bowlName:''});
  assert.equal(blankRound.entries.find(e=>e.week===18).postseasonRound, '');
  assert.equal(blankRound.entries.find(e=>e.week===18).phase, 'postseason');
});

test('manual schedule interface never activates career and retains screenshot option', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../option-a-preview/ScheduleExperience.jsx', import.meta.url), 'utf8');
  assert.match(source, /ENTER MATCHUP MANUALLY/);
  assert.match(source, /ADD NEXT POSTSEASON MATCHUP WITHOUT AI/);
  assert.match(source, /DATE AS SHOWN IN GAME/);
  assert.match(source, /REVIEW MATCHUP/);
  assert.match(source, /SAVE CONFIRMED MATCHUP/);
  assert.match(source, /const scheduleToSave = draftSource === 'manual'/);
  assert.match(source, /if \(draftSource !== 'manual'\) next = advancePostseasonCareer\(next\)/);
  assert.match(source, /Number\(game\?\.week\) === Number\(manualDraft.week\)/);
  assert.match(source, /READ SCHEDULE/);
});

test('Bowl 3 manual edit replaces mistakenly copied W18 quarterfinal bowl title only', () => {
  const original = {
    season: 4,
    school: 'Oregon',
    entries: [
      {
        week: 17, opponent: 'LSU', label: 'Bowl 1', postseasonRound: 'first-round',
        status: 'completed', result: 'W', teamScore: 44, opponentScore: 10,
      },
      {
        week: 18, opponent: 'BYU', label: 'Bowl 2', postseasonRound: 'quarterfinal',
        bowlName: 'Sugar Bowl', status: 'completed', result: 'W',
        teamScore: 35, opponentScore: 20,
      },
      {
        week: 19, opponent: 'Georgia', label: 'Bowl 2',
        postseasonRound: 'quarterfinal', bowlName: 'Sugar Bowl',
        status: 'upcoming',
      },
    ],
  };
  const result = manualPostseasonScheduleDraft({
    existing:original,
    season:4,
    week:19,
    opponent:'Georgia',
    label:'Bowl 3',
    postseasonRound:'semifinal',
    bowlName:'',
    homeAway:'unknown',
  });
  const w18 = result.entries.find((entry) => entry.week === 18);
  const w19 = result.entries.find((entry) => entry.week === 19);
  assert.equal(scheduleDisplayLabel(w18),'CFP QUARTERFINAL · SUGAR BOWL');
  assert.equal(w18.teamScore,35);
  assert.equal(w18.opponentScore,20);
  assert.equal(w18.completed,true);
  assert.equal(w19.label,'Bowl 3');
  assert.equal(w19.postseasonRound,'semifinal');
  assert.equal(w19.bowlName,'');
  assert.equal(w19.completed,false);
  assert.equal(scheduleDisplayLabel(w19),'CFP SEMIFINAL');
  assert.equal(result.entries.length,3);
});

test('unconfirmed Bowl 3 identity intentionally clears wrong inherited bowl', () => {
  const original = {
    season:4,
    entries:[
      { week:18, opponent:'BYU', label:'Bowl 2', postseasonRound:'quarterfinal',
        bowlName:'Sugar Bowl', result:'W', status:'completed' },
      { week:19, opponent:'Georgia', label:'Bowl 2', postseasonRound:'quarterfinal',
        bowlName:'Sugar Bowl', status:'upcoming' },
    ],
  };
  const draft = manualPostseasonScheduleDraft({
    existing:original,season:4,week:19,opponent:'Georgia',label:'Bowl 3',
    postseasonRound:'',bowlName:'',
  });
  const row=draft.entries.find((entry)=>entry.week===19);
  assert.equal(row.postseasonRound,'');
  assert.equal(row.bowlName,'');
  assert.equal(scheduleDisplayLabel(row),'BOWL 3');
});

test('new screenshot opponent resets obsolete playoff identity but same opponent preserves confirmed bowl', () => {
  const initial=mergeSeasonSchedule(null,{
    season:4,entries:[
      {week:19,label:'Bowl 2',opponent:'BYU',
        postseasonRound:'quarterfinal',bowlName:'Sugar Bowl',status:'upcoming'},
    ],
  },4);
  const different=mergeSeasonSchedule(initial,{
    season:4,entries:[{week:19,label:'Bowl 3',opponent:'Georgia',status:'upcoming'}],
  },4);
  assert.equal(different.entries[0].opponent,'Georgia');
  assert.equal(different.entries[0].postseasonRound,'');
  assert.equal(different.entries[0].bowlName,'');
  const unchanged=mergeSeasonSchedule(initial,{
    season:4,entries:[{week:19,label:'Bowl 2',opponent:'BYU',status:'upcoming'}],
  },4);
  assert.equal(unchanged.entries[0].postseasonRound,'quarterfinal');
  assert.equal(unchanged.entries[0].bowlName,'Sugar Bowl');
});

test('manual schedule blocks same CFP round in consecutive games after a completed quarterfinal',()=>{
  const original={
    season:4,
    entries:[{week:18,label:'Bowl 2',opponent:'BYU',result:'W',
      postseasonRound:'quarterfinal',bowlName:'Sugar Bowl',status:'completed'}],
  };
  assert.throws(()=>manualPostseasonScheduleDraft({
    existing:original,season:4,week:19,opponent:'Texas',
    label:'Bowl 3',postseasonRound:'quarterfinal',
  }),/same as the completed previous playoff game/i);
});

test('preview editor makes repeated quarterfinal title a visible editable semifinal warning',async()=>{
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../option-a-preview/ScheduleExperience.jsx',import.meta.url),'utf8');
  assert.match(source,/const duplicatedPriorPlayoffTitle =/);
  assert.match(source,/THIS ROUND MATCHES THE COMPLETED PREVIOUS GAME/);
  assert.match(source,/SET CFP SEMIFINAL · CLEAR COPIED BOWL/);
  assert.match(source,/postseasonRound:duplicatedPreviousStage \? ''/);
  assert.match(source,/bowlName:duplicatedPreviousStage \? ''/);
  assert.match(source,/seasonSchedules:\s*\[/);
  assert.match(source,/scheduleToSave,/);
  assert.match(source,/existing:syncScheduleWithCareer\(remote,seasonScheduleFor\(remote,activeSeason\)/);
});
