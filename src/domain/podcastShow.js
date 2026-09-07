import { resolveCareerTeamMediaProfile } from './teamMediaProfile.js';

export const PODCAST_SHOW = Object.freeze({
  name: 'The Huddle Podcast',
  shortName: 'The Huddle',
  brandingVersion: 5,
  description: 'A career-long football show that previews and reviews each season, breaks down weekly games with verified in-game stats, and follows the storylines that actually develop in the save.',
  disclosure: 'AI-generated voices',
});

// These IDs intentionally remain stable for backward compatibility with archived
// scripts and audio. The listener-facing identities are Mark Thompson and Sarah Chen.
export const PODCAST_HOSTS = Object.freeze([
  Object.freeze({
    id: 'marcus-grant',
    name: 'Mark Thompson',
    role: 'Lead Host & Team Beat Reporter',
    voice: 'cedar',
    scriptPersona: 'experienced football beat host: Mark follows the current team and career chapter every week, remembers prior verified games and role changes, leads with the team story, asks Sarah direct football questions, and sounds like someone following the season closely without inventing private access or facts',
    speechInstructions: 'Speak as Mark Thompson, an adult male host on a polished football podcast that follows one career across teams and seasons. Use a natural lower male register and warm conversational confidence. Sound like a beat reporter who has followed the current team all season, not a national studio anchor parachuting into one story. Refer naturally to prior verified weeks when supplied, keep the current program and game as the frame, and react to Sarah rather than reading narration. Let pace vary naturally. Avoid theatrical sports-radio energy, announcer voice, fake insider claims, or invented private conversations.',
  }),
  Object.freeze({
    id: 'tyler-brooks',
    name: 'Sarah Chen',
    role: 'Football Analyst & Recruiting Reporter',
    voice: 'coral',
    scriptPersona: 'sharp football analyst and recruiting reporter: Sarah knows the current roster story, player development, recruiting and matchup context, challenges Mark when appropriate, and connects this week to what has actually changed without turning the conversation into a generic national roundup',
    speechInstructions: 'Speak as Sarah Chen, an adult female cohost and football analyst on a polished career-long football podcast. Use a natural female register, intelligent conversational confidence, and an engaged but relaxed tone. Sound like you cover the current team every week and are talking directly with Mark in the same room. Build on verified prior context when it is supplied, focus on football meaning rather than game mechanics, and never imply private sourcing that is not in the packet. Avoid a national-anchor voice, theatrical excitement, or recital-style diction.',
  }),
]);

export const PODCAST_PUBLIC_HOSTS = Object.freeze(PODCAST_HOSTS.map(({ id, name, role }) => Object.freeze({ id, name, role })));

export const PODCAST_HOSTS_BY_ID = new Map(PODCAST_HOSTS.map((host) => [host.id, host]));
export const PODCAST_PUBLIC_HOSTS_BY_ID = new Map(PODCAST_PUBLIC_HOSTS.map((host) => [host.id, host]));

export const canonicalPodcastHost = (hostId) => PODCAST_PUBLIC_HOSTS_BY_ID.get(hostId) || null;

export const canonicalizePodcastHosts = () => PODCAST_PUBLIC_HOSTS.map((host) => ({ ...host }));

export const resolvePodcastShow = (state = {}) => {
  const team = resolveCareerTeamMediaProfile(state);
  const school = team.school === 'College' ? '' : team.school;
  const chapterLabel = school ? `${school} Football` : 'Road to Glory';
  return {
    ...PODCAST_SHOW,
    // The show identity is intentionally universal. Team media profiles still
    // provide colors and local context, but they no longer rename the podcast.
    name: PODCAST_SHOW.name,
    shortName: PODCAST_SHOW.shortName,
    description: PODCAST_SHOW.description,
    subtitle: `${chapterLabel} · Weekly Preview & Review`,
    school: school || 'Road to Glory',
    nickname: team.nickname,
    city: team.city,
    primary: team.primary,
    secondary: team.secondary,
    accent: team.accent,
    hostsLabel: team.podcastHostsLabel || 'Mark Thompson · Sarah Chen',
  };
};

export const isManagedPodcastCoverUrl = (value) => {
  const urlValue = String(value || '').trim();
  if (!urlValue) return false;
  if (/^data:image\/(?:png|jpe?g|webp);/i.test(urlValue)) return true;
  try {
    const parsed = new URL(urlValue);
    if (parsed.protocol !== 'https:' || !/(?:^|\.)blob\.vercel-storage\.com$/i.test(parsed.hostname)) return false;
    // Accept both the legacy dedicated cover uploader and the newer program-specific
    // artwork uploader used by the podcast identity system.
    return /podcast-cover-|podcast-[^/]+-(?:primary|editorial|hosts)-/i.test(parsed.pathname);
  } catch {
    return false;
  }
};

export const resolvePodcastCoverUrl = (value, fallback = '') => (
  isManagedPodcastCoverUrl(value) ? String(value).trim() : fallback
);
