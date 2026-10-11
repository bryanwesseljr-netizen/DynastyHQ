import { buildPlayerOffseasonMode } from './playerOffseason.js';

const clean = (value, max = 300) => String(value ?? '').trim().slice(0, max);
const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const list = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
export const OFFSEASON_TYPES = Object.freeze(['season-review','portal-entry']);
export const offseasonPublicationId = (season, type) => `offseason-season-${Math.max(1,num(season))}-${type}`;

const scoreFor = (game = {}) => {
  if (game.teamScore !== undefined && game.opponentScore !== undefined)
    return {team:num(game.teamScore),opponent:num(game.opponentScore)};
  if (game.homeScore === undefined || game.awayScore === undefined) return null;
  if (game.homeAway === 'away') return {team:num(game.awayScore),opponent:num(game.homeScore)};
  if (game.homeAway === 'home') return {team:num(game.homeScore),opponent:num(game.awayScore)};
  // For playoff games at neutral sites, the displayed home/away scoreboard
  // sides do not necessarily identify the tracked school. Respect the saved
  // win/loss outcome instead of guessing its side of the scoreboard.
  const result=clean(game.result,10).toUpperCase();
  const high=Math.max(num(game.homeScore),num(game.awayScore));
  const low=Math.min(num(game.homeScore),num(game.awayScore));
  if(result==='W' && high!==low) return {team:high,opponent:low};
  if(result==='L' && high!==low) return {team:low,opponent:high};
  return null;
};
const playerGame = (game, season) => game && num(game.season || season)===season
  && game.didPlay!==false && game.stage!=='high-school' && !game.evaluation
  && Boolean(clean(game.opponent));
const outcome = (game={}) => {
  const result=clean(game.result,12).toUpperCase();
  return result === 'W' ? 'win' : result === 'L' ? 'loss' : 'result not specified';
};

export const offseasonCoverageFacts = (state = {}, type = 'season-review', { portalConfirmed = false } = {}) => {
  if (!OFFSEASON_TYPES.includes(type)) throw new Error('Select a supported offseason edition.');
  const season=Math.max(1,num(state.currentSeason || 1));
  const offseason=buildPlayerOffseasonMode(state);
  const player=clean(state.player?.name,120);
  const school=clean(state.player?.college || state.player?.school,120);
  const games=list(state.gameLogs).filter((game)=>playerGame(game,season))
    .sort((a,b)=>num(a.week)-num(b.week));
  const final=games.at(-1)||null;
  const savedSchedule=offseason.schedule;
  const completedSemifinal=Boolean(
    final && outcome(final)==='loss'
    && (final.postseason?.stage==='semifinal'
      || /semifinal/i.test(clean(final.weekLabel || final.postseason?.displayLabel))
      || savedSchedule.completed.some((entry)=>num(entry.week)===num(final.week)
        && entry.postseasonRound==='semifinal')),
  );
  // Require a credible final-season outcome. An early portal entry is not a
  // reason to mark unplayed games as complete.
  if (!offseason.seasonComplete && !completedSemifinal) {
    throw new Error('Finish and publish your season-ending game before generating an offseason special.');
  }
  if (type==='portal-entry' && !portalConfirmed
    && state.playerRecruiting?.transfer?.status!=='exploring') {
    throw new Error('Confirm that your player entered the transfer portal in the game before generating the announcement.');
  }
  const seasonLine=offseason.playerLine;
  const record=offseason.teamRecord;
  const finalScore=final ? scoreFor(final) : null;
  const knownGames=games.map((game)=>({
    week:num(game.week),
    opponent:clean(game.opponent,120),
    result:outcome(game),
    score:scoreFor(game),
    postseason:clean(game.postseason?.displayLabel || game.weekLabel,140),
    passingYards:num(game.passYds),
    passingTouchdowns:num(game.passTD),
    rushingYards:num(game.rushYds),
    rushingTouchdowns:num(game.rushTD),
    interceptions:num(game.int ?? game.interceptions),
  }));
  const milestones=list(offseason.awards).map((a)=>clean(a.title,120));
  const highlighted=games.length ? [...games].sort((a,b)=>num(b.passYds)-num(a.passYds))[0] : null;
  return {
    publicationId:offseasonPublicationId(season,type),
    type,season,school,player,
    status:'verified-season',
    event:type==='portal-entry'?'transfer portal entry confirmed by the player':'completed season retrospective',
    record:{wins:num(record.wins),losses:num(record.losses)},
    playerTotals:{
      appearances:num(seasonLine.appearances),
      passingYards:num(seasonLine.passYds),passingTouchdowns:num(seasonLine.passTD),
      rushingYards:num(seasonLine.rushYds),rushingTouchdowns:num(seasonLine.rushTD),
      interceptions:num(seasonLine.interceptions),
    },
    latestGame:final?{
      week:num(final.week),opponent:clean(final.opponent,120),
      outcome:outcome(final),score:finalScore,
      stage:clean(final.postseason?.displayLabel || final.weekLabel,140),
    }:null,
    standoutGame:highlighted?{opponent:clean(highlighted.opponent),passingYards:num(highlighted.passYds)}:null,
    postseasonGames:knownGames.filter((g)=>/CFP|BOWL|SEMIFINAL|QUARTERFINAL|PLAYOFF/i.test(g.postseason)),
    completedGames:knownGames,
    honors:milestones,
    portal:type==='portal-entry'?{
      entered:true,
      destinationConfirmed:false,
      destination:'',
      eligibility:'one season remaining (player-confirmed)',
      offers:[],
    }:null,
    editorialBoundaries:[
      'Do not fabricate team scores, player stats, dates, game results, awards, quotes, offers, NIL values, emotions or coaching conversations.',
      'Do not describe a confirmed transfer destination until recorded separately.',
      'Treat transfer entry as an announcement, not a commitment or a departure already completed.',
      'Never change the last game result or claim a championship was won.',
    ],
  };
};

