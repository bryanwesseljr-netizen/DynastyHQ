export const editorialPacketSanity = (packet = {}) => ({
  publicationId: packet.publicationId || '',
  hasGame: Boolean(packet.opponent && packet.score),
  coverageFacts: Array.isArray(packet.playerStats) ? packet.playerStats.length : 0,
  scoringFacts: Array.isArray(packet.scoringSummary) ? packet.scoringSummary.length : 0,
  officialMediaCaptured: Boolean(packet.officialMedia?.captured),
});
