import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

test('review visibility observer settles, restores hidden ancestors, and cleans up after review', async () => {
  const source = await readFile(new URL('../components/SessionImportPortal.jsx', import.meta.url), 'utf8');
  const start = source.indexOf("    if (!open || phase !== 'review') return undefined;");
  const end = source.indexOf('\n  }, [open, phase]);', start);
  assert.ok(start >= 0 && end > start);
  const marker = 'dhq-session-import-review-path';
  let observer;
  let pending = false;
  let writes = 0;
  const element = (parentElement = null) => {
    const classes = new Set();
    return {
      parentElement,
      classList: {
        contains: (name) => classes.has(name),
        add(name) { classes.add(name); writes += 1; if (observer?.active) pending = true; },
        remove(name) { classes.delete(name); writes += 1; if (observer?.active) pending = true; },
      },
    };
  };
  const root = element();
  const agenda = element(root);
  const outer = element(agenda);
  const inner = element(outer);
  let review = { parentElement: inner, closest: () => agenda };
  const cleanup = runInNewContext(`(() => { ${source.slice(start, end)} })()`, {
    open: true,
    phase: 'review',
    document: { getElementById: () => root, querySelector: () => review },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; observer = this; }
      observe() { this.active = true; }
      disconnect() { this.active = false; pending = false; }
    },
  });
  const settle = () => {
    let rounds = 0;
    while (pending && rounds < 10) {
      pending = false;
      rounds += 1;
      observer.callback();
    }
    assert.equal(pending, false, 'observer must not continually trigger itself');
  };

  assert.ok(inner.classList.contains(marker) && outer.classList.contains(marker));
  const initialWrites = writes;
  pending = true; // An unrelated React update inside the observed root.
  settle();
  assert.equal(writes, initialWrites, 'unchanged ancestors require no class writes');

  inner.classList.remove(marker); // React replaces a wrapper className.
  settle();
  assert.ok(inner.classList.contains(marker));

  const replacement = element(agenda);
  review = { parentElement: replacement, closest: () => agenda };
  pending = true;
  settle();
  assert.ok(replacement.classList.contains(marker));
  assert.ok(!inner.classList.contains(marker) && !outer.classList.contains(marker));

  review = null;
  pending = true;
  settle();
  assert.equal(replacement.classList.contains(marker), false);

  review = { parentElement: replacement, closest: () => agenda };
  pending = true;
  settle();
  cleanup();
  assert.equal(observer.active, false);
  assert.equal(replacement.classList.contains(marker), false);
});
