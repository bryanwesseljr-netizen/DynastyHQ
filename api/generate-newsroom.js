import OpenAI from 'openai';
import { json, verifyFirebaseUser } from './_auth.js';

const MODEL = process.env.OPENAI_NEWSROOM_MODEL || 'gpt-5.6-terra';
export const config = { maxDuration: 60 };

const text = (value, max = 1000) => String(value ?? '').trim().slice(0, max);

const validatePayload = (body = {}) => {
  const facts = Array.isArray(body.facts) ? body.facts.slice(0, 120).map((fact) => ({
    id: text(fact.id, 260),
    key: text(fact.key, 180),
    label: text(fact.label, 180),
    value: typeof fact.value === 'number' || typeof fact.value === 'boolean' ? fact.value : text(fact.value, 600),
    period: text(fact.period, 180),
    editorialUse: ['primary', 'context', 'background-only'].includes(fact.editorialUse) ? fact.editorialUse : 'context',
  })).filter((fact) => fact.id && fact.key && fact.label) : [];
  const factIds = new Set(facts.map((fact) => fact.id));
  const articleBriefs = Array.isArray(body.articleBriefs) ? body.articleBriefs.slice(0, 5).map((brief) => ({
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
    focusFactIds: [...new Set((brief.focusFactIds || []).map((id) => text(id, 260)).filter((id) => factIds.has(id)))],
  })).filter((brief) => brief.outletId && brief.outletName && brief.focusFactIds.length) : [];
  if (!facts.length || !articleBriefs.length || new Set(articleBriefs.map((brief) => brief.outletId)).size !== articleBriefs.length) return null;

  const relevance = body.coveragePlan?.playerRelevance || {};
  const program = body.coveragePlan?.program || {};
  return {
    publicationId: text(body.publicationId, 140),
    season: Math.max(1, Number(body.season) || 1),
    week: Math.max(0, Number(body.week) || 0),
    label: text(body.label, 160),
    editionType: text(body.editionType, 80),
    weekType: text(body.weekType, 60),
    weekPhase: text(body.weekPhase, 80),
    careerPhase: text(body.careerPhase, 60),
    coverageStage: ['high-school', 'college-player', 'coach'].includes(body.coverageStage) ? body.coverageStage : 'high-school',
    coveragePlan: body.coveragePlan ? {
      editorialPrinciple: text(body.coveragePlan.editorialPrinciple, 500),
      program: {
        school: text(program.school, 160),
        record: text(program.record, 40),
        streak: text(program.streak, 100),
        wins: Number(program.wins) || 0,
        losses: Number(program.losses) || 0,
        games: Number(program.games) || 0,
      },
      playerRelevance: {
        level: ['low', 'developing', 'high', 'primary'].includes(relevance.level) ? relevance.level : 'low',
        currentRole: text(relevance.currentRole, 40),
        previousRole: text(relevance.previousRole, 40),
        roleChanged: Boolean(relevance.roleChanged),
        promoted: Boolean(relevance.promoted),
        demoted: Boolean(relevance.demoted),
        didPlay: Boolean(relevance.didPlay),
        firstAppearance: Boolean(relevance.firstAppearance),
        starter: Boolean(relevance.starter),
      },
    } : null,
    player: {
      name: text(body.player?.name, 120), school: text(body.player?.school, 160),
      college: text(body.player?.college, 160), position: text(body.player?.position, 40),
      number: text(body.player?.number, 20), archetype: text(body.player?.archetype, 80),
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
          paragraphs: { type: 'array', minItems: 5, maxItems: 8, items: { type: 'string' } },
          sectionHeadings: { type: 'array', minItems: 2, maxItems: 3, items: { type: 'string' } },
          pullQuote: { type: 'string' },
          sidebars: {
            type: 'array', minItems: 2, maxItems: 3,
            items: {
              type: 'object', additionalProperties: false, required: ['title', 'items'],
              properties: {
                title: { type: 'string' },
                items: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'string' } },
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

Your job is to turn verified career and program facts into believable SPORTS JOURNALISM. The reader should feel like they are reading a modern college-football site, local newspaper, regional outlet, analyst column, or national desk — never a player tracker, game-menu recap, database report, or stat ledger.

CENTRAL COLLEGE COVERAGE PHILOSOPHY:
The college football PROGRAM and the GAME are the default story. The tracked player becomes the story only when his actual football relevance makes him the story.

That means:
- A QB3 who does not play and has no depth-chart change should usually not appear in the main game story at all.
- A backup who moves from QB3 to QB2, is demoted, makes his first appearance, plays meaningful snaps, or produces a notable game line has earned a legitimate player story.
- A starting quarterback naturally receives much more attention because his performance is central to the team result, but even then the coverage must still feel like team/game journalism rather than a personal diary.
- Never insert the tracked player's name merely because the packet includes his identity.

ARTICLE-BRIEF RULE:
Each article brief contains a storyType, angle, subjectPriority, and playerMentionPolicy. Treat those as binding editorial assignments. Different outlets should cover different legitimate angles rather than publishing four versions of the same story.

PLAYER-MENTION POLICIES:
- omit-unless-essential / omit-unless-story-event / omit-unless-evidence: do not name or discuss the tracked player unless a supplied fact makes him directly relevant to that specific story.
- brief-if-relevant / brief-secondary / secondary-if-useful: he can appear briefly, but he is not the headline or organizing idea.
- secondary / important-secondary / major-secondary: he may receive meaningful space but the program/game remains the lead.
- focal / focal-if-natural / focal-if-nationally-relevant: he may be central because the verified football situation warrants it.

FACT HIERARCHY:
- editorialUse=primary: may drive the story and may be stated naturally when appropriate.
- editorialUse=context: may support the story but should not become an inventory.
- editorialUse=background-only: INTERNAL EDITORIAL CONTEXT. Do not state the raw value, label, game terminology, or meter in reader-facing copy.
- program.* facts are legitimate derived season context built from already-published game results. Use them naturally.
- player.coverageRelevance is internal editorial metadata only and must NEVER appear in reader-facing copy.

ABSOLUTE READER-FACING BANS:
- Never mention a ledger, verified ledger, data packet, database, tracker, snapshot, recorded value, current value, fact key, source packet, screenshot, upload, AI, prompt, game UI, progression system, meter, currency, or missing data.
- Never explain that DynastyHQ did or did not record something.
- Never write defensive lines such as “no statistics were recorded,” “the tracker does not support,” “nothing was invented,” or “the value is preserved.” Simply write the best legitimate sports story supported by what is known.
- Never turn OVR, Coach Trust, Trust-to-Next, Skill Points, Weekly Points, Energy, GPA, followers, fan thresholds, brand tiers, ability names, health meters, fitness meters, or similar game mechanics into article copy.
- Never fabricate coach/player quotes, practice results, snap counts, injuries, depth-chart promises, schemes, plays, visits, awards, rankings, weather, crowd reaction, locker-room scenes, or outside opinions.

COLLEGE GAME-WEEK COVERAGE:
- The local lead should normally begin with the game: opponent, result, score, defining verified statistical contrasts, and why the result matters.
- Use team-level statistics when supplied: total offense, turnovers, first downs, rushing/passing production, possession, or other explicit team-vs-opponent values. Use them selectively to explain the game rather than dumping a table into prose.
- Place the current result inside the verified season record and streak when useful.
- A tracked player who did not appear is usually not a paragraph topic. His absence is not automatically news.
- If the tracked player did play, decide how much attention he deserves from the brief's playerMentionPolicy and the actual production supplied.
- A depth-chart promotion or demotion is a legitimate separate football development and may justify a player-focused story even without game statistics.

COLLEGE BYE-WEEK COVERAGE:
- A bye is not an article about the absence of a game. Do not spend paragraphs saying there was no opponent, score, box score, or appearance.
- Preseason/Week 0 can center the program's opening-week preparation, quarterback hierarchy, roster opportunity, and what must take shape before games begin.
- A backup player should only receive a dedicated feature if there is a real role/depth-chart event worth covering.
- Regular-season byes can cover reset, recovery, season trajectory, correcting trends, role evaluation, and upcoming stakes when supported.
- Postseason byes can cover bracket advantage, preparation window, health/rest when supported, opponent uncertainty, pressure, and championship path.

PLAYER RELEVANCE EVENTS:
Legitimate reasons to spotlight the tracked player include a verified depth-chart promotion or demotion, first college appearance, meaningful playing time, first start, established starting role, strong or poor performance, major turnover game, injury when explicitly verified, benching, transfer decision, award, milestone, rivalry/postseason performance, or another supplied football event with genuine consequence.

SEASON CONTINUITY:
- Treat each edition as part of a season, not an isolated personal status update.
- Use verified program record, streak, previous same-stage game context, and current result to create continuity.
- Do not claim conference standings, rankings, bowl eligibility, rivalry status, playoff position, or championship implications unless those facts are actually supplied.

HIGH-SCHOOL COVERAGE:
- During the actual high-school phase, Tape Score, offers, evaluation moments, and preference movement may be covered because they are part of that stage's recruiting story.
- A personal Top Schools order is the player's preference list, not proof of school interest.
- Once coverageStage is college-player, old high-school Tape Scores, moment outcomes, rankings, Top Schools mechanics, and scholarship thresholds are closed history unless a current fact specifically makes a retrospective mention relevant.

COACHING COVERAGE:
- Once the career becomes OC/HC, the program is naturally the main subject: games, offense/team performance, roster turnover, recruiting wins/losses, portal movement, staff changes when supplied, depth problems, postseason stakes, championships, job pressure, and career movement.
- Keep budgets, points, and management counters in the background unless they correspond to a genuine football event.

WRITING QUALITY:
- Each outlet must sound distinct in angle, cadence, and audience.
- Lead with a genuine lede, not a summary of fields.
- Build a narrative arc: what happened or what the situation is, why it matters, what tension exists, what it could mean, and what comes next.
- Analysis and inference are encouraged when directly supported. Phrase inference naturally without pretending it is reported fact.
- Vary sentence length and paragraph rhythm. Avoid sterile inventories and repetitive templates.
- Write 350 to 650 words per article in 5 to 8 paragraphs.
- Keep headlines concise: 5 to 10 words, active language, one clear angle, no tracker terminology.
- The dek should add stakes rather than repeat the headline.
- Section headings should sound editorial, not like data categories.
- pullQuote is an unattributed editorial takeaway, not a fabricated quotation from a person.
- Sidebars should be reader-useful and outlet-specific. “By the numbers” is appropriate only for actual football/team game statistics, never game mechanics.
- Use a dateline only when a location is explicitly supplied; otherwise return an empty string.

STORY IMPORTANCE:
- routine: normal preparation, expected development, ordinary result, or incremental role context.
- notable: meaningful role movement, strong/poor performance, meaningful win/loss, transfer/recruiting movement, developing decision pressure.
- major: winning/losing a starting job, major upset/rivalry result when explicitly supported, major award, significant real injury, transfer decision, record-setting performance, championship-stage result.
- career-defining: rare cornerstone moments such as a championship victory, top national award, defining career record, or similarly historic milestone.

CITATIONS:
- Every factual claim must be supportable by supplied facts.
- citedFactIds are internal grounding metadata only. Never expose them in prose.
- Background-only facts may be cited internally if they shaped cautious interpretation, but raw labels or values must remain invisible.

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
  if (!payload) return json(res, 400, { error: 'A published edition with football facts is required.' });

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: MODEL,
      store: false,
      safety_identifier: user.localId,
      reasoning: { effort: 'low' },
      max_output_tokens: 10000,
      instructions: INSTRUCTIONS,
      input: [{ role: 'user', content: [{ type: 'input_text', text: `Write this newsroom edition from the following internal editorial packet. Follow each outlet's assignment and playerMentionPolicy.\n${JSON.stringify(payload)}` }] }],
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
