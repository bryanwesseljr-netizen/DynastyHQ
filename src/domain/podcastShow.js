export const PODCAST_SHOW = Object.freeze({
  name: 'The Gridiron Grind',
  shortName: 'Gridiron Grind',
  description: 'Mark Thompson and Sarah Chen turn each verified career week into a grounded five-to-six-minute college-football show—from recruiting trail to coaching legacy.',
  disclosure: 'AI-generated voices',
});

// These IDs intentionally remain stable for backward compatibility with archived
// scripts and audio. The listener-facing identities are Mark Thompson and Sarah Chen.
export const PODCAST_HOSTS = Object.freeze([
  Object.freeze({
    id: 'marcus-grant',
    name: 'Mark Thompson',
    role: 'Lead Host & College Football Insider',
    voice: 'cedar',
    scriptPersona: 'composed lead host and college-football insider: polished, warm, grounded, curious, and good at setting context without overselling it',
    speechInstructions: 'Speak as Mark Thompson, an adult male lead host on a polished American college-football podcast. Use a natural lower male register, confident newsroom delivery, warm conversational tone, medium pace, and restrained sports-radio energy. Do not sound theatrical or like an announcer caricature.',
  }),
  Object.freeze({
    id: 'tyler-brooks',
    name: 'Sarah Chen',
    role: 'College Football Analyst',
    voice: 'coral',
    scriptPersona: 'sharp college-football analyst: concise, observant, comfortable challenging the obvious narrative, and energetic without becoming theatrical',
    speechInstructions: 'Speak as Sarah Chen, an adult female college-football analyst on a polished American sports podcast. Use a natural female register, clear intelligent delivery, conversational confidence, medium pace, and restrained excitement. Sound analytical and personable rather than theatrical.',
  }),
]);

export const PODCAST_PUBLIC_HOSTS = Object.freeze(PODCAST_HOSTS.map(({ id, name, role }) => Object.freeze({ id, name, role })));

export const PODCAST_HOSTS_BY_ID = new Map(PODCAST_HOSTS.map((host) => [host.id, host]));
export const PODCAST_PUBLIC_HOSTS_BY_ID = new Map(PODCAST_PUBLIC_HOSTS.map((host) => [host.id, host]));

export const canonicalPodcastHost = (hostId) => PODCAST_PUBLIC_HOSTS_BY_ID.get(hostId) || null;

export const canonicalizePodcastHosts = () => PODCAST_PUBLIC_HOSTS.map((host) => ({ ...host }));

export const isManagedPodcastCoverUrl = (value) => {
  const urlValue = String(value || '').trim();
  if (!urlValue) return false;
  if (/^data:image\/(?:png|jpe?g|webp);/i.test(urlValue)) return true;
  try {
    const parsed = new URL(urlValue);
    return parsed.protocol === 'https:' && /(?:^|\.)blob\.vercel-storage\.com$/i.test(parsed.hostname);
  } catch {
    return false;
  }
};

export const resolvePodcastCoverUrl = (value, fallback = '') => (
  isManagedPodcastCoverUrl(value) ? String(value).trim() : fallback
);
