import { dedupeCareerMilestones } from './careerDataHygiene.js';

const numeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizedPhase = (value) => String(value || 'Player').trim() || 'Player';

const fallbackEvent = (update) => {
  const game = update.game;
  if (game) {
    if (game.stage === 'high-school' || game.evaluation) {
      const evaluation = game.evaluation || game;
      return {
        id: update.id,
        type: 'high-school-evaluation',
        title: `High-school Game ${evaluation.gameNumber || update.week} tape evaluation`,
        summary: `Tape Score ${Number(evaluation.tapeScoreAfter || 0).toLocaleString()} · ${evaluation.recruitStarsAfter || '—'}-star rating.`,
        factKeys: [],
      };
    }
    const score = game.homeScore !== '' && game.awayScore !== ''
      ? `, ${game.homeScore}-${game.awayScore}`
      : '';
    return {
      id: update.id,
      type: 'game',
      title: `${game.result || 'Game'} vs. ${game.opponent || 'Unknown opponent'}${score}`,
      summary: game.didPlay === false
        ? 'The team result was recorded; the tracked player did not appear.'
        : 'A verified game update was published.',
      factKeys: [],
    };
  }
  return {
    id: update.id,
    type: update.weekType === 'bye' ? 'bye' : 'weekly-update',
    title: update.weekType === 'bye' ? `Week ${update.week} bye` : `Week ${update.week} update`,
    summary: 'A verified weekly update was published.',
    factKeys: [],
  };
};

export const buildCareerArchive = (state = {}) => {
  const updates = state.weeklyUpdates || [];
  const events = dedupeCareerMilestones(state.careerChronicle || []);
  const facts = state.factLedger || [];
  const issues = state.newsroomIssues || [];
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const updatesById = new Map(updates.map((update) => [update.id, update]));
  const issuesById = new Map(issues.map((issue) => [issue.id, issue]));

  const entries = updates.map((update) => {
    const event = eventsById.get(update.id) || fallbackEvent(update);
    const publicationFacts = facts.filter((entry) => entry.publicationId === update.id);
    return {
      ...event,
      id: update.id,
      season: numeric(update.season || event.season) || 1,
      week: numeric(update.week || event.week) || 1,
      careerPhase: normalizedPhase(update.careerPhase || event.careerPhase),
      occurredAt: event.occurredAt || update.publishedAt,
      publishedAt: update.publishedAt || event.occurredAt,
      weekType: update.weekType || event.type || 'weekly-update',
      sourceCount: numeric(update.sourceCount),
      factCount: publicationFacts.length || numeric(update.factCount),
      game: update.game || null,
      rtgSnapshot: update.rtgSnapshot || null,
      rtgChanges: update.rtgChanges || [],
      quote: update.quote || '',
      facts: publicationFacts,
      hasNewsroom: issuesById.has(update.id),
    };
  });

  events.forEach((event) => {
    if (updatesById.has(event.id)) return;
    entries.push({
      ...event,
      season: numeric(event.season) || 1,
      week: numeric(event.week) || 1,
      careerPhase: normalizedPhase(event.careerPhase),
      occurredAt: event.occurredAt || '',
      publishedAt: event.occurredAt || '',
      weekType: event.type || 'milestone',
      sourceCount: 0,
      factCount: (event.factKeys || []).length,
      game: null,
      rtgSnapshot: null,
      rtgChanges: [],
      quote: '',
      facts: facts.filter((entry) => event.factKeys?.includes(entry.key)),
      hasNewsroom: issuesById.has(event.id),
    });
  });

  return entries.sort((a, b) => (
    b.season - a.season
    || b.week - a.week
    || String(b.occurredAt).localeCompare(String(a.occurredAt))
  ));
};

export const filterCareerArchive = (entries, filters = {}) => {
  const season = filters.season === 'all' || filters.season === undefined ? null : Number(filters.season);
  const phase = filters.phase === 'all' || !filters.phase ? null : filters.phase;
  const type = filters.type === 'all' || !filters.type ? null : filters.type;
  const query = String(filters.query || '').trim().toLowerCase();

  return entries.filter((entry) => {
    if (season !== null && entry.season !== season) return false;
    if (phase && entry.careerPhase !== phase) return false;
    if (type && entry.weekType !== type && entry.type !== type) return false;
    if (!query) return true;
    const searchable = [
      entry.title,
      entry.summary,
      entry.game?.opponent,
      entry.quote,
      ...entry.facts.map((fact) => `${fact.label} ${fact.value}`),
      ...Object.entries(entry.rtgSnapshot || {}).map(([key, value]) => `${key} ${JSON.stringify(value)}`),
    ].join(' ').toLowerCase();
    return searchable.includes(query);
  });
};

export const summarizeCareerArchive = (entries) => {
  const games = entries.filter((entry) => entry.game && entry.game.stage !== 'high-school' && !entry.game.evaluation);
  const appearances = games.filter((entry) => entry.game.didPlay !== false);
  return {
    updates: entries.length,
    games: games.length,
    wins: games.filter((entry) => entry.game.result === 'W').length,
    losses: games.filter((entry) => entry.game.result === 'L').length,
    byes: entries.filter((entry) => entry.weekType === 'bye').length,
    appearances: appearances.length,
    passingYards: appearances.reduce((total, entry) => total + numeric(entry.game.passYds), 0),
    totalTouchdowns: appearances.reduce(
      (total, entry) => total + numeric(entry.game.passTD) + numeric(entry.game.rushTD),
      0,
    ),
  };
};

export const getCareerArchiveFacets = (entries) => ({
  seasons: [...new Set(entries.map((entry) => entry.season))].sort((a, b) => b - a),
  phases: [...new Set(entries.map((entry) => entry.careerPhase))],
  types: [...new Set(entries.map((entry) => entry.type || entry.weekType))],
});
