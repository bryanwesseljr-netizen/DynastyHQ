import { createCollegeOutletSet } from './collegeNewsroom.js';
import { HIGH_SCHOOL_MOMENT_TYPES, normalizeHighSchoolEvaluation, summarizeHighSchoolMoments } from './highSchoolEvaluation.js';

const OUTLETS = [
  { id: 'bolt', name: 'The Bolt', desk: 'School Desk', theme: 'broadsheet' },
  { id: 'local', name: 'Dearborn Chronicle', desk: 'Local Sports', theme: 'local' },
  { id: 'recruiting', name: 'The Recruiting Wire', desk: 'Recruiting Desk', theme: 'on3' },
  { id: 'filmroom', name: "The Film Room", desk: 'Numbers & Tactics', theme: 'filmroom' },
  { id: 'national', name: 'Saturday National', desk: 'National Desk', theme: 'national' },
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

const rtgWeeklyContext = ({ rtg = {}, previousRtg = {}, currentKeys = new Set(), playerName }) => {
  const verified = (key) => hasValue(rtg[key]) && currentKeys.has(`rtg.${key}`);
  const keys = [];
  const onField = (key) => {
    keys.push(`rtg.${key}`);
    return rtg[key];
  };
  const delta = (key) => verified(key) && hasValue(previousRtg[key])
    ? numeric(rtg[key]) - numeric(previousRtg[key])
    : null;
  const signed = (value, money = false) => {
    if (value === null || value === 0) return '';
    const amount = `${value > 0 ? '+' : '−'}${Math.abs(value).toLocaleString()}`;
    return ` (${money ? '$' : ''}${amount} this week)`;
  };

  const playerPieces = [];
  if (verified('rank')) playerPieces.push(`${onField('rank')} on the depth chart`);
  if (verified('coachTrust')) playerPieces.push(`${numeric(onField('coachTrust')).toLocaleString()} Coach Trust${signed(delta('coachTrust'))}`);
  if (verified('gpa')) playerPieces.push(`a ${numeric(onField('gpa')).toFixed(1)} GPA`);
  if (verified('energy')) playerPieces.push(`${numeric(onField('energy'))} energy`);
  if (verified('skillPoints')) playerPieces.push(`${numeric(onField('skillPoints'))} available skill ${numeric(rtg.skillPoints) === 1 ? 'point' : 'points'}`);

  const brandPieces = [];
  if (verified('followers')) brandPieces.push(`${numeric(onField('followers')).toLocaleString()} followers${signed(delta('followers'))}`);
  if (verified('valuation')) brandPieces.push(`a $${numeric(onField('valuation')).toLocaleString()} NIL valuation${signed(delta('valuation'), true)}`);

  if (!playerPieces.length && !brandPieces.length) return null;
  const sentences = [];
  if (playerPieces.length) sentences.push(`Beyond the box score, ${playerName}'s verified RTG snapshot lists ${playerPieces.join(', ')}.`);
  if (brandPieces.length) sentences.push(`The recorded brand footprint stands at ${brandPieces.join(' and ')}.`);
  sentences.push('Those values now travel with the weekly game line, creating a permanent season-and-career progression record rather than a one-time status entry.');
  return { paragraph: sentences.join(' '), keys };
};

const article = ({ outlet, headline, dek, paragraphs, citedFactKeys }) => ({
  id: outlet.id,
  outletId: outlet.id,
  outletName: outlet.name,
  desk: outlet.desk,
  theme: outlet.theme || outlet.id,
  headline,
  dek,
  paragraphs,
  citedFactKeys: [...new Set(citedFactKeys)],
});

const signedMovement = (value, suffix = '') => {
  if (value === null || value === 0) return value === 0 ? `no change${suffix}` : 'change not available';
  return `${value > 0 ? '+' : '−'}${Math.abs(value).toLocaleString()}${suffix}`;
};

export const createHighSchoolEvaluationIssue = ({
  publicationId,
  season,
  week,
  careerPhase,
  player,
  game,
  recruiting = [],
  previousRecruiting = [],
  playerRecruiting = {},
  availableFactKeys = [],
  currentFactKeys = availableFactKeys,
  publishedAt,
}) => {
  const evaluation = normalizeHighSchoolEvaluation(game?.evaluation || {}, {
    gameNumber: week,
    tapeScoreBefore: playerRecruiting?.highSchool?.tapeScore || 0,
    recruitStarsBefore: player?.stars || 3,
  });
  const summary = summarizeHighSchoolMoments(evaluation);
  const playerName = player?.name || 'The quarterback';
  const allowedKeys = new Set(availableFactKeys);
  const currentKeys = new Set(currentFactKeys);
  const evaluationKeys = [...allowedKeys].filter((key) => key.startsWith('highSchool.') || key.startsWith('recruiting.profile.'));
  const momentKeys = evaluationKeys.filter((key) => key.startsWith('highSchool.moment.'));
  const schools = recruiting
    .filter((entry) => entry?.name)
    .sort((a, b) => numeric(a.preferenceRank || a.customOrder || 999) - numeric(b.preferenceRank || b.customOrder || 999));
  const previousSchools = new Map(previousRecruiting.map((entry) => [String(entry.id), entry]));
  const newOffers = schools.filter((entry) => entry.offered
    && currentKeys.has(`recruiting.${entry.id}.offer`)
    && !previousSchools.get(String(entry.id))?.offered);
  const recruitingKeys = schools.flatMap((entry) => [
    `recruiting.${entry.id}.preferenceRank`,
    `recruiting.${entry.id}.progressStage`,
    `recruiting.${entry.id}.offer`,
    `recruiting.${entry.id}.schemeFit`,
  ]).filter((key) => allowedKeys.has(key));
  const ratingAfter = evaluation.recruitStarsAfter || playerRecruiting?.highSchool?.recruitStars || player?.stars || 3;
  const tapeAfter = evaluation.tapeScoreAfter;
  const outcomeText = `${summary.success} successful, ${summary.partial} partial, and ${summary.failed} failed`;
  const scholarshipChallenges = evaluation.moments.filter((moment) => moment.type === HIGH_SCHOOL_MOMENT_TYPES.SCHOLARSHIP);
  const objectiveDetails = evaluation.moments.flatMap((moment) => {
    const isScholarship = moment.type === HIGH_SCHOOL_MOMENT_TYPES.SCHOLARSHIP;
    const momentLabel = isScholarship
      ? `Moment ${moment.id} Scholarship Challenge${moment.scholarshipSchool ? ` for ${moment.scholarshipSchool}` : ''}`
      : `Moment ${moment.id}`;
    return moment.objectives.slice(0, isScholarship ? 1 : 2)
      .filter((objective) => objective.text || objective.result)
      .map((objective) => `${momentLabel}, ${isScholarship ? 'major objective' : `objective ${objective.id}`}${objective.text ? ` “${objective.text}”` : ''}: ${objective.result || 'result not entered'}`);
  });
  const momentFormatText = scholarshipChallenges.length
    ? `${4 - scholarshipChallenges.length} standard two-objective moment${4 - scholarshipChallenges.length === 1 ? '' : 's'} and ${scholarshipChallenges.length} one-objective Scholarship Challenge${scholarshipChallenges.length === 1 ? '' : 's'}`
    : 'four standard two-objective moments';
  const ratingMovement = summary.starDelta === 0
    ? `remained at ${ratingAfter} stars`
    : summary.starDelta === null
      ? `is recorded at ${ratingAfter} stars`
      : `moved ${summary.starDelta > 0 ? 'up' : 'down'} from ${evaluation.recruitStarsBefore} to ${ratingAfter} stars`;
  const tapeMovement = summary.tapeScoreDelta === null
    ? `finished at ${Number(tapeAfter || 0).toLocaleString()}`
    : `moved from ${Number(evaluation.tapeScoreBefore || 0).toLocaleString()} to ${Number(tapeAfter || 0).toLocaleString()} (${signedMovement(summary.tapeScoreDelta)})`;
  const baseKeys = ['profile.player.name', 'profile.player.school', ...evaluationKeys].filter((key) => allowedKeys.has(key));

  const articles = [
    article({
      outlet: OUTLETS[0],
      headline: `${playerName} completes Game ${evaluation.gameNumber} of the five-game tape evaluation`,
      dek: `Four playable moments produced ${outcomeText} outcomes; the verified Tape Score ${tapeMovement}.`,
      paragraphs: [
        `${playerName}'s high-school recruiting journey advanced through Game ${evaluation.gameNumber}, with ${momentFormatText} preserved in the weekly record. The overall results were ${outcomeText}.`,
        objectiveDetails.length
          ? `The recorded objectives were ${objectiveDetails.join('; ')}.`
          : `The outcome of each moment is verified, while objective descriptions were left blank rather than reconstructed from memory.`,
        `The game-displayed Tape Score ${tapeMovement}. DynastyHQ records that verified before-and-after movement without assigning an invented point value to any individual moment.`,
        `The recruiting rating ${ratingMovement}. That movement affects the recruiting story, not the player's prebuilt attribute profile.`,
      ],
      citedFactKeys: baseKeys,
    }),
    article({
      outlet: OUTLETS[1],
      headline: `${playerName}'s local recruiting profile ${ratingMovement}`,
      dek: `Dearborn's quarterback has completed ${evaluation.gameNumber} of five high-school evaluation games.`,
      paragraphs: [
        `The local recruiting record now contains ${evaluation.gameNumber} completed evaluation game${evaluation.gameNumber === 1 ? '' : 's'} for ${playerName}. Unlike a traditional box score, this phase is measured through ${momentFormatText} and the Tape Score shown afterward.`,
        `Game ${evaluation.gameNumber} closed with ${summary.success} successful moment${summary.success === 1 ? '' : 's'}, ${summary.partial} partial result${summary.partial === 1 ? '' : 's'}, and ${summary.failed} failed moment${summary.failed === 1 ? '' : 's'}.`,
        `The Tape Score ${tapeMovement}, while the recruiting rating ${ratingMovement}. Those are the verified markers used to describe week-to-week momentum.`,
        evaluation.teamImpact
          ? `The verified Team Impact note reads: ${evaluation.teamImpact}`
          : `No separate Team Impact play was entered, so the local desk will not invent a highlight, final score, or statistical line.`,
      ],
      citedFactKeys: baseKeys,
    }),
    article({
      outlet: OUTLETS[2],
      headline: newOffers.length
        ? `${newOffers[0].name} adds an offer after Game ${evaluation.gameNumber}`
        : `${playerName}'s Tape Score reaches ${Number(tapeAfter || 0).toLocaleString()} after Game ${evaluation.gameNumber}`,
      dek: newOffers.length
        ? `${newOffers.length} newly verified scholarship ${newOffers.length === 1 ? 'offer changes' : 'offers change'} the board.`
        : `The latest game-supplied recruiting snapshot is preserved without interest percentages or projections.`,
      paragraphs: [
        `Recruiting evaluation remains tied to the film record: the Tape Score ${tapeMovement}, and the player rating ${ratingMovement}.`,
        newOffers.length
          ? `${newOffers.map((entry) => entry.name).join(', ')} ${newOffers.length === 1 ? 'has' : 'have'} joined the verified scholarship offer list.`
          : `No new scholarship offer was verified in this edition, so the board remains unchanged unless a separate game screen supplies an update.`,
        schools.length
          ? `The saved personal preference order begins ${schools.slice(0, 3).map((entry, index) => `${entry.preferenceRank || entry.customOrder || index + 1}. ${entry.name}`).join(', ')}.`
          : `No ordered Top Schools list is attached to this edition.`,
        `Scholarship thresholds differ by school. DynastyHQ will compare the verified Tape Score with visible requirements, but it will not convert moment outcomes into a predicted offer or commitment.`,
      ],
      citedFactKeys: [...baseKeys, ...recruitingKeys],
    }),
    article({
      outlet: OUTLETS[3],
      headline: `Tape review: ${outcomeText} moments in Game ${evaluation.gameNumber}`,
      dek: `Objective outcomes and verified Team Impact replace unsupported high-school box-score analysis.`,
      paragraphs: [
        `The Film Room begins with ${momentFormatText}, not passing yards or touchdowns: ${outcomeText} overall results were recorded.`,
        objectiveDetails.length
          ? `The objective ledger allows a moment-by-moment review: ${objectiveDetails.join('; ')}.`
          : `No objective text was saved, so the review is limited to each moment's successful, partial, or failed result.`,
        evaluation.teamImpact
          ? `The additional verified Team Impact entry is ${evaluation.teamImpact}. It is presented as entered and is not assigned an invented Tape Score value.`
          : `No additional Team Impact entry was verified for this game.`,
        `Standard moments resolve from two objective results, while a Scholarship Challenge uses one major pass-or-fail objective. The only numeric evaluation reported here is the game-displayed Tape Score: ${Number(tapeAfter || 0).toLocaleString()}.`,
      ],
      citedFactKeys: [...baseKeys, ...momentKeys],
    }),
    article({
      outlet: OUTLETS[4],
      headline: `${playerName}'s national recruiting résumé advances to Game ${evaluation.gameNumber}`,
      dek: `${ratingAfter}-star rating · ${Number(tapeAfter || 0).toLocaleString()} Tape Score · ${5 - evaluation.gameNumber} evaluation game${5 - evaluation.gameNumber === 1 ? '' : 's'} remaining.`,
      paragraphs: [
        `The national snapshot after Game ${evaluation.gameNumber} lists ${playerName} at ${ratingAfter} stars with a Tape Score of ${Number(tapeAfter || 0).toLocaleString()}.`,
        `That profile follows a four-moment performance containing ${outcomeText} outcomes across ${momentFormatText}. It is a recruiting evaluation record, not a traditional statistical résumé.`,
        playerRecruiting?.highSchool?.rankings?.national
          ? `The verified ranking snapshot places ${playerName} No. ${playerRecruiting.highSchool.rankings.national} nationally, No. ${playerRecruiting.highSchool.rankings.state || '—'} in the state, and No. ${playerRecruiting.highSchool.rankings.position || '—'} at the position.`
          : `No complete national, state, and position ranking snapshot was verified for this edition.`,
        `The national desk will not invent final scores, passing statistics, awards, or scouting claims. Future movement will come from the remaining game moments and game-supplied recruiting screens.`,
      ],
      citedFactKeys: baseKeys,
    }),
  ];

  const groundedArticles = articles.map((entry) => ({
    ...entry,
    citedFactKeys: [...new Set(entry.citedFactKeys)].filter((key) => allowedKeys.has(key)),
    groundingStatus: entry.citedFactKeys.every((key) => allowedKeys.has(key)) ? 'verified' : 'partial',
  }));
  return {
    id: publicationId,
    publicationId,
    season,
    week,
    label: `High-school Game ${evaluation.gameNumber}`,
    editionType: 'high-school-evaluation',
    careerPhase,
    publishedAt,
    status: 'published',
    outletProfile: null,
    articles: groundedArticles,
    podcastBrief: {
      title: `${playerName}'s Game ${evaluation.gameNumber} tape review`,
      summary: `${outcomeText} moments. Tape Score ${tapeMovement}. Recruiting rating ${ratingMovement}.${newOffers.length ? ` New verified offer: ${newOffers.map((entry) => entry.name).join(', ')}.` : ''}`,
      citedFactKeys: [...new Set([...baseKeys, ...recruitingKeys])].filter((key) => allowedKeys.has(key)),
    },
  };
};

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
  rtg = {},
  previousRtg = {},
  playerRecruiting = {},
  collegeNewsroom = {},
  coverageStage = '',
  availableFactKeys = [],
  currentFactKeys = availableFactKeys,
  publishedAt,
}) => {
  if (game?.stage === 'high-school' || game?.evaluation) {
    return createHighSchoolEvaluationIssue({
      publicationId, season, week, careerPhase, player, game, recruiting, previousRecruiting,
      playerRecruiting, availableFactKeys, currentFactKeys, publishedAt,
    });
  }
  const playerName = player?.name || 'The quarterback';
  const school = player?.school || 'the program';
  const currentCollege = player?.college || school;
  const isCollegePlayer = coverageStage
    ? coverageStage === 'college'
    : Boolean(player?.isCommitted && (Number(season) > 1 || String(player?.school || '').toLowerCase() === String(player?.college || '').toLowerCase()));
  const collegeOutlets = createCollegeOutletSet(collegeNewsroom, school);
  const primaryOutlet = isCollegePlayer ? collegeOutlets[0] : OUTLETS[0];
  const secondaryOutlet = isCollegePlayer ? collegeOutlets[1] : OUTLETS[1];
  const filmRoomOutlet = isCollegePlayer ? collegeOutlets[2] : OUTLETS[3];
  const nationalOutlet = isCollegePlayer ? collegeOutlets[3] : OUTLETS[4];
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

  const topSchools = (isCollegePlayer ? [] : recruiting)
    .filter((entry) => entry?.name && [
      'preferenceRank', 'progressStage', 'offer', 'schemeFit', 'tapeScoreRequired', 'projectedRole',
    ].some((field) => allowedKeys.has(`recruiting.${entry.id}.${field}`)))
    .sort((a, b) => numeric(a.preferenceRank || a.customOrder || 999) - numeric(b.preferenceRank || b.customOrder || 999));
  const topChoice = topSchools[0];
  const recruitingKeys = topSchools.flatMap((entry) => [
    `recruiting.${entry.id}.preferenceRank`,
    `recruiting.${entry.id}.progressStage`,
    `recruiting.${entry.id}.offer`,
  ]).filter((key) => allowedKeys.has(key));
  const previousSchools = new Map(previousRecruiting.map((entry) => [String(entry.id), entry]));
  const newOffers = (isCollegePlayer ? [] : recruiting).filter((entry) => (
    entry.offered
    && currentKeys.has(`recruiting.${entry.id}.offer`)
    && !previousSchools.get(String(entry.id))?.offered
  ));
  const offerKeys = newOffers.map((entry) => `recruiting.${entry.id}.offer`);
  const progressChanges = topSchools.filter((entry) => {
    const previous = previousSchools.get(String(entry.id));
    return previous && previous.progressStage !== entry.progressStage
      && currentKeys.has(`recruiting.${entry.id}.progressStage`);
  });
  const tapeScore = numeric(playerRecruiting?.highSchool?.tapeScore);
  const tapeScoreKey = 'recruiting.profile.tapeScore';

  const priorSeasonGames = recordedAppearances(previousGames, season);
  const currentSeasonGames = [...priorSeasonGames, { ...(game || {}), season }];
  const previousGame = priorSeasonGames[priorSeasonGames.length - 1];
  const seasonContext = seasonSummary({ games: currentSeasonGames, playerName });
  const comparisonContext = weekComparison({ previousGame, game: { ...(game || {}), week }, playerName });
  const rtgContext = rtgWeeklyContext({ rtg, previousRtg, currentKeys, playerName });

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
      outlet: primaryOutlet,
      headline: resultHeadline,
      dek: `${playerName} finishes with ${totalYardsPhrase} and ${totalTouchdownPhrase}.`,
      paragraphs: [
        `${school} has its latest chapter on the record after a ${outcome} against ${opponent}${score ? `, with the verified final set at ${score}` : ''}. The result anchors a Week ${week} edition built from the numbers saved after the game.`,
        `${playerName} was at the center of the offensive record, finishing with ${statLine(game)}. ${totalYards == null ? 'The available fields do not support a complete total-yard calculation.' : `Together, the passing and rushing production added up to ${totalYards} total yards.`}`,
        `${seasonContext} ${resultPerspective}`,
        quote
          ? `The final word belongs to the player. In the verified postgame note, ${playerName} said, “${quote}” The statement is preserved alongside the box score as the voice of this week.`
          : `No postgame quote was verified for this edition, so ${primaryOutlet.name} will not manufacture locker-room reaction. The story closes with the result, the individual production, and a clean statistical baseline for Week ${week + 1}.`,
      ],
      citedFactKeys: gameKeys,
    }),
    article({
      outlet: secondaryOutlet,
      headline: `${playerName}'s latest line: ${totalYardsPhrase}`,
      dek: isCollegePlayer
        ? `${school}'s verified Week ${week} performance in the regional college-football picture.`
        : `The Dearborn quarterback's verified Week ${week} numbers against ${opponent}.`,
      paragraphs: [
        isCollegePlayer
          ? `For the regional record, Week ${week} belongs to a ${outcome} against ${opponent}${score ? `, recorded at ${score}` : ''}. ${playerName}'s performance gives ${secondaryOutlet.name} another concrete entry in a college career tracked one verified week at a time.`
          : `For the hometown record, Week ${week} belongs to a ${outcome} against ${opponent}${score ? `, recorded at ${score}` : ''}. ${playerName}'s performance gives Dearborn readers another concrete entry in a career that will be tracked one verified week at a time.`,
        `The individual line lists ${statLine(game || {})}. ${totalTD == null ? 'A complete touchdown total cannot be calculated from the fields on file.' : `That works out to ${totalTD} combined ${totalTD === 1 ? 'touchdown' : 'touchdowns'} through the air and on the ground.`}`,
        `${comparisonContext} The comparison is drawn only from appearances already preserved in the game log.`,
        rtgContext?.paragraph
          || `The meaning of the night will sharpen as the season grows, but the Week ${week} entry already has a permanent place in ${playerName}'s career archive. Personal claims, private conversations, and recruiting speculation remain outside the story unless they are separately verified.`,
      ],
      citedFactKeys: [...gameKeys, ...(rtgContext?.keys || [])],
    }),
    !isCollegePlayer ? article({
      outlet: OUTLETS[2],
      headline: isCollegePlayer
        ? `${playerName}'s transfer desk remains quiet at ${currentCollege}`
        : newOffers.length
          ? `${newOffers[0].name} adds a verified offer to ${playerName}'s recruitment`
        : topSchools.length
        ? `${playerName}'s ordered Top ${topSchools.length} develops after Week ${week}`
        : `${playerName}'s recruiting board awaits its first verified update`,
      dek: isCollegePlayer
        ? 'No transfer decision is active; the high-school recruiting board remains archived.'
        : newOffers.length
          ? `${newOffers.length} new scholarship ${newOffers.length === 1 ? 'offer is' : 'offers are'} confirmed in the Week ${week} Fact Ledger.`
        : topSchools.length
        ? `${topSchools.length} school${topSchools.length === 1 ? ' is' : 's are'} recorded in the game-supplied preference order${currentKeys.has(tapeScoreKey) ? ` at a Tape Score of ${tapeScore}` : ''}.`
        : 'No Top Schools list or scholarship offer has been published yet.',
      paragraphs: isCollegePlayer
        ? [
            `${playerName} remains enrolled at ${currentCollege}, and DynastyHQ has no active transfer decision on record for this weekly edition.`,
            `The Top 10 order, progress bars, Scheme Fit values, and scholarship offers from the five-game high-school process are preserved as history, not reused as current college recruiting data.`,
            `Because no portal process is active, the Recruiting Wire will not invent outreach, destinations, projected roles, or private conversations.`,
            `If a real transfer decision appears in CFB 27, the separate Transfer Hub can be opened for that decision and closed again without changing schools if ${playerName} stays.`,
          ]
        : newOffers.length
          ? [
              `${newOffers.map((entry) => entry.name).join(', ')} ${newOffers.length === 1 ? 'has' : 'have'} joined the verified offer list for ${playerName} after the latest high-school performance.`,
              topChoice
                ? `${topChoice.name} is No. 1 in the player's personal preference order; that position does not claim the school is the recruiting leader. The board now contains ${recruiting.filter((entry) => entry.offered).length} confirmed scholarship ${recruiting.filter((entry) => entry.offered).length === 1 ? 'offer' : 'offers'}.`
                : `The offer is verified, but no ordered Top Schools list is available in the published facts.`,
              progressChanges.length
                ? `${progressChanges.map((entry) => entry.name).join(', ')} also ${progressChanges.length === 1 ? 'shows' : 'show'} a verified change in the game-displayed progress bar.`
                : `No separate progress-bar change is verified, so the scholarship development stands as the week's primary recruiting movement.`,
              `Every offer, progress bar, and preference rank remains tied to a game-supplied screen. No interest percentage, visit, private conversation, or commitment projection is invented.`,
            ]
        : topSchools.length
        ? [
            `${topChoice.name} is No. 1 on ${playerName}'s personal Top Schools list. The ranking records the player's preference—not which program is recruiting him most aggressively.`,
            `The verified order currently begins ${topSchools.slice(0, 3).map((entry, index) => `${entry.preferenceRank || entry.customOrder || index + 1}. ${entry.name}`).join(', ')}${topSchools.length > 3 ? `, with ${topSchools.length - 3} more school${topSchools.length - 3 === 1 ? '' : 's'} on the board` : ''}.`,
            progressChanges.length
              ? `${progressChanges.map((entry) => entry.name).join(', ')} ${progressChanges.length === 1 ? 'has' : 'have'} a newly verified recruiting-progress state this week.`
              : `No week-over-week progress-bar change is verified for Week ${week}, making this edition the clean baseline for the next update.`,
            `The intrigue is real, but the guardrails remain firm: this report will not project a commitment, private conversation, visit, or scholarship decision that is absent from the published Fact Ledger.`,
          ]
        : [
            `The recruiting spotlight is waiting for its first verified update. DynastyHQ has not received an ordered Top Schools list for ${playerName}, so no program can yet be placed in the player's preference order.`,
            `The Week ${week} Fact Ledger contains no Top 10 order, scholarship change, or school overview. That absence is treated as unknown information—not as zero interest.`,
            `Rather than turn an empty board into a rumor cycle, the recruiting desk is leaving offers, visits, and commitment projections unreported. The story will change only when the game supplies a readable update.`,
            `A future edition will transform that new screen into a verified Top 10, progress-bar, Scheme Fit, offer, Top 3, or commitment update in the career timeline.`,
          ],
      citedFactKeys: isCollegePlayer
        ? ['profile.player.name', 'profile.player.college']
        : newOffers.length
          ? ['profile.player.name', ...offerKeys, ...recruitingKeys]
        : topSchools.length
        ? ['profile.player.name', ...recruitingKeys, ...(currentKeys.has(tapeScoreKey) ? [tapeScoreKey] : [])]
        : ['profile.player.name'],
    }) : null,
    article({
      outlet: filmRoomOutlet,
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
      outlet: nationalOutlet,
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
  ].filter(Boolean);

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
    outletProfile: isCollegePlayer ? {
      school,
      localOutletName: primaryOutlet.name,
      regionalOutletName: secondaryOutlet.name,
      nationalOutletName: nationalOutlet.name,
    } : null,
    articles: groundedArticles,
    podcastBrief: {
      title: `${school} vs. ${opponent}: the verified Week ${week} briefing`,
      summary: `${playerName}: ${statLine(game)}. ${rtgContext ? 'The weekly RTG and NIL snapshot is preserved with the performance.' : ''} ${isCollegePlayer ? 'No transfer decision is active.' : (topChoice ? `${topChoice.name} is first in the saved personal preference order.` : 'No Top Schools order is recorded.')}`.replace(/\s+/g, ' ').trim(),
      citedFactKeys: [...new Set([...gameKeys, ...(rtgContext?.keys || []), ...recruitingKeys])].filter((key) => allowedKeys.has(key)),
    },
  };
};

