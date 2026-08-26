import { PODCAST_PUBLIC_HOSTS } from './podcastShow.js';

const clean = (value, max = 240) => String(value ?? '').trim().slice(0, max);

const hashSeed = (value = '') => {
  let hash = 7;
  for (const character of String(value || 'podcast')) {
    hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  }
  return hash >>> 0;
};

const stableVariant = (items, { seed = '', season = 1, week = 0, salt = '' } = {}) => {
  if (!Array.isArray(items) || !items.length) return null;
  // Week is deliberately part of the arithmetic outside the hash so adjacent
  // episodes naturally rotate instead of repeatedly landing on one template.
  const index = (hashSeed(`${seed}:${salt}`) + (Number(season) || 1) * 17 + (Number(week) || 0)) % items.length;
  return items[index];
};

const firstHost = PODCAST_PUBLIC_HOSTS[0] || { id: 'marcus-grant', name: 'Mark Thompson' };
const secondHost = PODCAST_PUBLIC_HOSTS[1] || { id: 'tyler-brooks', name: 'Sarah Chen' };

const gameOpeners = [
  ({ showName, school, nickname, opponent }) => [
    `${firstHost.name}: Welcome back to ${showName}, your weekly home for ${school} football. I'm ${firstHost.name}.`,
    `${secondHost.name}: And I'm ${secondHost.name}. The ${nickname} just wrapped up their game against ${opponent}, so let's get into what happened and what it means going forward.`,
  ],
  ({ showName, school, nickname, opponent }) => [
    `${secondHost.name}: You're listening to ${showName}. I'm ${secondHost.name}, here with ${firstHost.name}.`,
    `${firstHost.name}: And we've got plenty to talk about after ${school}'s matchup with ${opponent}. Let's start with the biggest takeaway for the ${nickname}.`,
  ],
  ({ showName, school, nickname, opponent }) => [
    `${firstHost.name}: Welcome back, everybody. This is ${showName}, and I'm ${firstHost.name}.`,
    `${secondHost.name}: I'm ${secondHost.name}. ${school} and ${opponent} are in the books, so let's get right into the ${nickname} and what stood out from this one.`,
  ],
  ({ showName, school, nickname, opponent }) => [
    `${secondHost.name}: Welcome back to ${showName}, your local ${school} football podcast. I'm ${secondHost.name}.`,
    `${firstHost.name}: And I'm ${firstHost.name}. The ${nickname} just finished up against ${opponent}, and there is a lot to unpack. Let's get into it.`,
  ],
  ({ showName, school, nickname, opponent }) => [
    `${firstHost.name}: This is ${showName}, and we're back talking ${school} football. I'm ${firstHost.name}.`,
    `${secondHost.name}: And I'm ${secondHost.name}. Today it's all about the ${nickname}' matchup with ${opponent}, so let's jump right into the game.`,
  ],
  ({ showName, school, nickname, opponent }) => [
    `${secondHost.name}: Welcome back to ${showName}. ${secondHost.name} here alongside ${firstHost.name}.`,
    `${firstHost.name}: The ${nickname} had ${opponent} on the schedule this week, and now that the game is over, let's break down what actually mattered for ${school}.`,
  ],
  ({ showName, school, nickname, opponent }) => [
    `${firstHost.name}: You're back with ${showName}. I'm ${firstHost.name}, joined as always by ${secondHost.name}.`,
    `${secondHost.name}: And we're digging into ${school} against ${opponent}. Let's start with the result and work our way through what it means for the ${nickname}.`,
  ],
  ({ showName, school, nickname, opponent }) => [
    `${secondHost.name}: Welcome back. This is ${showName} with ${secondHost.name} and ${firstHost.name}.`,
    `${firstHost.name}: ${school}'s game with ${opponent} is behind us, and it's time to sort through the biggest football takeaways for the ${nickname}.`,
  ],
];

const winOpeners = [
  ({ showName, school, nickname, opponent }) => [
    `${firstHost.name}: Welcome back to ${showName}. I'm ${firstHost.name}.`,
    `${secondHost.name}: And I'm ${secondHost.name}. The ${nickname} have a win over ${opponent} to unpack, so let's get into what ${school} did well and what matters next.`,
  ],
  ({ showName, school, nickname, opponent }) => [
    `${secondHost.name}: You're listening to ${showName}. ${secondHost.name} here with ${firstHost.name}.`,
    `${firstHost.name}: ${school} got the result against ${opponent}. Now let's dig into how the ${nickname} got there and what we should take from it.`,
  ],
  ({ showName, school, nickname, opponent }) => [
    `${firstHost.name}: Welcome back, ${school} football fans. This is ${showName}. I'm ${firstHost.name}.`,
    `${secondHost.name}: And I'm ${secondHost.name}. The ${nickname} came away with the win against ${opponent}, and we've got plenty to break down.`,
  ],
  ({ showName, school, nickname, opponent }) => [
    `${secondHost.name}: Welcome back to ${showName}, your weekly ${school} football conversation. I'm ${secondHost.name}.`,
    `${firstHost.name}: And I'm ${firstHost.name}. It's a winning week for the ${nickname} after the matchup with ${opponent}, so let's get right into the football.`,
  ],
];

