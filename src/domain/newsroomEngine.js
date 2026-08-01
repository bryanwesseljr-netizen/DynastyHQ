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

const sumRecorded = (games, key) => {
  const values = games.filter((game) => hasValue(game?.[key])).map((game) => numeric(game[key]));
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
};

const recordedAppearances = (games = [], season) => games.filter((game) => (
  Number(game?.season || 1) === Number(season || 1) && game?.didPlay !== false
));

const seasonSummary = ({ games, playerName }) => {
  if (!games.length) return `${playerName}'s current performance is the first recorded appearance in this season's verified game log.`;

  const wins = games.filter((game) => game.result === 'W').length;
  const losses = games.filter((game) => game.result === 'L').length;
  const passYds = sumRecorded(games, 'passYds');
  const rushYds = sumRecorded(games, 'rushYds');
  const pieces = [];
  if (passYds != null) pieces.push(`${passYds} passing yards`);
  if (rushYds != null) pieces.push(`${rushYds} rushing yards`);
  const production = pieces.length ? ` The published ledger contains ${pieces.join(' and ')} across those appearances.` : '';
  return `Through ${games.length} recorded ${games.length === 1 ? 'appearance' : 'appearances'}, the team is ${wins}-${losses} in games attached to ${playerName}'s season log.${production}`;
};

const weekComparison = ({ previousGame, game, playerName }) => {
  if (!previousGame) return `With no earlier verified appearance available for comparison, Week ${game?.week || 1} establishes ${playerName}'s first game-to-game benchmark.`;
  const previousTotal = combinedValue(previousGame.passYds, previousGame.rushYds);
  const currentTotal = combinedValue(game?.passYds, game?.rushYds);
  if (previousTotal == null || currentTotal == null) {
    return `The previous game against ${previousGame.opponent || 'the prior opponent'} remains in the archive, but the recorded numbers do not support a complete total-yard comparison.`;
  }
  if (currentTotal === previousTotal) {
    return `${playerName} matched the previous game's ${previousTotal} total yards, following the appearance against ${previousGame.opponent || 'the prior opponent'}.`;
  }
  const direction = currentTotal > previousTotal ? 'increased' : 'decreased';
  return `${playerName}'s recorded total-yard output ${direction} by ${Math.abs(currentTotal - previousTotal)}, moving from ${previousTotal} against ${previousGame.opponent || 'the prior opponent'} to ${currentTotal} this week.`;
};

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
  previousRecruiting = [],
  previousGames = [],
  quote = '',
  availableFactKeys = [],
  currentFactKeys = availableFactKeys,
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
  const currentKeys = new Set(currentFactKeys);
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
  const recruitingKeys = activeSchools.map((entry) => `recruiting.${entry.id}.interest`);
  const previousInterest = new Map(previousRecruiting.map((entry) => [String(entry.id), numeric(entry.interest)]));
  const verifiedMovements = activeSchools
    .filter((entry) => currentKeys.has(`recruiting.${entry.id}.interest`) && previousInterest.has(String(entry.id)))
    .map((entry) => ({
      ...entry,
      previousInterest: previousInterest.get(String(entry.id)),
      change: numeric(entry.interest) - previousInterest.get(String(entry.id)),
    }))
    .filter((entry) => entry.change !== 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  const largestMovement = verifiedMovements[0];

  const priorSeasonGames = recordedAppearances(previousGames, season);
  const currentSeasonGames = [...priorSeasonGames, { ...(game || {}), season }];
  const previousGame = priorSeasonGames[priorSeasonGames.length - 1];
  const seasonContext = seasonSummary({ games: currentSeasonGames, playerName });
  const comparisonContext = weekComparison({ previousGame, game: { ...(game || {}), week }, playerName });

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
        seasonContext,
        quote
          ? `In the verified postgame note, ${playerName} said, “${quote}”`
          : `No postgame quote was verified for this edition, so the record closes with the result and individual numbers on file.`,
      ],
      citedFactKeys: gameKeys,
    }),
    article({
      outlet: OUTLETS[1],
      headline: `${playerName}'s latest line: ${totalYardsPhrase}`,
      dek: `The Dearborn quarterback's verified Week ${week} numbers against ${opponent}.`,
      paragraphs: [
        `${playerName} and ${school} logged a ${outcome} against ${opponent}${score ? `, ${score}` : ''}.`,
        `The verified individual line lists ${statLine(game || {})}.`,
        comparisonContext,
        `For the Dearborn record, this edition preserves the Week ${week} performance as published and leaves unverified personal or recruiting claims outside the story.`,
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
            `${activeSchools.length} ${activeSchools.length === 1 ? 'program is' : 'programs are'} above zero on the verified board${activeSchools.length > 1 ? `, led by ${activeSchools.slice(0, 3).map((entry) => `${entry.name} at ${numeric(entry.interest)}%`).join(', ')}` : ''}.`,
            largestMovement
              ? `${largestMovement.name} recorded the week's largest verified move, ${largestMovement.change > 0 ? 'rising' : 'falling'} from ${largestMovement.previousInterest}% to ${numeric(largestMovement.interest)}%.`
              : `No week-over-week percentage change is verified for Week ${week}; the desk is reporting the saved board as it currently stands.`,
            `This report does not project a commitment, private conversation, visit, or scholarship decision that is absent from the published Fact Ledger.`,
          ]
        : [
            `DynastyHQ has not received a verified school-interest percentage for ${playerName}.`,
            `The Week ${week} Fact Ledger therefore contains no program that can be identified as a recruiting leader.`,
            `Rather than convert a missing update into a rumor, the recruiting desk is leaving offers, visits, and commitment projections unreported.`,
            `A future edition will update this board when a readable recruiting screen or confirmed manual entry supplies new verified information.`,
          ],
      citedFactKeys: leaderKey
        ? ['profile.player.name', ...recruitingKeys]
        : ['profile.player.name'],
    }),
    article({
      outlet: OUTLETS[3],
      headline: `By the numbers: ${totalYardsPhrase}, ${totalTouchdownPhrase}`,
      dek: `A film-room briefing limited to the Week ${week} statistics on record.`,
      paragraphs: [
        `${playerName}'s verified line: ${statLine(game || {})}.`,
        totalYards == null
          ? `The available line does not contain both passing and rushing yardage, so a complete total-yard figure is not reported.`
          : `The recorded passing and rushing production combines for ${totalYards} total yards${totalTD == null ? '' : ` and ${totalTD} total ${totalTD === 1 ? 'touchdown' : 'touchdowns'}`}.`,
        comparisonContext,
        `No formation, coverage, pressure, or blocking claim is made without corresponding charting data; this analysis is limited to the verified result and box-score production.`,
      ],
      citedFactKeys: gameKeys,
    }),
    article({
      outlet: OUTLETS[4],
      headline: `${playerName}'s Week ${week} performance enters the career record`,
      dek: `${school}'s ${outcome} against ${opponent} is now part of the permanent Chronicle.`,
      paragraphs: [
        `In Season ${season}, Week ${week}, ${playerName} posted ${statLine(game)} against ${opponent}.`,
        `The performance is recorded as a ${outcome}${score ? ` with a ${score} final` : ''}, placing the team result beside the individual line in the permanent archive.`,
        seasonContext,
        `The national desk treats this as verified season context—not as a ranking, award, injury update, or career milestone unless one of those developments is separately published.`,
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
