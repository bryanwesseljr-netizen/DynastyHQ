import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPublishedWeekEditorialPacket, editorialPacketFactRows, packetSupportsNarrativeClaim } from './publishedWeekEditorialPacket.js';

test('published week editorial packet consolidates the coverage-reference keys DynastyHQ actually saves', () => {
  const publicationId = 'season-2-week-2';
  const state = {
    player: { name: 'Bryan Wessel', college: 'Oregon' },
    rtg: { rank: 'QB1' },
    weeklyUpdates: [{
      id: publicationId,
      season: 2,
      week: 2,
      game: {
        opponent: 'Baylor', result: 'L', homeScore: 21, awayScore: 45,
        passYds: 184, passTD: 1, rushYds: 14, rushTD: 0, int: 1,
        teamTotalYards: 252, opponentTotalYards: 388,
        teamRushYds: 49, opponentRushYds: 194,
        teamPassYds: 203, opponentPassYds: 194,
        teamTurnovers: 2, opponentTurnovers: 1,
      },
    }],
    factLedger: [
      { publicationId, verified: true, key: 'program.coverage.player_stats.baylor-leading-rusher.abc', label: 'Player Stats: Baylor leading rusher', value: 'Player X — 122 yards, 2 TD', source: 'screenshot-reference', referenceOnly: true },
      { publicationId, verified: true, key: 'program.coverage.other.scoring-summary.def', label: 'Other: Scoring Summary', value: 'Baylor touchdown drive made it 7-0', source: 'screenshot-reference', referenceOnly: true },
      { publicationId, verified: true, key: 'rtg.coachTrust', label: 'Coach Trust', value: 1148 },
      { publicationId, verified: true, key: 'program.coverage.official_media.ea-network-headline.ghi', label: 'Official Media: EA SPORTS Network headline', value: 'Baylor controls Oregon in Eugene', source: 'screenshot-reference', referenceOnly: true },
      { publicationId, verified: true, key: 'program.coverage.official_media.ea-network-framing.jkl', label: 'Official Media: EA SPORTS Network framing', value: 'Baylor controlled the ground game', source: 'screenshot-reference', referenceOnly: true },
    ],
  };

  const packet = buildPublishedWeekEditorialPacket(state, publicationId);
  assert.equal(packet.team, 'Oregon');
  assert.equal(packet.opponent, 'Baylor');
  assert.equal(packet.score, '21-45');
  assert.equal(packet.trackedPlayer.passYds, 184);
  assert.equal(packet.game.comparison.rushingYards.team, 49);
  assert.equal(packet.game.comparison.rushingYards.opponent, 194);
  assert.equal(packet.coverageFacts.length, 4);
  assert.equal(packet.playerStats.length, 1);
  assert.equal(packet.scoringSummary.length, 1);
  assert.equal(packet.rtgFacts.length, 1);
  assert.equal(packet.officialMedia.captured, true);
  assert.equal(packet.officialMedia.headline, 'Baylor controls Oregon in Eugene');
  assert.equal(packet.evidence.hasOfficialMedia, true);

  const rows = editorialPacketFactRows(packet);
  assert.ok(rows.some((row) => row.key === 'packet.game.score' && row.value === '21-45'));
  assert.ok(rows.some((row) => row.key.startsWith('packet.playerStats.')));
  assert.ok(rows.some((row) => row.key.startsWith('packet.scoring.')));
  assert.ok(rows.some((row) => row.key === 'packet.officialMedia.headline'));
});

test('narrative claims that imply game flow require scoring-summary evidence', () => {
  assert.equal(packetSupportsNarrativeClaim({ scoringSummary: [] }, 'rally'), false);
  assert.equal(packetSupportsNarrativeClaim({ scoringSummary: [{ value: 'TD' }, { value: 'FG' }] }, 'rally'), true);
});