const lossOpeners = [
  ({ showName, school, nickname, opponent }) => [
    `${firstHost.name}: Welcome back to ${showName}. I'm ${firstHost.name}.`,
    `${secondHost.name}: And I'm ${secondHost.name}. Not the result the ${nickname} wanted against ${opponent}, but there's a lot to sort through, so let's get into it.`,
  ],
  ({ showName, school, nickname, opponent }) => [
    `${secondHost.name}: You're listening to ${showName}. I'm ${secondHost.name}, alongside ${firstHost.name}.`,
    `${firstHost.name}: ${school} came out of the game with ${opponent} on the wrong side of the result. Let's break down what mattered and where the ${nickname} go from here.`,
  ],
  ({ showName, school, nickname, opponent }) => [
    `${firstHost.name}: Welcome back to ${showName}, your home for our weekly ${school} football conversation. I'm ${firstHost.name}.`,
    `${secondHost.name}: And I'm ${secondHost.name}. The ${nickname} have some things to work through after the loss to ${opponent}, so let's start with the game itself.`,
  ],
  ({ showName, school, nickname, opponent }) => [
    `${secondHost.name}: Welcome back. This is ${showName} with ${secondHost.name} and ${firstHost.name}.`,
    `${firstHost.name}: The ${nickname} didn't get the result against ${opponent}. There's no reason to dance around it, so let's get into what the game told us about ${school}.`,
  ],
];

const byeOpeners = [
  ({ showName, school, nickname }) => [
    `${firstHost.name}: Welcome back to ${showName}. I'm ${firstHost.name}.`,
    `${secondHost.name}: And I'm ${secondHost.name}. The ${nickname} didn't take the field this week, but there is still meaningful ${school} football to talk about.`,
  ],
  ({ showName, school, nickname }) => [
    `${secondHost.name}: You're listening to ${showName}. ${secondHost.name} here with ${firstHost.name}.`,
    `${firstHost.name}: It's a bye week for the ${nickname}, so we're using the time to focus on what has actually changed around ${school} football.`,
  ],
  ({ showName, school, nickname }) => [
    `${firstHost.name}: Welcome back to ${showName}, your weekly ${school} football podcast. I'm ${firstHost.name}.`,
    `${secondHost.name}: I'm ${secondHost.name}. No game for the ${nickname} this week, but there are still real program storylines worth getting into.`,
  ],
  ({ showName, school, nickname }) => [
    `${secondHost.name}: Welcome back to ${showName}. I'm ${secondHost.name}, alongside ${firstHost.name}.`,
    `${firstHost.name}: The ${nickname} had the week off from game action, which gives us a chance to dig into the biggest verified development around ${school}.`,
  ],
];

const programOpeners = [
  ({ showName, school, nickname }) => [
    `${firstHost.name}: Welcome back to ${showName}. I'm ${firstHost.name}.`,
    `${secondHost.name}: And I'm ${secondHost.name}. This episode is about what's changing around the ${nickname}, so let's get into the biggest ${school} football development.`,
  ],
  ({ showName, school, nickname }) => [
    `${secondHost.name}: You're listening to ${showName}. I'm ${secondHost.name}, here with ${firstHost.name}.`,
    `${firstHost.name}: We've got a program-focused show today, and the ${nickname} have a real football development worth talking through.`,
  ],
  ({ showName, school, nickname }) => [
    `${firstHost.name}: Welcome back to ${showName}, your weekly home for ${school} football. I'm ${firstHost.name}.`,
    `${secondHost.name}: And I'm ${secondHost.name}. Let's skip the housekeeping and get straight into what changed around the ${nickname}.`,
  ],
  ({ showName, school, nickname }) => [
    `${secondHost.name}: Welcome back. This is ${showName} with ${secondHost.name} and ${firstHost.name}.`,
    `${firstHost.name}: There's a meaningful ${school} football story to work through today, so let's get right into it.`,
  ],
];

