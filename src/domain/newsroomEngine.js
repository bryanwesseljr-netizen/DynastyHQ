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
  const resultHeadline = game?.result === 'W'
    ? `${playerName} helps ${school} turn back ${opponent}`
    : game?.result === 'L'
      ? `${school}'s Week ${week} rally ends against ${opponent}`
      : `${school} closes its Week ${week} matchup with ${opponent}`;
  const resultPerspective = game?.result === 'W'
    ? `The win gives ${school} a verified result to build on while the season record begins to take shape.`
    : game?.result === 'L'
      ? `The loss becomes part of the season story, with the next verified appearance determining how the response is measured.`
      : `The result now supplies a firm Week ${week} benchmark for the next edition.`;
  const articles = [
    article({
      outlet: OUTLETS[0],
      headline: resultHeadline,
      dek: `${playerName} finishes with ${totalYardsPhrase} and ${totalTouchdownPhrase}.`,
      paragraphs: [
        `${school} has its latest chapter on the record after a ${outcome} against ${opponent}${score ? `, with the verified final set at ${score}` : ''}. The result anchors a Week ${week} edition built from the numbers saved after the game.`,
        `${playerName} was at the center of the offensive record, finishing with ${statLine(game)}. ${totalYards == null ? 'The available fields do not support a complete total-yard calculation.' : `Together, the passing and rushing production added up to ${totalYards} total yards.`}`,
        `${seasonContext} ${resultPerspective}`,
        quote
          ? `The final word belongs to the player. In the verified postgame note, ${playerName} said, “${quote}” The statement is preserved alongside the box score as the voice of this week.`
          : `No postgame quote was verified for this edition, so The Bolt will not manufacture locker-room reaction. The story closes with the result, the individual production, and a clean statistical baseline for Week ${week + 1}.`,
      ],
      citedFactKeys: gameKeys,
    }),
    article({
      outlet: OUTLETS[1],
      headline: `${playerName}'s latest line: ${totalYardsPhrase}`,
      dek: `The Dearborn quarterback's verified Week ${week} numbers against ${opponent}.`,
      paragraphs: [
        `For the hometown record, Week ${week} belongs to a ${outcome} against ${opponent}${score ? `, recorded at ${score}` : ''}. ${playerName}'s performance gives Dearborn readers another concrete entry in a career that will be tracked one verified week at a time.`,
        `The individual line lists ${statLine(game || {})}. ${totalTD == null ? 'A complete touchdown total cannot be calculated from the fields on file.' : `That works out to ${totalTD} combined ${totalTD === 1 ? 'touchdown' : 'touchdowns'} through the air and on the ground.`}`,
        `${comparisonContext} The comparison is drawn only from appearances already preserved in the game log.`,
        `The meaning of the night will sharpen as the season grows, but the Week ${week} entry already has a permanent place in ${playerName}'s career archive. Personal claims, private conversations, and recruiting speculation remain outside the story unless they are separately verified.`,
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
            `The race is beginning to take shape: ${activeSchools.length} ${activeSchools.length === 1 ? 'program is' : 'programs are'} above zero on the verified board${activeSchools.length > 1 ? `, led by ${activeSchools.slice(0, 3).map((entry) => `${entry.name} at ${numeric(entry.interest)}%`).join(', ')}` : ''}. Those percentages describe the current board—not a projected destination.`,
            largestMovement
              ? `${largestMovement.name} recorded the week's largest verified move, ${largestMovement.change > 0 ? 'rising' : 'falling'} from ${largestMovement.previousInterest}% to ${numeric(largestMovement.interest)}%.`
              : `No week-over-week percentage change is verified for Week ${week}, making this edition the clean baseline against which the next recruiting update will be judged.`,
            `The intrigue is real, but the guardrails remain firm: this report will not project a commitment, private conversation, visit, or scholarship decision that is absent from the published Fact Ledger.`,
          ]
        : [
            `The recruiting spotlight is waiting for its first verified movement. DynastyHQ has not received a school-interest percentage for ${playerName}, so no program can yet be placed at the front of the race.`,
            `The Week ${week} Fact Ledger contains no numerical leader, scholarship change, or confirmed visit to separate one school from another. That absence is treated as unknown information—not as zero interest.`,
            `Rather than turn an empty board into a rumor cycle, the recruiting desk is leaving offers, visits, and commitment projections unreported. The story will change only when the game supplies a readable update.`,
            `A future edition will transform that new screen or confirmed entry into a week-over-week recruiting story, preserving the first real rise, fall, offer, or decision as part of the career timeline.`,
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
        `Start with the only tape substitute this edition can verify: ${playerName}'s saved line of ${statLine(game || {})}. It is the statistical foundation for every conclusion that follows.`,
        totalYards == null
          ? `The available line does not contain both passing and rushing yardage, so a complete total-yard figure is not reported. The Film Room will leave that calculation open rather than quietly treating a missing field as zero.`
          : `The recorded passing and rushing production combines for ${totalYards} total yards${totalTD == null ? '' : ` and ${totalTD} total ${totalTD === 1 ? 'touchdown' : 'touchdowns'}`}. That blend is the clearest verified snapshot of the dual-threat workload this week.`,
        `${comparisonContext} As more weeks enter the archive, this same lens will reveal genuine changes in production instead of reacting to a single box score.`,
        `No formation, coverage, pressure, or blocking claim is made without corresponding charting data. The analysis remains limited to the verified result and production, while future screenshots can add the context needed for a deeper tactical breakdown.`,
      ],
      citedFactKeys: gameKeys,
    }),
    article({
      outlet: OUTLETS[4],
      headline: `${playerName}'s Week ${week} performance enters the career record`,
      dek: `${school}'s ${outcome} against ${opponent} is now part of the permanent Chronicle.`,
      paragraphs: [
        `Another line has been added to the national résumé. In Season ${season}, Week ${week}, ${playerName} posted ${statLine(game)} against ${opponent}, giving the wider career story a new verified data point.`,
        `The performance is recorded as a ${outcome}${score ? ` with a ${score} final` : ''}. Team result and individual production now sit together in the permanent archive, ready to be measured against the weeks that follow.`,
        `${seasonContext} That running context—not a one-week hot take—will determine how the performance fits into the larger season.`,
        `The national desk treats this as verified season evidence, not as a ranking, award, injury update, or career milestone unless one of those developments is separately published. The significance will grow only when the record supports it.`,
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
