import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

test('applying actual Game Data emits its week after updating the draft, including week zero', async () => {
  const source = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');
  const start = source.indexOf('  const handleApplyScanDraft = () => {');
  const end = source.indexOf('\n  const getPublicationTarget', start);
  for (const week of [0, 3]) {
    const calls = [];
    const apply = runInNewContext(`${source.slice(start, end)}\nhandleApplyScanDraft;`, {
      scanDraft: { season: 2, week, facts: [{ key: 'game.passYds', value: 210 }], gamePatch: { passYds: 210 }, rtgPatch: {} },
      appState: { currentSeason: 2, currentWeek: 3, careerPhase: 'Player', player: { isCommitted: true } },
      WEEK_TYPES: { BYE: 'bye', NO_APPEARANCE: 'no_appearance' },
      setNewGame: () => {}, setRtgUpdate: () => {}, setCoachUpdate: () => {},
      setAppliedScanDraft: (draft) => calls.push(['applied', draft.status]),
      setScanDraft: (draft) => calls.push(['review', draft]),
      window: { dispatchEvent: (event) => calls.push([event.type, event.detail.publicationId]) },
      CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
      setMessageModal: () => {}, setTimeout: () => {},
    });
    apply();
    assert.deepEqual(calls, [
      ['applied', 'ready'], ['review', null], ['dynastyhq:game-data-applied', `season-2-week-${week}`],
    ]);
  }
});