const signoffs = [
  ({ showName }) => [
    `${firstHost.name}: That'll do it for this week's edition of ${showName}.`,
    `${secondHost.name}: For ${firstHost.name}, I'm ${secondHost.name}. Thanks for listening, and we'll talk to you again soon.`,
  ],
  ({ showName, school }) => [
    `${secondHost.name}: That's all for us on ${showName}.`,
    `${firstHost.name}: For ${secondHost.name}, I'm ${firstHost.name}. Thanks for spending some time with us, and we'll be back with more ${school} football.`,
  ],
  ({ showName, school }) => [
    `${firstHost.name}: Another week of ${school} football conversation is in the books.`,
    `${secondHost.name}: And another ${showName} is wrapped up. Thanks for listening. We'll catch you next time.`,
  ],
  ({ showName, nickname }) => [
    `${secondHost.name}: That's going to do it for today's show.`,
    `${firstHost.name}: Thanks for joining us on ${showName}. We'll be back soon with more on the ${nickname}.`,
  ],
  ({ showName, school }) => [
    `${firstHost.name}: That wraps up today's ${showName}.`,
    `${secondHost.name}: Thanks for being with us. For ${firstHost.name}, I'm ${secondHost.name}, and we'll talk ${school} football again soon.`,
  ],
  ({ showName }) => [
    `${secondHost.name}: We'll leave it there for this episode.`,
    `${firstHost.name}: This has been ${showName}. Thanks for listening, and we'll see you next time.`,
  ],
];

const splitHostLine = (line, fallbackHost) => {
  const raw = clean(line, 1000);
  const separator = raw.indexOf(':');
  if (separator < 0) return { host: fallbackHost, text: raw };
  const name = raw.slice(0, separator).trim();
  const host = [firstHost, secondHost].find((entry) => entry.name === name) || fallbackHost;
  return { host, text: raw.slice(separator + 1).trim() };
};

const resultCode = (value = '') => {
  const normalized = clean(value, 80).toUpperCase();
  if (normalized === 'W' || normalized.startsWith('W ')) return 'W';
  if (normalized === 'L' || normalized.startsWith('L ')) return 'L';
  return '';
};

const contextFor = (payload = {}) => {
  const show = payload.show || {};
  const context = payload.episodeContext || {};
  const school = clean(show.school || context.school || payload.coveragePlan?.program?.school, 160) || 'the program';
  const nickname = clean(show.nickname || context.nickname, 120) || school;
  const showName = clean(show.name, 160) || `${school} Football Notebook`;
  const opponent = clean(context.opponent || payload.coveragePlan?.program?.currentGame?.opponent, 160);
  const result = resultCode(context.result || payload.coveragePlan?.program?.currentGame?.result);
  const weekType = clean(payload.weekType, 60).toLowerCase();
  const isBye = weekType.includes('bye') || context.didPlay === false;

  return {
    showName,
    school,
    nickname,
    opponent,
    result,
    isBye,
    season: Number(payload.season) || 1,
    week: Math.max(0, Number(payload.week) || 0),
    seed: clean(payload.publicationId, 160) || `${school}:${payload.season || 1}:${payload.week || 0}`,
  };
};

const linesToSegments = (lines, { prefix, chapterId }) => lines.map((line, index) => {
  const fallbackHost = index % 2 === 0 ? firstHost : secondHost;
  const { host, text } = splitHostLine(line, fallbackHost);
  return {
    id: `${prefix}-${index + 1}`,
    hostId: host.id,
    chapterId,
    text,
    deliveryStyle: index === 0 ? 'neutral' : 'analytical',
    citedFactKeys: [],
  };
}).filter((segment) => segment.text);

export const isPodcastBookendSegment = (segment = {}) => /^show-(?:open|close)-/i.test(clean(segment.id, 100));

export const applyPodcastShowBookends = ({ episode = {}, payload = {} } = {}) => {
  const existing = Array.isArray(episode?.segments) ? episode.segments : [];
  if (existing.some(isPodcastBookendSegment)) return episode;

  const context = contextFor(payload);
  const openingPool = context.isBye
    ? byeOpeners
    : context.opponent
      ? context.result === 'W'
        ? winOpeners
        : context.result === 'L'
          ? lossOpeners
          : gameOpeners
      : programOpeners;
  const openingBuilder = stableVariant(openingPool, {
    seed: context.seed,
    season: context.season,
    week: context.week,
    salt: 'opening',
  });
  const closingBuilder = stableVariant(signoffs, {
    seed: context.seed,
    season: context.season,
    week: context.week,
    salt: 'closing',
  });

  const firstChapterId = clean(episode?.chapters?.[0]?.id, 80) || clean(existing[0]?.chapterId, 80) || 'opening-drive';
  const lastChapterId = clean(episode?.chapters?.[episode?.chapters?.length - 1]?.id, 80)
    || clean(existing[existing.length - 1]?.chapterId, 80)
    || firstChapterId;
  const openingSegments = linesToSegments(openingBuilder(context), { prefix: 'show-open', chapterId: firstChapterId });
  const closingSegments = linesToSegments(closingBuilder(context), { prefix: 'show-close', chapterId: lastChapterId });
  const shift = openingSegments.length;
  const chapters = (episode?.chapters || []).map((chapter, index) => ({
    ...chapter,
    segmentStart: index === 0 ? 0 : Math.max(0, Number(chapter.segmentStart) || 0) + shift,
  }));

  return {
    ...episode,
    showName: context.showName,
    showSchool: context.school,
    showNickname: context.nickname,
    opponent: context.opponent,
    segments: [...openingSegments, ...existing, ...closingSegments],
    chapters,
  };
};
