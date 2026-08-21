import OpenAI from 'openai';
import { json, verifyFirebaseUser } from './_auth.js';

const MODEL = process.env.OPENAI_NEWSROOM_MODEL || 'gpt-5.6-terra';
export const config = { maxDuration: 60 };

const text = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const COVERAGE_TIERS = new Set(['no-coverage', 'brief', 'standard', 'major', 'career-defining']);

const sanitizeCoverageDecision = (body = {}) => {
  const raw = body.coverageDecision || {};
  const tier = COVERAGE_TIERS.has(raw.tier) ? raw.tier : '';
  const range = raw.newsroomWordRange || {};
  const min = Math.max(120, Math.min(700, Number(range.min) || 300));
  const max = Math.max(min, Math.min(800, Number(range.max) || 500));
  return {
    tier,
    articleCount: Math.max(0, Math.min(5, Number(raw.articleCount) || 0)),
    podcastEligible: Boolean(raw.podcastEligible),
    playerMentionPolicy: text(raw.playerMentionPolicy, 80),
    storylineKeys: Array.isArray(raw.storylineKeys) ? raw.storylineKeys.slice(0, 12).map((key) => text(key, 160)).filter(Boolean) : [],
    newsroomWordRange: { min, max },
  };
};

const sanitizeStorylineThreads = (body = {}) => (Array.isArray(body.storylineThreads) ? body.storylineThreads.slice(0, 12).map((thread) => ({
  key: text(thread?.key, 160),
  label: text(thread?.label, 160),
  value: typeof thread?.value === 'number' || typeof thread?.value === 'boolean' ? thread.value : text(thread?.value, 300),
  status: text(thread?.status, 60),
  changedThisWeek: Boolean(thread?.changedThisWeek),
  recentlyCovered: Boolean(thread?.recentlyCovered),
  editorialUse: ['primary', 'context', 'background-only'].includes(thread?.editorialUse) ? thread.editorialUse : 'context',
})).filter((thread) => thread.key && thread.label) : []);

