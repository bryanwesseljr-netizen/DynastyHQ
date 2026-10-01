import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DYNASTY_VIEW_SESSION_KEY,
  readDynastyViewSession,
  resetDynastyNewsroomHome,
  updateDynastyViewSession,
} from './viewSession.js';

const fakeStorage = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
  };
};

test('view session preserves route, scroll, viewport and nested Newsroom state', () => {
  const storage = fakeStorage();
  updateDynastyViewSession({
    activeTab: 'newsroom',
    scroll: { mainTop: 418, windowY: 12 },
    viewport: { scale: 2.1, pageTop: 412 },
    newsroom: {
      activeDesk: 'regional',
      readerOpen: true,
      selectedIssueId: 'week-10',
      selectedOutletId: 'regional',
    },
  }, storage);
  updateDynastyViewSession({ scroll: { mainLeft: 22 } }, storage);

  const restored = readDynastyViewSession(storage);
  assert.equal(restored.activeTab, 'newsroom');
  assert.equal(restored.scroll.mainTop, 418);
  assert.equal(restored.scroll.mainLeft, 22);
  assert.equal(restored.viewport.scale, 2.1);
  assert.equal(restored.newsroom.activeDesk, 'regional');
  assert.equal(restored.newsroom.readerOpen, true);
  assert.equal(storage.getItem(DYNASTY_VIEW_SESSION_KEY) !== null, true);
});

test('requesting Newsroom home selects Front Page and clears article state only', () => {
  const storage = fakeStorage();
  updateDynastyViewSession({
    activeTab: 'podcast',
    newsroom: {
      activeDesk: 'national',
      readerOpen: true,
      selectedIssueId: 'week-9',
      selectedOutletId: 'national',
    },
  }, storage);

  resetDynastyNewsroomHome(storage);
  const restored = readDynastyViewSession(storage);
  assert.equal(restored.activeTab, 'podcast');
  assert.deepEqual(restored.newsroom, {
    activeDesk: 'front',
    readerOpen: false,
    selectedIssueId: '',
    selectedOutletId: '',
    frontPageIssueId: '',
  });
});

test('App and Newsroom components wire the saved view back into their initial state', async () => {
  const [app, grounded, hub] = await Promise.all([
    import('node:fs/promises').then(({ readFile }) => readFile(new URL('../App.jsx', import.meta.url), 'utf8')),
    import('node:fs/promises').then(({ readFile }) => readFile(new URL('../components/GroundedNewsroom.jsx', import.meta.url), 'utf8')),
    import('node:fs/promises').then(({ readFile }) => readFile(new URL('../components/NewsroomTeamHubPortal.jsx', import.meta.url), 'utf8')),
  ]);

  assert.match(app, /RESTORABLE_APP_TABS\.has\(initialViewSession\.activeTab\)/);
  assert.match(app, /useState\(frontPageParam \? 'newsroom' : restoredActiveTab\)/);
  assert.match(app, /mainTop: Number\(main\?\.scrollTop\)/);
  assert.match(app, /\[0, 90, 240, 520, 900, 1500\]/);
  assert.match(grounded, /restoredNewsroom\.selectedIssueId/);
  assert.match(grounded, /readerOpen: isReaderOpen/);
  assert.match(hub, /restoredDesk/);
  assert.match(hub, /updateDynastyViewSession\(\{ newsroom: \{ activeDesk \} \}\)/);
});
