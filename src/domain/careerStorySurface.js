import { buildMediaNetworkLayer, latestMeaningfulMediaContext } from './mediaNetworkLayer.js';
import { nextScheduledGame, seasonScheduleFor, syncScheduleWithCareer, teamRecordForSeason } from './seasonSchedule.js';

const clean = (value, max = 600) => String(value ?? '').trim().slice(0, max);
const list = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const numberOf = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const latestPlayerGame = (state = {}, season = 1) => list(state.gameLogs)
  .filter((game) => game?.stage !== 'high-school' && !game?.evaluation && game?.didPlay !== false)
  .filter((game) => Number(game?.season || 1) === Number(season))
  .sort((left, right) => numberOf(left.week) - numberOf(right.week))
  .at(-1) || null;

const latestTeamResult = (state = {}, season = 1) => {
  const schedule = seasonScheduleFor(state, season);
  if (!schedule?.entries?.length) return null;
  return syncScheduleWithCareer(state, schedule).entries
    .filter((entry) => !entry.isBye && entry.completed && ['W', 'L'].includes(clean(entry.result, 10).toUpperCase()))
    .sort((left, right) => Number(left.week) - Number(right.week))
    .at(-1) || null;
};

const playerLine = (game = {}) => {
  if (!game) return '';
  const totalTD = numberOf(game.passTD) + numberOf(game.rushTD);
  const pieces = [`${numberOf(game.passYds)} pass yds`];
  if (totalTD) pieces.push(`${totalTD} TD${totalTD === 1 ? '' : 's'}`);
  if (numberOf(game.rushYds)) pieces.push(`${numberOf(game.rushYds)} rush yds`);
  return pieces.join(' · ');
};

const teamResultLine = (entry = {}) => {
  if (!entry) return '';
  const score = entry.teamScore !== null && entry.teamScore !== undefined && entry.opponentScore !== null && entry.opponentScore !== undefined
    ? `${entry.teamScore}-${entry.opponentScore}`
    : '';
  return `${clean(entry.result, 10).toUpperCase()}${score ? ` ${score}` : ''} vs ${clean(entry.opponent)}`;
};

export const buildCareerStorySurface = (state = {}) => {
  const season = Math.max(1, numberOf(state.currentSeason, 1));
  const player = state.player || {};
  const rtg = state.rtg || {};
  const school = clean(player.college || player.school) || 'Your program';
  const playerName = clean(player.name) || 'Your player';
  const role = clean(rtg.rank || rtg.depthChartRole || player.depthChartRole || player.pos) || 'Player';
  const coachTrust = Number.isFinite(Number(rtg.coachTrust)) ? Number(rtg.coachTrust) : null;
  const record = teamRecordForSeason(state, season);
  const next = nextScheduledGame(state, season);
  const playerGame = latestPlayerGame(state, season);
  const teamResult = latestTeamResult(state, season);
  const mediaContext = latestMeaningfulMediaContext(state);
  const media = buildMediaNetworkLayer(state, mediaContext);

  const recordText = `${record.wins}-${record.losses}`;
  const nextText = next ? `Week ${next.week} vs ${clean(next.opponent)}` : 'the next game';
  const latestTeamText = teamResult ? teamResultLine(teamResult) : '';
  const latestPlayerText = playerGame ? playerLine(playerGame) : '';

  const headline = next
    ? `${school} is ${recordText}. ${role.toUpperCase()} heads into ${clean(next.opponent)} week.`
    : `${school} is ${recordText}. The season story is still moving.`;

  const summaryParts = [];
  if (teamResult) summaryParts.push(`Last team result: ${latestTeamText}.`);
  if (playerGame && latestPlayerText) summaryParts.push(`${playerName}'s latest player line: ${latestPlayerText} against ${clean(playerGame.opponent)}.`);
  if (next) summaryParts.push(`${nextText} is next.`);

  const coverageHeadline = clean(media.dynasty.headline || media.official.headline || media.dynasty.podcastTitle);
  const coverageDetail = media.dynasty.newsroomReady && media.dynasty.podcastReady
    ? `Week ${media.week} · Newsroom + The Huddle`
    : media.dynasty.newsroomReady
      ? `Week ${media.week} · Newsroom`
      : media.dynasty.podcastReady
        ? `Week ${media.week} · The Huddle`
        : media.official.status === 'captured'
          ? `Week ${media.week} · EA SPORTS Network`
          : 'No finished media story yet';

  return {
    season,
    school,
    playerName,
    headline,
    summary: summaryParts.join(' '),
    role: {
      title: role.toUpperCase(),
      detail: [coachTrust !== null ? `${coachTrust.toLocaleString()} coach trust` : '', playerGame && latestPlayerText ? `Last: ${latestPlayerText}` : ''].filter(Boolean).join(' · '),
    },
    seasonCard: {
      title: recordText,
      detail: [teamResult ? `Last team result: ${latestTeamText}` : '', next ? `Next: W${next.week} · ${clean(next.opponent).toUpperCase()}` : ''].filter(Boolean).join(' · '),
    },
    coverage: {
      title: coverageHeadline || 'No finished story since the last game',
      detail: coverageDetail,
      week: media.week,
    },
    story: {
      title: next ? `${role.toUpperCase()} chapter moves into ${clean(next.opponent)} week` : `${role.toUpperCase()} remains the center of the current chapter`,
      detail: teamResult
        ? `${school} comes in at ${recordText} after ${latestTeamText}. ${playerGame && latestPlayerText ? `${playerName}'s latest player line is ${latestPlayerText} against ${clean(playerGame.opponent)}.` : ''}`.trim()
        : summaryParts.join(' '),
    },
  };
};
