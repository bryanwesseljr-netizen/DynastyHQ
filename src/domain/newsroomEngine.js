const OUTLETS = [
  { id: 'bolt', name: 'The Bolt', desk: 'School Desk' },
  { id: 'local', name: 'Dearborn Chronicle', desk: 'Local Sports' },
  { id: 'recruiting', name: 'The Recruiting Wire', desk: 'Recruiting Desk' },
  { id: 'filmroom', name: "The Film Room", desk: 'Numbers & Tactics' },
  { id: 'national', name: 'Saturday National', desk: 'National Desk' },
];

const numeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasValue = (value) => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));

const resultWord = (result) => {
  if (result === 'W') return 'win';
  if (result === 'L') return 'loss';
  return 'result';
};

const resultVerb = (result) => {
  if (result === 'W') return 'defeats';
  if (result === 'L') return 'falls to';
  return 'finishes against';
};

const scoreText = (game) => {
  if (game.homeScore === '' || game.awayScore === '' || game.homeScore == null || game.awayScore == null) return '';
  return `${game.homeScore}-${game.awayScore}`;
};

const statLine = (game) => {
  const pieces = [];
  if (hasValue(game.passYds)) pieces.push(`${numeric(game.passYds)} passing yards`);
  if (hasValue(game.passTD)) pieces.push(`${numeric(game.passTD)} passing ${numeric(game.passTD) === 1 ? 'touchdown' : 'touchdowns'}`);
  if (hasValue(game.rushYds)) pieces.push(`${numeric(game.rushYds)} rushing yards`);
  if (hasValue(game.rushTD)) pieces.push(`${numeric(game.rushTD)} rushing ${numeric(game.rushTD) === 1 ? 'touchdown' : 'touchdowns'}`);
  if (hasValue(game.int)) pieces.push(`${numeric(game.int)} ${numeric(game.int) === 1 ? 'interception' : 'interceptions'}`);
  return pieces.length ? pieces.join(', ') : 'No individual statistics were recorded';
};

const combinedValue = (first, second) => hasValue(first) && hasValue(second) ? numeric(first) + numeric(second) : null;

const article = ({ outlet, headline, dek, paragraphs, citedFactKeys }) => ({
  id: outlet.id,
  outletId: outlet.id,
  outletName: outlet.name,
  desk: outlet.desk,
  headline,
  dek,
  paragraphs,
  citedFactKeys: [...new Set(citedFactKeys)],
});

