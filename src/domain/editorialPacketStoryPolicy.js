import { packetSupportsNarrativeClaim } from './publishedWeekEditorialPacket.js';

const clean = (value, max = 400) => String(value ?? '').trim().slice(0, max);

const claimRules = [
  { pattern: /\brally\b/i, claim: 'rally' },
  { pattern: /\bcomeback\b/i, claim: 'comeback' },
  { pattern: /\bcollapse\b/i, claim: 'collapse' },
  { pattern: /\bblew (?:a |the )?lead\b/i, claim: 'blew a lead' },
  { pattern: /\bcame back\b/i, claim: 'came back' },
  { pattern: /\bturnovers? decided\b/i, claim: 'turnovers decided it' },
  { pattern: /\bturnover battle\b/i, claim: 'turnover battle' },
  { pattern: /\brushing dominance\b/i, claim: 'rushing dominance' },
  { pattern: /\bdominant rushing\b/i, claim: 'dominant rushing' },
];

export const unsupportedNarrativeClaims = (packet = {}, text = '') => claimRules
  .filter(({ pattern, claim }) => pattern.test(clean(text, 10000)) && !packetSupportsNarrativeClaim(packet, claim))
  .map(({ claim }) => claim);

export const assertSupportedNarrativeClaims = (packet = {}, text = '') => {
  const unsupported = unsupportedNarrativeClaims(packet, text);
  if (!unsupported.length) return true;
  const error = new Error(`Unsupported game-flow language: ${unsupported.join(', ')}`);
  error.code = 'UNSUPPORTED_GAME_FLOW_CLAIM';
  error.unsupportedClaims = unsupported;
  throw error;
};
