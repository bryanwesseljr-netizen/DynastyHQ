import test from 'node:test';
import assert from 'node:assert/strict';
import { seedDemo, publishDemo, sampleGame } from '../redesign-demo/store.js';

test('demo confirmation connects corrected facts to the game, Chronicle, recap, and podcast without mutating the source career', () => {
 const before=seedDemo();
 const next=publishDemo(before,{...sampleGame(),homeScore:38,passYds:112});
 assert.equal(before.currentWeek,6);
 assert.equal(before.gameLogs.length,3);
 assert.equal(next.currentWeek,7);
 const publication='season-1-week-6';
 assert.equal(next.gameLogs.at(-1).homeScore,38);
 assert.ok(next.factLedger.some(f=>f.publicationId===publication&&f.key==='game.passYds'&&f.value===112));
 assert.equal(next.careerChronicle.at(-1).id,publication);
 assert.match(next.newsroomIssues.at(-1).articles[0].body,/112 passing yards/);
 assert.match(next.podcastEpisodes.at(-1).script,/38–24/);
 assert.equal(JSON.parse(JSON.stringify(next)).gameLogs.at(-1).homeScore,38);
});

test('demo rejects repeated, stale and invalid publications', () => {
 const before=seedDemo(),next=publishDemo(before,sampleGame());
 assert.throws(()=>publishDemo(next,sampleGame()),/already been published/);
 assert.throws(()=>publishDemo(before,sampleGame(9)),/stale/);
 assert.throws(()=>publishDemo(before,{...sampleGame(),homeScore:''}),/valid whole-number/);
 assert.throws(()=>publishDemo(before,{...sampleGame(),homeScore:-1}),/valid whole-number/);
 assert.throws(()=>publishDemo(before,{...sampleGame(),opponent:''}),/opponent/);
});

test('demo preserves the historical role when the current depth-chart snapshot changes', () => {
 const before=seedDemo();
 const snapshot=before.weeklyUpdates.at(-1).rtgSnapshot;
 const changed={...before,rtg:{...before.rtg,rank:'QB1',coachTrust:9000}};
 const next=publishDemo(changed,sampleGame());
 assert.equal(next.weeklyUpdates.at(-2).rtgSnapshot.rank,snapshot.rank);
 assert.equal(next.weeklyUpdates.at(-1).rtgSnapshot.rank,'QB1');
});