export const getLatestNewsroomIssue = (issues = []) => issues.length ? issues[issues.length - 1] : null;

export const createRecruitingNewsroomIssue = ({
  publicationId,
  season = 1,
  week = 0,
  player = {},
  playerRecruiting = {},
  recruiting = [],
  previousRecruiting = [],
  currentFactKeys = [],
  publishedAt = new Date().toISOString(),
}) => {
  const playerName = player.name || 'The quarterback';
  const profile = playerRecruiting?.highSchool || {};
  const schools = [...recruiting]
    .filter((entry) => entry?.name)
    .sort((a, b) => numeric(a.preferenceRank || a.customOrder || 999) - numeric(b.preferenceRank || b.customOrder || 999));
  const previous = new Map(previousRecruiting.map((entry) => [String(entry.id), entry]));
  const newOffers = schools.filter((entry) => entry.offered && !previous.get(String(entry.id))?.offered);
  const hasTopTen = schools.length > 0;
  const rankingText = [
    profile.rankings?.national ? `No. ${profile.rankings.national} nationally` : '',
    profile.rankings?.state ? `No. ${profile.rankings.state} in the state` : '',
    profile.rankings?.position ? `No. ${profile.rankings.position} at his position` : '',
  ].filter(Boolean).join(', ');
  const headline = newOffers.length
    ? `${newOffers[0].name} extends a verified scholarship offer to ${playerName}`
    : hasTopTen
      ? `${playerName} reveals an ordered Top ${schools.length}`
      : `${playerName} opens the five-game recruiting evaluation`;
  const paragraphs = newOffers.length
    ? [
        `${newOffers.map((entry) => entry.name).join(', ')} ${newOffers.length === 1 ? 'has' : 'have'} officially joined ${playerName}'s scholarship offer list.`,
        `${schools[0]?.name || newOffers[0].name} is currently first in the player's personal preference order. That order does not represent which school is recruiting him most aggressively.`,
        `The offer details, including any visible annual bonuses, are preserved on the school overview. Standard letter language is not treated as a verified player evaluation.`,
        `DynastyHQ will not invent interest percentages, visits, private conversations, or a commitment projection.`,
      ]
    : hasTopTen
      ? [
          `${playerName}'s personal list currently begins ${schools.slice(0, 3).map((entry) => `${entry.preferenceRank || entry.customOrder}. ${entry.name}`).join(', ')}${schools.length > 3 ? `, with ${schools.length - 3} additional school${schools.length - 3 === 1 ? '' : 's'} recorded` : ''}.`,
          `The list is a preference ranking selected by the player. The game-displayed recruiting bars are stored as nonnumeric progress states, not converted into invented percentages.`,
          `${profile.tapeScore !== '' && profile.tapeScore !== undefined ? `The current Tape Score is ${numeric(profile.tapeScore).toLocaleString()}.` : 'No Tape Score was verified in this update.'} ${rankingText ? `The saved rankings list ${rankingText}.` : 'No ranking values were verified in this update.'}`,
          `Scheme Fit, scholarship requirements, projected role, team ratings, coaches, depth-chart competition, and offer bonuses appear only when a school overview or offer screen verifies them.`,
        ]
      : [
          `${profile.recruitStars || player.stars || 3}-star ${player.pos || 'quarterback'} ${playerName} begins the five-game high-school evaluation period with a Tape Score of ${numeric(profile.tapeScore).toLocaleString()}.`,
          rankingText ? `The initial recruiting update lists ${rankingText}.` : `No national, state, or position ranking has been verified yet.`,
          `No Top Schools list or scholarship offer is on file in this edition. That information remains unknown rather than being treated as zero interest.`,
          `Future verified screens will update the ordered Top 10, progress states, Scheme Fit, scholarship requirements, offers, Top 3, and Signing Day decision.`,
        ];
  const citedFactKeys = [...new Set(['profile.player.name', ...currentFactKeys])];
  return {
    id: publicationId,
    publicationId,
    season,
    week,
    label: week === 0 ? 'Preseason recruiting' : `Recruiting update ${week}`,
    careerPhase: 'Player',
    publishedAt,
    status: 'published',
    editionType: 'recruiting',
    articles: [article({
      outlet: OUTLETS[2],
      headline,
      dek: newOffers.length
        ? `${newOffers.length} official scholarship ${newOffers.length === 1 ? 'offer is' : 'offers are'} now verified.`
        : hasTopTen
          ? `The game-supplied preference order is preserved without invented interest percentages.`
          : `The first verified recruiting baseline is now on the record.`,
      paragraphs,
      citedFactKeys,
    })].map((entry) => ({ ...entry, groundingStatus: 'verified' })),
  };
};
