export const PODCAST_SHOW = Object.freeze({
  name: 'The Gridiron Grind',
  shortName: 'Gridiron Grind',
  brandingVersion: 3,
  description: 'Mark Thompson and Sarah Chen turn each verified football week into a grounded five-to-six-minute show—from recruiting trail to coaching legacy.',
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
    scriptPersona: 'composed lead host and college-football insider: warm, grounded, naturally curious, comfortable making a firm take, asking Sarah direct questions, and reacting in the moment without sounding like an announcer',
    speechInstructions: 'Speak as Mark Thompson, an adult male cohost on a polished American college-football podcast. Use a natural lower male register and warm conversational confidence. Sound like you are sitting across from Sarah in the same studio, responding to her rather than reading narration to an audience. Let pace vary naturally by sentence: quicker on short reactions, slower on thoughtful points. Use subtle pauses, contractions, selective emphasis, and an easy conversational rhythm. Avoid a perfectly even cadence, theatrical sports-radio energy, announcer voice, or over-enunciation.',
  }),
  Object.freeze({
    id: 'tyler-brooks',
    name: 'Sarah Chen',
    role: 'College Football Analyst',
    voice: 'coral',
    scriptPersona: 'sharp college-football analyst: concise, observant, comfortable challenging Mark, adding nuance, making quick reactions, and sounding engaged rather than delivering prepared mini-columns',
    speechInstructions: 'Speak as Sarah Chen, an adult female cohost and college-football analyst on a polished American sports podcast. Use a natural female register, intelligent conversational confidence, and an engaged but relaxed tone. Sound like you are talking directly with Mark in the same room, not presenting a report. Let pace and emphasis change with the thought: quick on agreement or pushback, measured on analysis, slightly slower when reflective. Use natural pauses and contractions. Avoid a perfectly even cadence, theatrical excitement, announcer delivery, or overly crisp recital-style diction.',
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
    if (parsed.protocol !== 'https:' || !/(?:^|\.)blob\.vercel-storage\.com$/i.test(parsed.hostname)) return false;
    // Only covers uploaded through the dedicated Gridiron Grind uploader are trusted.
    // Legacy generic podcast image URLs are intentionally ignored because a deleted
    // Vercel Blob can return a valid-looking missing-image graphic instead of firing onError.
    return /podcast-cover-/i.test(parsed.pathname);
  } catch {
    return false;
  }
};

export const resolvePodcastCoverUrl = (value, fallback = '') => (
  isManagedPodcastCoverUrl(value) ? String(value).trim() : fallback
);
