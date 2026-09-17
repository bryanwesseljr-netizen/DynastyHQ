import { buildCareerChronicle2 } from './careerChronicle2.js';

const clean = (value) => String(value ?? '').trim();
const numberOf = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const list = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

const careerHigh = (entries = [], key, valueFor) => entries
  .filter((entry) => entry?.game && entry.game.didPlay !== false)
  .map((entry) => ({ entry, value: valueFor(entry.game) }))
  .sort((left, right) => right.value - left.value)[0] || null;

const milestoneText = (entry = {}) => `${clean(entry.type)} ${clean(entry.title)} ${clean(entry.achievement)} ${clean(entry.summary)}`.toLowerCase();

export const buildCareerMuseum = (state = {}) => {
  const chronicle = buildCareerChronicle2(state);
  const entries = chronicle.entries;
  const games = entries.filter((entry) => entry?.game && entry.game.stage !== 'high-school' && !entry.game.evaluation);
  const appearances = games.filter((entry) => entry.game.didPlay !== false);
  const milestones = list(state.careerMilestones);
  const awards = milestones.filter((entry) => /award|heisman|all[- ]?american|all[- ]?conference|player of the|honor/i.test(milestoneText(entry)));
  const championships = milestones.filter((entry) => /champ|title|playoff|bowl|trophy/i.test(milestoneText(entry)));
  const records = milestones.filter((entry) => /record|career high|school mark/i.test(milestoneText(entry)));
  const schools = chronicle.seasons.reduce((result, season) => {
    const school = clean(season.school);
    if (!school || result.some((entry) => entry.school.toLowerCase() === school.toLowerCase())) return result;
    result.push({ school, firstSeason: season.season, role: season.role || '' });
    return result;
  }, []);

  const totals = appearances.reduce((sum, entry) => ({
    passYds: sum.passYds + numberOf(entry.game.passYds),
    passTD: sum.passTD + numberOf(entry.game.passTD),
    rushYds: sum.rushYds + numberOf(entry.game.rushYds),
    rushTD: sum.rushTD + numberOf(entry.game.rushTD),
    interceptions: sum.interceptions + numberOf(entry.game.int ?? entry.game.interceptions),
  }), { passYds: 0, passTD: 0, rushYds: 0, rushTD: 0, interceptions: 0 });

  const highs = [
    ['Passing Yards', careerHigh(entries, 'passYds', (game) => numberOf(game.passYds))],
    ['Total Touchdowns', careerHigh(entries, 'totalTD', (game) => numberOf(game.passTD) + numberOf(game.rushTD))],
    ['Rushing Yards', careerHigh(entries, 'rushYds', (game) => numberOf(game.rushYds))],
  ].map(([label, high]) => high ? ({
    label,
    value: high.value,
    season: high.entry.season,
    week: high.entry.week,
    opponent: clean(high.entry.game.opponent),
    publicationId: high.entry.publicationId,
  }) : null).filter(Boolean);

  const media = entries.reduce((sum, entry) => ({
    official: sum.official + Number(Boolean(entry.media?.official)),
    newsroom: sum.newsroom + Number(Boolean(entry.media?.newsroom)),
    podcast: sum.podcast + Number(Boolean(entry.media?.podcast)),
    photos: sum.photos + list(entry.media?.photos).length,
  }), { official: 0, newsroom: 0, podcast: 0, photos: 0 });

  const retired = String(state.careerPhase || '').toLowerCase() === 'retired';
  const finalSeason = chronicle.seasons[0] || null;
  const totalTD = totals.passTD + totals.rushTD;

  return {
    retired,
    legacyLabel: retired ? 'LEGACY SEALED' : 'LEGACY IN PROGRESS',
    legacySummary: retired
      ? `${appearances.length} appearances, ${totals.passYds.toLocaleString()} passing yards and ${totalTD} total touchdowns are preserved across ${chronicle.seasons.length} season chapter${chronicle.seasons.length === 1 ? '' : 's'}.`
      : `${appearances.length} appearances and ${chronicle.signatureGames.length} signature game${chronicle.signatureGames.length === 1 ? '' : 's'} are already preserved. The museum will keep growing as the career moves forward.`,
    seasons: chronicle.seasons,
    signatureGames: chronicle.signatureGames,
    schools,
    milestones,
    awards,
    championships,
    records,
    highs,
    media,
    totals: { ...totals, totalTD, appearances: appearances.length },
    finalSeason,
  };
};