const words = (value) => clean(value,100000).split(/\s+/).filter(Boolean).length;
const normalizeSegments = (segments) => list(segments).slice(0,22).map((segment,i)=>({
  speaker: ['Mark Thompson','Sarah Chen'].includes(segment?.speaker) ? segment.speaker : i%2===0?'Mark Thompson':'Sarah Chen',
  text:clean(segment?.text,1700),
})).filter((entry)=>entry.text);
export const normalizeOffseasonDraft = (generated = {}, facts = {}, model = '') => {
  const article=generated.article || {};
  const podcast=generated.podcast || {};
  const paragraphs=list(article.paragraphs).map((p)=>clean(p,3000)).filter(Boolean).slice(0,10);
  const segments=normalizeSegments(podcast.segments);
  const chapters=list(podcast.chapters).slice(0,8).map((chapter)=>({
    title:clean(chapter.title,140),summary:clean(chapter.summary,420),
  })).filter((chapter)=>chapter.title);
  if (!clean(article.headline,240) || !clean(article.dek,520) || paragraphs.length<4
    || words(paragraphs.join(' '))<160) {
    throw new Error('The Newsroom special was incomplete. Nothing was saved.');
  }
  if (!clean(podcast.title,240) || !clean(podcast.summary,520) || segments.length<10
    || words(segments.map((segment)=>segment.text).join(' '))<350
    || new Set(segments.map((segment)=>segment.speaker)).size<2 || chapters.length<3) {
    throw new Error('The Huddle special needs a longer two-host conversation. Nothing was saved.');
  }
  const combined=[article.headline,article.dek,...paragraphs,podcast.title,podcast.summary,...segments.map((entry)=>entry.text)].join(' ');
  if(facts.type==='portal-entry' && /(?:has committed to|signed with|will play at)\s+[A-Z]/i.test(combined)) {
    throw new Error('The portal special asserted a commitment that is not confirmed. No coverage was saved.');
  }
  return {
    id:facts.publicationId,publicationId:facts.publicationId,
    season:facts.season,type:facts.type,school:facts.school,
    player:facts.player,generatedAt:new Date().toISOString(),model:clean(model,90),
    article:{
      headline:clean(article.headline,240),dek:clean(article.dek,520),
      paragraphs,byline:'DynastyHQ Sports Desk',
      category:facts.type==='portal-entry'?'BREAKING NEWS · TRANSFER PORTAL':'SEASON IN REVIEW',
    },
    podcast:{
      title:clean(podcast.title,240),summary:clean(podcast.summary,520),
      showName:'The Huddle',chapters,segments,
      audioStatus:'not-generated',
    },
    facts,
  };
};

export const upsertOffseasonEdition = (state={},draft={}) => {
  if (!OFFSEASON_TYPES.includes(draft.type) || !draft.id
      || draft.id!==offseasonPublicationId(draft.season,draft.type))
    throw new Error('Invalid offseason publication identity.');
  const existing=list(state.offseasonEditions);
  const old=existing.find((entry)=>entry.id===draft.id);
  if (old && (old.podcast?.audioStatus==='ready' || old.podcast?.audioUrl)) {
    // Keep preexisting audio without silently treating it as a new transcript.
    draft={...draft,podcast:{...draft.podcast,
      audioStatus:'stale',
      audioUrl:old.podcast.audioUrl||'',
    }};
  }
  return {
    ...state,
    offseasonEditions:[
      ...existing.filter((entry)=>entry.id!==draft.id),
      {...draft,publishedAt:new Date().toISOString()},
    ].sort((a,b)=>num(a.season)-num(b.season)
      || OFFSEASON_TYPES.indexOf(a.type)-OFFSEASON_TYPES.indexOf(b.type)),
  };
};