const validatePayload = (body = {}) => {
  const coverageStage = ['high-school', 'college-player', 'coach'].includes(body.coverageStage) ? body.coverageStage : 'high-school';
  const coverageDecision = sanitizeCoverageDecision(body);
  if (coverageStage === 'college-player' && coverageDecision.tier === 'no-coverage') return null;

  const facts = Array.isArray(body.facts) ? body.facts.slice(0, 120).map((fact) => ({
    id: text(fact.id, 260),
    key: text(fact.key, 180),
    label: text(fact.label, 180),
    value: typeof fact.value === 'number' || typeof fact.value === 'boolean' ? fact.value : text(fact.value, 600),
    period: text(fact.period, 180),
    editorialUse: ['primary', 'context', 'background-only'].includes(fact.editorialUse) ? fact.editorialUse : 'context',
  })).filter((fact) => fact.id && fact.key && fact.label) : [];
  const factIds = new Set(facts.map((fact) => fact.id));

  const articleBriefs = Array.isArray(body.articleBriefs) ? body.articleBriefs.slice(0, 5).map((brief) => {
    const requestedRange = brief.targetWordRange || coverageDecision.newsroomWordRange || {};
    const min = Math.max(120, Math.min(700, Number(requestedRange.min) || 300));
    const max = Math.max(min, Math.min(800, Number(requestedRange.max) || 500));
    return {
      outletId: text(brief.outletId, 80),
      outletName: text(brief.outletName, 120),
      desk: text(brief.desk, 100),
      theme: text(brief.theme, 60),
      byline: text(brief.byline, 160),
      purpose: text(brief.purpose, 1200),
      storyType: text(brief.storyType, 80),
      angle: text(brief.angle, 1400),
      subjectPriority: text(brief.subjectPriority, 80),
      playerMentionPolicy: text(brief.playerMentionPolicy, 80),
      coverageTier: text(brief.coverageTier || coverageDecision.tier, 40),
      targetWordRange: { min, max },
      focusFactIds: [...new Set((brief.focusFactIds || []).map((id) => text(id, 260)).filter((id) => factIds.has(id)))],
    };
  }).filter((brief) => brief.outletId && brief.outletName && brief.focusFactIds.length) : [];

  if (!facts.length || !articleBriefs.length || new Set(articleBriefs.map((brief) => brief.outletId)).size !== articleBriefs.length) return null;
  if (coverageStage === 'college-player' && coverageDecision.articleCount > 0 && articleBriefs.length > coverageDecision.articleCount) return null;

  const relevance = body.coveragePlan?.playerRelevance || {};
  const program = body.coveragePlan?.program || {};
  const programGames = Number(program.games) || 0;
  const sharedPlayerPolicy = text(body.coveragePlan?.playerMentionPolicy || coverageDecision.playerMentionPolicy, 80);

  return {
    publicationId: text(body.publicationId, 140),
    season: Math.max(1, Number(body.season) || 1),
    week: Math.max(0, Number(body.week) || 0),
    label: text(body.label, 160),
    editionType: text(body.editionType, 80),
    weekType: text(body.weekType, 60),
    weekPhase: text(body.weekPhase, 80),
    careerPhase: text(body.careerPhase, 60),
    coverageStage,
    coverageDecision,
    storylineThreads: sanitizeStorylineThreads(body),
    coveragePlan: body.coveragePlan ? {
      editorialPrinciple: text(body.coveragePlan.editorialPrinciple, 500),
      playerMentionPolicy: sharedPlayerPolicy,
      program: {
        school: text(program.school, 160),
        record: programGames > 0 ? text(program.record, 40) : '',
        streak: programGames > 0 ? text(program.streak, 100) : '',
        wins: Number(program.wins) || 0,
        losses: Number(program.losses) || 0,
        games: programGames,
        recordEstablished: programGames > 0,
      },
      playerRelevance: {
        level: ['low', 'developing', 'high', 'primary'].includes(relevance.level) ? relevance.level : 'low',
        currentRole: sharedPlayerPolicy === 'omit' ? '' : text(relevance.currentRole, 40),
        previousRole: sharedPlayerPolicy === 'omit' ? '' : text(relevance.previousRole, 40),
        roleChanged: sharedPlayerPolicy === 'omit' ? false : Boolean(relevance.roleChanged),
        promoted: sharedPlayerPolicy === 'omit' ? false : Boolean(relevance.promoted),
        demoted: sharedPlayerPolicy === 'omit' ? false : Boolean(relevance.demoted),
        didPlay: sharedPlayerPolicy === 'omit' ? false : Boolean(relevance.didPlay),
        firstAppearance: sharedPlayerPolicy === 'omit' ? false : Boolean(relevance.firstAppearance),
        starter: sharedPlayerPolicy === 'omit' ? false : Boolean(relevance.starter),
      },
    } : null,
    player: {
      name: sharedPlayerPolicy === 'omit' && coverageStage === 'college-player' ? '' : text(body.player?.name, 120),
      school: text(body.player?.school, 160),
      college: text(body.player?.college, 160),
      position: sharedPlayerPolicy === 'omit' && coverageStage === 'college-player' ? '' : text(body.player?.position, 40),
      number: sharedPlayerPolicy === 'omit' && coverageStage === 'college-player' ? '' : text(body.player?.number, 20),
      archetype: sharedPlayerPolicy === 'omit' && coverageStage === 'college-player' ? '' : text(body.player?.archetype, 80),
    },
    facts,
    articleBriefs,
  };
};

const schemaFor = (payload) => ({
  type: 'object',
  additionalProperties: false,
  required: ['articles'],
  properties: {
    articles: {
      type: 'array',
      minItems: payload.articleBriefs.length,
      maxItems: payload.articleBriefs.length,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['outletId', 'storyImportance', 'storyFormat', 'kicker', 'headline', 'dek', 'dateline', 'paragraphs', 'sectionHeadings', 'pullQuote', 'sidebars', 'citedFactIds'],
        properties: {
          outletId: { type: 'string', enum: payload.articleBriefs.map((brief) => brief.outletId) },
          storyImportance: { type: 'string', enum: ['routine', 'notable', 'major', 'career-defining'] },
          storyFormat: { type: 'string', enum: ['news', 'feature', 'analysis', 'recruiting-intel', 'milestone', 'reaction'] },
          kicker: { type: 'string' },
          headline: { type: 'string', maxLength: 90 },
          dek: { type: 'string' },
          dateline: { type: 'string' },
          paragraphs: { type: 'array', minItems: 4, maxItems: 7, items: { type: 'string' } },
          sectionHeadings: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string' } },
          pullQuote: { type: 'string' },
          sidebars: {
            type: 'array', minItems: 1, maxItems: 2,
            items: {
              type: 'object', additionalProperties: false, required: ['title', 'items'],
              properties: {
                title: { type: 'string' },
                items: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string' } },
              },
            },
          },
          citedFactIds: { type: 'array', minItems: 1, items: { type: 'string', enum: payload.facts.map((fact) => fact.id) } },
        },
      },
    },
  },
});