export const createNewsroomIssue = ({
  publicationId,
  season,
  week,
  careerPhase,
  player,
  game,
  recruiting = [],
  quote = '',
  availableFactKeys = [],
  publishedAt,
}) => {
  const playerName = player?.name || 'The quarterback';
  const school = player?.school || 'the program';
  const opponent = game?.opponent || 'the opponent';
  const score = scoreText(game);
  const outcome = resultWord(game?.result);
  const totalYards = combinedValue(game?.passYds, game?.rushYds);
  const totalTD = combinedValue(game?.passTD, game?.rushTD);
  const allowedKeys = new Set(availableFactKeys);
  const gameKeys = ['profile.player.name', 'profile.player.school', 'game.opponent', 'game.result'];
  ['passYds', 'passTD', 'rushYds', 'rushTD', 'int'].forEach((key) => {
    if (hasValue(game?.[key])) gameKeys.push(`game.${key}`);
  });
  if (score) gameKeys.push('game.homeScore', 'game.awayScore');
  if (quote) gameKeys.push('weekly.quote');

  const activeSchools = recruiting
    .filter((schoolEntry) => numeric(schoolEntry.interest) > 0 && allowedKeys.has(`recruiting.${schoolEntry.id}.interest`))
    .sort((a, b) => numeric(b.interest) - numeric(a.interest));
  const leader = activeSchools[0];
  const leaderKey = leader ? `recruiting.${leader.id}.interest` : null;

  const totalYardsPhrase = totalYards == null ? 'a newly recorded statistical line' : `${totalYards} total yards`;
  const totalTouchdownPhrase = totalTD == null ? 'no complete touchdown total recorded' : `${totalTD} total ${totalTD === 1 ? 'touchdown' : 'touchdowns'}`;
  const articles = [
    article({
      outlet: OUTLETS[0],
      headline: `${school} ${resultVerb(game?.result)} ${opponent}`,
      dek: `${playerName} finishes with ${totalYardsPhrase} and ${totalTouchdownPhrase}.`,
      paragraphs: [
        `${school} recorded a ${outcome} against ${opponent}${score ? `; the saved final score is ${score}` : ''}.`,
        `${playerName} finished with ${statLine(game)}.`,
        ...(quote ? [`Postgame: “${quote}”`] : []),
      ],
      citedFactKeys: gameKeys,
    }),
    article({
      outlet: OUTLETS[1],
      headline: `${playerName}'s latest line: ${totalYardsPhrase}`,
      dek: `The Dearborn quarterback's verified Week ${week} numbers against ${opponent}.`,
      paragraphs: [
        `${playerName} and ${school} logged a ${outcome} against ${opponent}${score ? `, ${score}` : ''}.`,
        statLine(game || {}),
      ],
      citedFactKeys: gameKeys,
    }),
    article({
      outlet: OUTLETS[2],
      headline: leader
        ? `${leader.name} leads the verified recruiting board at ${numeric(leader.interest)}%`
        : `${playerName}'s recruiting board awaits its first verified movement`,
      dek: leader
        ? `${activeSchools.length} ${activeSchools.length === 1 ? 'program has' : 'programs have'} registered interest above zero.`
        : 'No school-interest percentage has been published yet.',
      paragraphs: leader
        ? [
            `${leader.name} currently holds the highest recorded interest in ${playerName} at ${numeric(leader.interest)}%.`,
            `This report describes the saved board only; it does not project a commitment or invent private recruiting information.`,
          ]
        : [`DynastyHQ has not received a verified school-interest update for ${playerName}. The recruiting desk will remain quiet until the board changes.`],
      citedFactKeys: leaderKey
        ? ['profile.player.name', leaderKey]
        : ['profile.player.name'],
    }),
    article({
      outlet: OUTLETS[3],
      headline: `By the numbers: ${totalYardsPhrase}, ${totalTouchdownPhrase}`,
      dek: `A film-room briefing limited to the Week ${week} statistics on record.`,
      paragraphs: [
        `${playerName}'s verified line: ${statLine(game || {})}.`,
        `No formation, coverage, pressure, or blocking claim is made without corresponding charting data.`,
      ],
      citedFactKeys: gameKeys,
    }),
    article({
      outlet: OUTLETS[4],
      headline: `${playerName}'s Week ${week} performance enters the career record`,
      dek: `${school}'s ${outcome} against ${opponent} is now part of the permanent Chronicle.`,
      paragraphs: [
        `In Season ${season}, Week ${week}, ${playerName} posted ${statLine(game)} against ${opponent}.`,
        `The performance is recorded as a ${outcome}${score ? ` with a ${score} final` : ''}. Its long-term significance will be judged against future verified games, awards, and milestones.`,
      ],
      citedFactKeys: gameKeys,
    }),
  ];

  const groundedArticles = articles.map((entry) => ({
    ...entry,
    citedFactKeys: entry.citedFactKeys.filter((key) => allowedKeys.has(key)),
    groundingStatus: entry.citedFactKeys.every((key) => allowedKeys.has(key)) ? 'verified' : 'partial',
  }));

  return {
    id: publicationId,
    publicationId,
    season,
    week,
    careerPhase,
    publishedAt,
    status: 'published',
    articles: groundedArticles,
    podcastBrief: {
      title: `${school} vs. ${opponent}: the verified Week ${week} briefing`,
      summary: `${playerName}: ${statLine(game)}. ${leader ? `${leader.name} leads the saved recruiting board at ${numeric(leader.interest)}%.` : 'No recruiting leader is recorded.'}`,
      citedFactKeys: [...new Set([...gameKeys, ...(leaderKey ? [leaderKey] : [])])].filter((key) => allowedKeys.has(key)),
    },
  };
};

export const getLatestNewsroomIssue = (issues = []) => issues.length ? issues[issues.length - 1] : null;
