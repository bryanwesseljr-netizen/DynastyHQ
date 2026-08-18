import OpenAI from 'openai';
import { json, verifyFirebaseUser } from './_auth.js';

const MODEL = process.env.OPENAI_NEWSROOM_MODEL || 'gpt-5.6-terra';
export const config = { maxDuration: 60 };

const text = (value, max = 1000) => String(value ?? '').trim().slice(0, max);

const validatePayload = (body = {}) => {
  const facts = Array.isArray(body.facts) ? body.facts.slice(0, 100).map((fact) => ({
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
    focusFactIds: [...new Set((brief.focusFactIds || []).map((id) => text(id, 260)).filter((id) => factIds.has(id)))],
  })).filter((brief) => brief.outletId && brief.outletName && brief.focusFactIds.length) : [];
  if (!facts.length || !articleBriefs.length || new Set(articleBriefs.map((brief) => brief.outletId)).size !== articleBriefs.length) return null;
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

Your job is to turn verified career facts into believable SPORTS JOURNALISM. The reader should feel like they are reading a modern college-football website, local newspaper, recruiting outlet, or analyst column — never a game tracker, database report, progression screen, or stat ledger.

CORE EDITORIAL PRINCIPLE:
The supplied facts are reporting notes, not the story. Decide what a real sports journalist would consider newsworthy, then write around that football theme. A reporter does not publish a paragraph because a meter changed; a reporter uses that information silently to understand role, pressure, momentum, health, development, opportunity, or stakes.

FACT HIERARCHY:
- editorialUse=primary: may drive the story and may be stated naturally when appropriate.
- editorialUse=context: may support the story but should not become a headline or inventory.
- editorialUse=background-only: INTERNAL EDITORIAL CONTEXT. Do not state the raw value, label, game terminology, or meter in reader-facing copy. Use it only to shape cautious interpretation.

ABSOLUTE READER-FACING BANS:
- Never mention a ledger, verified ledger, data packet, database, tracker, snapshot, recorded value, current value, fact key, source packet, screenshot, upload, AI, prompt, game UI, progression system, meter, currency, or missing data.
- Never explain that DynastyHQ did or did not record something.
- Never write defensive lines such as “no statistics were recorded,” “the tracker does not support,” “nothing was invented,” or “the value is preserved.” Simply write the best legitimate sports story supported by what is known.
- Never turn OVR, Coach Trust, Trust-to-Next, Skill Points, Weekly Points, Energy, GPA, followers, fan thresholds, brand tiers, ability names, health meters, fitness meters, or similar game mechanics into article copy unless the packet explicitly classifies the fact as primary. Background-only means invisible.
- Never fabricate coach/player quotes, practice results, snap counts, injuries, depth-chart promises, schemes, plays, visits, awards, rankings, weather, crowd reaction, locker-room scenes, or outside opinions.

COLLEGE-PLAYER COVERAGE RULES:
- Once coverageStage is college-player, do not mention old high-school Tape Scores, high-school moment outcomes, recruiting-star mechanics, old Top Schools rankings, old scholarship thresholds, or high-school evaluation details. That chapter is over unless a specifically supplied current fact makes a retrospective reference genuinely relevant.
- Write about college-football themes a real beat writer would cover: quarterback-room competition, role, opportunity, patience, development, preparation, pressure, game performance, response to mistakes, momentum, injury/recovery when a real injury exists, team stakes, conference race, postseason positioning, transfer decisions, awards, and career trajectory.
- A depth-chart designation such as QB3 is legitimate football context. Use it naturally: “opens camp third in the quarterback pecking order,” not “the RTG rank is QB3.”
- If a player has not appeared in a game yet, that is not a data problem. It is a football situation. Write about waiting, development, competition, preparation, or the path to playing time.

BYE-WEEK RULES:
- A bye is not an article about the absence of a game. Do not spend paragraphs saying there was no opponent, score, box score, or appearance.
- Preseason/Week 0 bye angles can include arrival on campus, where a freshman fits in the quarterback room, learning curve, patience, competition, preparation for the opener, and what must happen next — only as analysis supported by role/context, never as invented practice reporting.
- Regular-season bye angles can include reset, recovery, correcting trends, quarterback-room evaluation, upcoming opportunity, or season stakes.
- Postseason bye angles can include bracket advantage, preparation window, health/rest, opponent uncertainty, championship path, and pressure — only when supplied facts support those themes.

GAME-WEEK RULES:
- Lead with the football result or player performance when meaningful.
- Use actual statistics the way a sportswriter would: selectively, to support a point. Do not dump every stat into every article.
- Film/analysis coverage may interpret production trends but cannot invent film details, coverages, reads, mechanics, or play design that are not supplied.

COACHING COVERAGE RULES:
- Treat budgets, points, and management counters as background mechanics unless they correspond to a real football event.
- Real stories include recruiting wins/losses, roster turnover, portal movement, staff changes when supplied, depth issues, scheme/results, rivalry pressure, championships, job security, and career movement.

HIGH-SCHOOL COVERAGE RULES:
- During the actual high-school phase, Tape Score, offers, evaluation moments, and preference movement may be covered because they are part of that stage's recruiting story.
- A personal Top Schools order is the player's preference list, not proof of school interest.
- Do not carry these mechanics forward into college-player stories.

WRITING QUALITY:
- Each outlet must sound like a different real newsroom with a distinct angle, cadence, and audience.
- Lead with a genuine lede, not a summary of fields.
- Build a narrative arc: what happened or what the situation is, why it matters, what tension exists, what it could mean, and what comes next.
- Analysis and inference are encouraged when directly supported. Phrase inference naturally: “The larger question is…”, “For Cincinnati, the value of the week is…”, “From a roster standpoint…”. Do not overuse hedging.
- Vary sentence length and paragraph rhythm. Avoid sterile inventories and repetitive templates.
- Write 350 to 650 words per article in 5 to 8 paragraphs.
- Keep headlines concise: 5 to 10 words, active language, one clear angle, no tracker terminology.
- The dek should add stakes rather than repeat the headline.
- Section headings should sound editorial, not like data categories.
- pullQuote is an unattributed editorial takeaway, not a fabricated quotation from a person.
- Sidebars should be reader-useful and outlet-specific. Do not create sidebars titled “Verified Data,” “Current Values,” “Ledger,” or similar. Good examples: “What to watch,” “QB room outlook,” “Next test,” “Season stakes,” “By the numbers” only when using actual football game statistics.
- Use a dateline only when a location is explicitly supplied; otherwise return an empty string.

STORY IMPORTANCE:
- routine: normal preparation, a bye, expected development, ordinary result, or incremental role context.
- notable: meaningful role movement, strong/poor performance, meaningful win/loss, offer/transfer movement, developing decision pressure.
- major: winning a starting job, major upset/rivalry result, major award, significant real injury, transfer decision, record-setting performance, championship-stage result.
- career-defining: rare cornerstone moments such as a championship victory, top national award, defining career record, or similarly historic milestone.

CITATIONS:
- Every factual claim must be supportable by supplied facts.
- citedFactIds are internal grounding metadata only. Never expose them in prose.
- Background-only facts may be cited internally if they influenced cautious analysis, but their raw labels or values must remain invisible.

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
  if (!payload) return json(res, 400, { error: 'A published edition with career facts is required.' });

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: MODEL,
      store: false,
      safety_identifier: user.localId,
      reasoning: { effort: 'low' },
      max_output_tokens: 10000,
      instructions: INSTRUCTIONS,
      input: [{ role: 'user', content: [{ type: 'input_text', text: `Write this newsroom edition from the following internal editorial packet. Remember: background-only facts are never reader-facing raw values.\n${JSON.stringify(payload)}` }] }],
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
