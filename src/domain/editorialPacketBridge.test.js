import test from 'node:test';
import assert from 'node:assert/strict';
import { withPublishedWeekEditorialPacket } from './editorialPacketBridge.js';

test('editorial packet bridge returns packet and derived fact rows', () => {
  const publicationId = 'season-1-week-1';
  const state = {
    player: { name: 'Test QB', college: 'Oregon' },
    weeklyUpdates: [{ id: publicationId, season: 1, week: 1, game: { opponent: 'Baylor', result: 'W', homeScore: 28, awayScore: 21 } }],
    factLedger: [],
  };
  const result = withPublishedWeekEditorialPacket(state, publicationId);
  assert.equal(result.packet.opponent, 'Baylor');
  assert.ok(result.packetFacts.some((fact) => fact.key === 'packet.game.score'));
});
