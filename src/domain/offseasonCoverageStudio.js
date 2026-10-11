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

export const offseasonNotebookSourcePack = (edition={}) => {
  const f=edition.facts||{},p=edition.podcast||{},a=edition.article||{};
  const lines=[
    '# DYNASTYHQ — OFFSEASON SPECIAL | THE HUDDLE',
    `# ${clean(p.title,240)}`,
    `Season ${f.season || edition.season} · ${clean(f.school || edition.school)} · ${f.type==='portal-entry'?'Portal Announcement':'End of Season'}`,
    '',
    '## VERIFIED FACTS — PRIMARY AUTHORITY',
    JSON.stringify(f,null,2),
    '',
    '## OPTIONAL EPISODE CHAPTER MAP',
    ...list(p.chapters).map((chapter,index)=>`${index+1}. ${chapter.title} — ${chapter.summary}`),
    '',
    '## STYLE REFERENCE — DYNASTYHQ GENERATED TRANSCRIPT',
    'This transcript is an editorial style reference, not a source of verified facts. Use the verified facts above for all factual claims.',
    ...list(p.segments).map((segment)=>`${segment.speaker}: ${segment.text}`),
    '',
    '## EDITORIAL ARTICLE — SECONDARY STYLE REFERENCE',
    a.headline||'',
    a.dek||'',
    ...list(a.paragraphs),
    '',
    '## SOURCE RULES',
    'Use only the supplied verified facts for names, statistics, game results and portal status.',
    'Do not invent offers, transfer destinations, quotes, private intentions or future game outcomes.',
  ];
  return lines.join('\n');
};