const INSTRUCTIONS = `You are the editorial director of DynastyHQ, a fictional but realistic sports-media network following one football career from high school through college and eventually coaching.

Write believable modern sports journalism, never a player tracker, game-menu recap, database report, or stat ledger.

SHARED COVERAGE DECISION:
- coverageDecision is binding. It determines how much coverage this week deserves.
- A brief week gets one concise story. Standard weeks get normal coverage. Major/career-defining weeks can support more outlets and more depth.
- Each article brief includes its own targetWordRange. Treat it as a target, never a quota. Do not pad.
- storylineThreads marked changedThisWeek=true are fresh developments. Threads marked recentlyCovered or background-only are not new stories and should not be reintroduced as if they just happened.
- A continuing role, record, streak, or status is not a new storyline merely because it remains true.

CENTRAL COLLEGE PHILOSOPHY:
- The PROGRAM and GAME are the default story.
- The tracked player becomes the story only when his football relevance makes him the story.
- If coveragePlan.playerMentionPolicy is "omit", do not name or discuss the tracked player at all and do not build a quarterback story around his backup status.
- Legitimate player events include promotion/demotion, first appearance, meaningful playing time, a start, meaningful production, transfer decision, award, milestone, or another consequential supplied football event.

EDITORIAL SALIENCE:
- Factual does not automatically mean newsworthy. Lead with consequence, change, tension, performance and meaningful football questions.
- High-value material includes result/score, meaningful team statistical contrasts, role movement, first appearance/start, actual production, newly meaningful streaks, postseason stakes, transfer/recruiting decisions, awards and milestones.
- Ignore unchanged states and bookkeeping.
- Before the first completed game, never mention 0-0, undefeated, unblemished, clean slate, fresh start, even footing, or a preserved record.
- Once games are played, record/streak are supporting context unless they have actually become consequential.
- Do not inflate a neutral fact to sound positive or important.

ARTICLE BRIEFS:
- storyType, angle, subjectPriority and playerMentionPolicy are binding assignments.
- Different outlets should cover different legitimate angles, not duplicate the same story.
- If the player policy says omit, the player's identity in the packet is not permission to mention him.

FACT HIERARCHY:
- primary: can drive a story when genuinely valuable.
- context: supports a story; do not inventory it.
- background-only: internal context. Never expose raw values or labels.
- player.coverageRelevance and program.coverageTier are internal metadata only.

ABSOLUTE READER-FACING BANS:
- Never mention a ledger, database, tracker, snapshot, packet, fact key, screenshot, upload, AI, prompt, game UI, progression system, meter, currency, or missing field.
- Never discuss OVR/overall rating, Coach Trust, Skill Points, Weekly Points, Energy, GPA, followers, brand tiers, NIL valuation, ability names, health/fitness/wear meters, draft projection, or similar game mechanics in college coverage.
- Never explain that information was omitted because it was unsupported. Just omit it.
- Never fabricate quotes, practice results, coach intentions, snap counts, injuries, depth-chart promises, tactics, formations, plays, rankings, weather, crowd reaction, locker-room scenes, future opponents, or outside opinions.

FOOTBALL INTELLIGENCE WITHOUT INVENTION:
- Explain why a supplied role change affects opportunity, why a turnover/yardage contrast shaped a game, what pressure/opportunity follows a result, and which real football question matters next.
- Logical inference is welcome when clearly grounded; invented reporting is not.
- Avoid generic sports clichés when a sharper supported point exists.

COLLEGE GAME WEEK:
- The local lead normally begins with opponent, result, score, meaningful statistical contrasts, and why the result matters.
- Use team stats selectively to explain the game, not dump numbers.
- A tracked player who did not appear is usually not a paragraph topic.
- A real depth-chart move can be its own football story even without game stats.

COLLEGE BYE/PRESEASON:
- A bye is not a story about the absence of a game.
- Do not default to quarterback hierarchy or backup development just because a depth-chart fact exists.
- Only cover the verified program/player event that actually cleared the coverage threshold.
- If the week is genuinely quiet, the client should have sent no article briefs rather than asking you to manufacture one.

SEASON CONTINUITY:
- Use active storyline memory to continue a story only when something changed.
- Do not repeat the same role/status/record theme week after week.
- Do not claim standings, rankings, bowl eligibility, rivalry status, playoff position, or championship implications unless supplied.

HIGH SCHOOL:
- During the actual high-school stage, evaluation/recruiting material may be covered because it is the public story of that stage.
- Once in college, old high-school mechanics are closed history unless a current fact explicitly makes a retrospective relevant.

COACHING:
- In OC/HC stages, default to program results, team performance, roster movement, recruiting/portal movement, postseason stakes, championships, job pressure and career movement when supplied.
- Keep management counters and game currencies out of reader-facing copy.

WRITING QUALITY:
- Cold-open each article with the actual sports story, not an explanation of what the article will discuss.
- Each outlet needs a distinct angle and cadence.
- Build around the strongest real idea, not every fact in the packet.
- Keep headlines concise: roughly 5-10 words, active, one clear angle.
- The dek adds stakes rather than repeating the headline.
- Section headings sound editorial, not like data fields.
- pullQuote is an unattributed editorial takeaway, not a fabricated person's quote.
- One useful sidebar is enough on a concise story. By-the-numbers is only for real football/game statistics, never game mechanics.
- Use a dateline only when a location is explicitly supplied; otherwise return an empty string.

STORY IMPORTANCE:
- routine: normal game/preparation or expected development.
- notable: meaningful role movement, strong/poor performance, meaningful result, recruiting/transfer movement.
- major: starting-job change, major supported result, major award/injury/transfer decision, record-setting performance, championship-stage result.
- career-defining: rare cornerstone moments such as a championship, top national award, defining career record, or similarly historic milestone.

CITATIONS:
- Every factual claim must be supportable by supplied facts.
- citedFactIds are internal grounding metadata only and must never appear in prose.

Return exactly one article for every article brief and use every requested outletId exactly once.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  if (!process.env.OPENAI_API_KEY) return json(res, 503, { error: 'Newsroom writing is not configured yet.' });

  let user;
  try {
    user = await verifyFirebaseUser(req.headers.authorization);
  } catch (error) {
    console.error('Firebase token verification failed', error);
    return json(res, 503, { error: 'Could not verify the signed-in user.' });
  }
  if (!user) return json(res, 401, { error: 'Sign in before writing a newsroom edition.' });

  const payload = validatePayload(req.body);
  if (!payload) {
    return json(res, 422, {
      error: 'No new newsroom story this week. There was not enough meaningful football movement to justify publishing an article.',
      code: 'NO_NEWSWORTHY_NEWSROOM',
    });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const assignmentSummary = payload.articleBriefs
      .map((brief) => `${brief.outletName}: ${brief.storyType || 'story'}, ${brief.targetWordRange.min}-${brief.targetWordRange.max} words, player policy ${brief.playerMentionPolicy || 'relevance-based'}`)
      .join('; ');
    const storylineSummary = payload.storylineThreads.length
      ? payload.storylineThreads.map((thread) => `${thread.label}=${thread.status}${thread.changedThisWeek ? ' (changed this week)' : ''}${thread.recentlyCovered ? ' (recently covered)' : ''}`).join('; ')
      : 'none';

    const response = await client.responses.create({
      model: MODEL,
      store: false,
      safety_identifier: user.localId,
      reasoning: { effort: 'low' },
      max_output_tokens: 10000,
      instructions: INSTRUCTIONS,
      input: [{
        role: 'user',
        content: [{
          type: 'input_text',
          text: `Write this newsroom edition from the internal editorial packet. Coverage tier: ${payload.coverageDecision?.tier || 'stage-default'}. Assignments: ${assignmentSummary}. Storyline memory: ${storylineSummary}. Cover what changed and matters; leave stale storylines and bookkeeping alone.\n${JSON.stringify(payload)}`,
        }],
      }],
      text: { format: { type: 'json_schema', name: 'dynastyhq_newsroom_edition', strict: true, schema: schemaFor(payload) } },
    });
    if (!response.output_text) return json(res, 422, { error: 'The newsroom edition could not be written safely.' });
    return json(res, 200, { edition: JSON.parse(response.output_text), model: MODEL });
  } catch (error) {
    console.error('OpenAI newsroom generation failed', error);
    const status = error?.status === 429 ? 429 : 502;
    return json(res, status, {
      error: status === 429
        ? 'The newsroom desk is busy. Try writing the edition again shortly.'
        : 'The newsroom edition could not be completed. Your existing articles were preserved.',
    });
  }
}