const present = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const formatted = (value) => present(value) ? Number(value).toLocaleString('en-US') : 'not recorded';
  const resultLetter = (value) => {
    const label=clean(value,30).toLowerCase();
    return label==='win'?'W':label==='loss'?'L':'not recorded';
  };
  const scoreLine = (score, school, opponent) => (
    score && present(score.team) && present(score.opponent)
      ? `; final: ${school} ${formatted(score.team)}, ${opponent} ${formatted(score.opponent)}`
      : '; score not saved'
  );
  const gameLine = (game={},school='Oregon') => {
    const opponent=clean(game.opponent,140)||'opponent not recorded';
    const stage=clean(game.postseason,140);
    const week=present(game.week)?`Week ${Number(game.week)}`:'Unnumbered game';
    const context=stage && !/^week\s*\d+$/i.test(stage) ? ` · ${stage}` : '';
    return `- ${week}${context}: ${school} vs. ${opponent} (${resultLetter(game.result)}${scoreLine(game.score,school,opponent)}). Player stats: ${formatted(game.passingYards)} passing yards, ${formatted(game.passingTouchdowns)} passing TD; ${formatted(game.rushingYards)} rushing yards, ${formatted(game.rushingTouchdowns)} rushing TD; ${formatted(game.interceptions)} interceptions.`;
  };
  const readableFacts=(edition={})=>{
    const f=edition.facts||{};
    const school=clean(f.school||edition.school,160)||'School not recorded';
    const player=clean(f.player||edition.player,160)||'Player not recorded';
    const season=Math.max(1,num(f.season||edition.season||1));
    const isPortal=f.type==='portal-entry';
    const record=f.record||{};
    const totals=f.playerTotals||{};
    const games=list(f.completedGames);
    const postseason=list(f.postseasonGames);
    const final=f.latestGame||null;
    const opponent=clean(final?.opponent,140)||'opponent not recorded';
    const finalStage=clean(final?.stage,140);
    const awardLines=list(f.honors).map(x=>`- ${clean(x,180)}`).filter(x=>x!=='- ');
    const portal=f.portal||{};
    return [
      '## VERIFIED EVENT — EDITORIAL FACTS',
      `Type: ${isPortal?'Breaking news — confirmed transfer-portal entry':'Completed season retrospective'}.`,
      `Program: ${school}. Tracked player: ${player}. Season: ${season}.`,
      isPortal
        ? `${player} has entered the transfer portal with one season of eligibility remaining, as confirmed by the player. A destination has not been selected or verified.`
        : `This is a completed season review of ${school}; report the postseason ending and the verified production, but do not present a transfer decision as part of this event.`,
      '',
      '## SEASON OVERVIEW',
      `Final team record: ${formatted(record.wins)} wins and ${formatted(record.losses)} losses.`,
      final
        ? `Final recorded game: ${school} vs. ${opponent}, ${resultLetter(final.outcome)}${scoreLine(final.score,school,opponent)}${finalStage?` in the ${finalStage}`:''}.`
        : 'No final game was saved.',
      `Tracked player appearances: ${formatted(totals.appearances)}.`,
      `Passing: ${formatted(totals.passingYards)} yards, ${formatted(totals.passingTouchdowns)} TD, ${formatted(totals.interceptions)} interceptions.`,
      `Rushing: ${formatted(totals.rushingYards)} yards, ${formatted(totals.rushingTouchdowns)} TD.`,
      present(totals.passingTouchdowns)&&present(totals.rushingTouchdowns)
        ? `Total passing plus rushing touchdowns: ${formatted(Number(totals.passingTouchdowns)+Number(totals.rushingTouchdowns))}.` : '',
      '',
      '## VERIFIED POSTSEASON JOURNEY',
      postseason.length
        ? `Playoff sequence in order: ${postseason.map(g=>(clean(g.postseason,120)||`Week ${formatted(g.week)}`)+` vs. ${clean(g.opponent,120)} (${resultLetter(g.result)})`).join(' → ')}.`
        : 'A postseason sequence was not recorded. Do not infer missing rounds.',
      'The postseason sequence supplies context; the detailed scores and player numbers are in the game log below.',
      '',
      '## COMPLETE SAVED GAME LOG — REFERENCE, NOT A READ-ALOUD LIST',
      'Each entry reports the saved matchup, result, score when available, and tracked quarterback stat line.',
      ...(games.length?[...games].sort((a,b)=>num(a.week)-num(b.week)).map(g=>gameLine(g,school)):['No completed game log entries were available.']),
      '',
      '## VERIFIED HONORS AND PERFORMANCE HIGHLIGHTS',
      ...(awardLines.length?awardLines:['No award or honor was confirmed in the saved facts.']),
      ...(f.standoutGame?.opponent
        ? [`Most passing yards in one saved game: ${formatted(f.standoutGame.passingYards)} against ${clean(f.standoutGame.opponent,130)}.`] : []),
      '',
      ...(isPortal ? [
        '## BREAKING NEWS — TRANSFER PORTAL STATUS',
        `Portal entry: ${portal.entered===true?'confirmed':'not verified'}.`,
        `Remaining eligibility: ${clean(portal.eligibility,150)||'not established'}.`,
        `School at announcement: ${school}.`,
        'New school: NOT CONFIRMED. A portal entry does not equal a commitment.',
        'Offers and visits: no verified offers or visits in the supplied research. Do not claim that no schools are interested.',
      ] : [
        '## SEPARATE OFFSEASON STORY',
        'The season retrospective should not announce a portal decision. If a transfer-portal entry is later confirmed, it belongs to a separate breaking-news edition.',
      ]),
      '',
      '## VERIFIED FACT BOUNDARIES',
      'All reported statistics, game outcomes, honors, rounds and portal claims must be grounded in this research.',
      'No fictional quotes, school offers, private motives, injuries, locker-room conversations or invented matchups.',
      'Exclude Road to Glory video-game mechanics such as overall rating, coach trust, skill points, GPA, wear, NIL menus and follower numbers.',
    ].filter(x=>x!==''&&x!==null&&x!==undefined);
  };
  export const offseasonNotebookSourcePack = (edition={}) => {
    const f=edition.facts||{},p=edition.podcast||{},a=edition.article||{};
    const season=Math.max(1,num(f.season||edition.season||1));
    const school=clean(f.school||edition.school,160)||'program not recorded';
    const isPortal=f.type==='portal-entry';
    const lines=[
      '# THE HUDDLE PODCAST — OFFSEASON NOTEBOOKLM PRODUCER PACK',
      '',
      `## ${clean(p.title,240)||'Offseason Special'}`,
      `Season ${season} · ${school} · ${isPortal?'Transfer Portal Breaking News':'End-of-Season Review'}`,
      '',
      '## PRODUCER BRIEF — READ FIRST',
      'Use the verified season research below as your primary factual source, not the generated article or transcript.',
      'The show is The Huddle Podcast with hosts Mark Thompson and Sarah Chen. Introduce the show and both hosts before the conversation.',
      isPortal
        ? 'Lead with the confirmed entry into the portal and the final year of eligibility. Do not invent offers, a destination, coaches comments, rumors or private motivation.'
        : 'Lead with the season-ending playoff result, then discuss the verified season record, quarterback production, and notable games in context.',
      'Use NotebookLM Deep Dive with the Short length setting. The hosts should sound like real analysts having a football conversation, not reading a database.',
      '',
      ...readableFacts(edition),
      '',
      '## OPTIONAL EPISODE CHAPTER MAP',
      'This saved outline is editorial structure only; it is not an independent factual source.',
      ...(list(p.chapters).length
        ? list(p.chapters).map((chapter,index)=>`${index+1}. ${clean(chapter.title,140)} — ${clean(chapter.summary,420)}`)
        : ['No saved chapters; use the verified season and playoff sequence as your outline.']),
      '',
      '## STYLE REFERENCE — DYNASTYHQ GENERATED TRANSCRIPT',
      'This is generated editorial copy for pacing and conversational style; ignore any claim not supported above.',
      ...(list(p.segments).length
        ? list(p.segments).map(segment=>`${clean(segment.speaker,80)||'Host'}: ${clean(segment.text,1700)}`)
        : ['No generated script is saved for this edition.']),
      '',
      '## EDITORIAL ARTICLE — SECONDARY STYLE REFERENCE',
      'Treat this article as writing style reference only. The verified research above takes priority.',
      clean(a.headline,240),clean(a.dek,520),
      ...list(a.paragraphs).map(paragraph=>clean(paragraph,3000)),
      '',
      '## AUDIO SOURCE RULES',
      '- Use saved results, stats and honors; do not embellish them.',
      '- Do not read the entire game log aloud: choose the moments that explain the football story.',
      '- Do not invent transfer schools, offers, statements, private motives or future results.',
      '- A transfer-portal announcement is not a commitment announcement.',
      '- Generated scripts and articles are style guides, not verified independent sources.',
      '- Avoid game mechanics, back-end language and unsupported speculation.',
      '',
      'END OFFSEASON PRODUCER PACK',
    ];
    return lines.join('\n');
  };
