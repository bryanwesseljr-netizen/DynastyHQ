import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appUrl = new URL('../option-a-preview/PreviewApp.jsx', import.meta.url);
const scheduleUrl = new URL('../option-a-preview/ScheduleExperience.jsx', import.meta.url);

test('Option A mounts Road Ahead schedule on Home and full schedule on Game Hub', async () => {
  const [app, schedule] = await Promise.all([
    readFile(appUrl, 'utf8'),
    readFile(scheduleUrl, 'utf8'),
  ]);

  assert.match(app, /import ScheduleExperience from '\.\/ScheduleExperience\.jsx'/);
  assert.match(app, /mode="home"/);
  assert.match(app, /mode="full"/);
  assert.match(app, /\{schedulePanel\}/);

  assert.match(schedule, /THE ROAD AHEAD/);
  assert.match(schedule, /FULL SEASON SCHEDULE/);
  assert.match(schedule, /oa-full-schedule-board/);
  assert.match(schedule, /oa-full-schedule-column/);
  assert.match(schedule, /ScheduleTeamLogo/);
  assert.match(schedule, /resolveTeamBrand/);
  assert.match(schedule, /UPDATE SCHEDULE/);
  assert.match(schedule, /IMPORT SCHEDULE/);
  assert.match(schedule, /mergeSeasonSchedule/);
  assert.match(schedule, /readHydratedCareerInTransaction/);
  assert.match(schedule, /writeHydratedCareerInTransaction/);
  assert.match(schedule, /POSTSEASON: Awaiting the next CFB 27 matchup/);
  assert.match(schedule, /Connect your live career to load the real schedule/);
  assert.match(schedule, /separate browser sign-in from the live DynastyHQ domain/);
  assert.match(schedule, /CONNECT LIVE CAREER/);
});

test('schedule importer explains merge safety and postseason flow', async () => {
  const schedule = await readFile(scheduleUrl, 'utf8');
  assert.match(schedule, /New rows merge into the existing season; saved games are not erased/);
  assert.match(schedule, /conference championship, bowl, or CFP/);
  assert.match(schedule, /Schedule rows are calendar context only/);
  assert.match(schedule, /data-schedule-importer/);
});


test('Game Hub places the full schedule after the weekly dashboard content', async () => {
  const app = await readFile(appUrl, 'utf8');
  const gameHubStart = app.indexOf('function GameHub(');
  const gameHubEnd = app.indexOf('\nfunction ', gameHubStart + 20);
  const gameHub = app.slice(gameHubStart, gameHubEnd > gameHubStart ? gameHubEnd : undefined);

  assert.ok(gameHub.indexOf('className="hub-grid"') >= 0);
  assert.ok(gameHub.indexOf('className="hub-bottom"') >= 0);
  assert.ok(gameHub.lastIndexOf('{schedulePanel}') > gameHub.indexOf('className="hub-bottom"'));
});
