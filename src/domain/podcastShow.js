import { resolveCareerTeamMediaProfile } from './teamMediaProfile.js';

export const PODCAST_SHOW = Object.freeze({
  name: 'Nippert Notebook',
  shortName: 'Nippert Notebook',
  brandingVersion: 4,
  description: 'Mark Thompson and Sarah Chen cover the current program like a local football beat: every game, role change, roster storyline and meaningful week in context.',
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
    scriptPersona: 'experienced local football beat host: Mark covers this program every week, remembers prior games and role changes, leads with the team story, asks Sarah direct football questions, and sounds like someone who knows the locker-room context without inventing private access or facts',
    speechInstructions: 'Speak as Mark Thompson, an adult male host on a polished local college-football podcast dedicated to one program. Use a natural lower male register and warm conversational confidence. Sound like a beat reporter talking with Sarah after following this team all season, not like a national studio anchor parachuting into one story. Refer naturally to prior verified weeks when supplied, keep the program and game as the frame, and react to Sarah rather than reading narration. Let pace vary naturally. Avoid theatrical sports-radio energy, announcer voice, fake insider claims, or invented private conversations.',
  }),
  Object.freeze({
    id: 'tyler-brooks',
    name: 'Sarah Chen',
    role: 'Football Analyst & Recruiting Reporter',
    voice: 'coral',
    scriptPersona: 'sharp local team analyst and recruiting reporter: Sarah knows the current roster story, player development, recruiting and matchup context, challenges Mark when appropriate, and connects this week to what has actually changed without turning the conversation into a national roundup',
    speechInstructions: 'Speak as Sarah Chen, an adult female cohost and football analyst on a polished local college-football podcast dedicated to one program. Use a natural female register, intelligent conversational confidence, and an engaged but relaxed tone. Sound like you cover this team every week and are talking directly with Mark in the same room. Build on verified prior context when it is supplied, focus on football meaning rather than game mechanics, and never imply private sourcing that is not in the packet. Avoid a national-anchor voice, theatrical excitement, or recital-style diction.',
  }),
]);

export const PODCAST_PUBLIC_HOSTS = Object.freeze(PODCAST_HOSTS.map(({ id, name, role }) => Object.freeze({ id, name, role })));

export const PODCAST_HOSTS_BY_ID = new Map(PODCAST_HOSTS.map((host) => [host.id, host]));
export const PODCAST_PUBLIC_HOSTS_BY_ID = new Map(PODCAST_PUBLIC_HOSTS.map((host) => [host.id, host]));

export const canonicalPodcastHost = (hostId) => PODCAST_PUBLIC_HOSTS_BY_ID.get(hostId) || null;

export const canonicalizePodcastHosts = () => PODCAST_PUBLIC_HOSTS.map((host) => ({ ...host }));

export const resolvePodcastShow = (state = {}) => {
  const team = resolveCareerTeamMediaProfile(state);
  return {
    ...PODCAST_SHOW,
    name: team.podcastName || PODCAST_SHOW.name,
    shortName: team.podcastName || PODCAST_SHOW.shortName,
    description: team.podcastTagline || PODCAST_SHOW.description,
    subtitle: team.podcastSubtitle || `${team.school} Football Podcast`,
    school: team.school,
    nickname: team.nickname,
    city: team.city,
    primary: team.primary,
    secondary: team.secondary,
    accent: team.accent,
    hostsLabel: team.podcastHostsLabel,
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
    // artwork uploader used by the local podcast identity system.
    return /podcast-cover-|podcast-[^/]+-(?:primary|editorial|hosts)-/i.test(parsed.pathname);
  } catch {
    return false;
  }
};

export const resolvePodcastCoverUrl = (value, fallback = '') => (
  isManagedPodcastCoverUrl(value) ? String(value).trim() : fallback
);
