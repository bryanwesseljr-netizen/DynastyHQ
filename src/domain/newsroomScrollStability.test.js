import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const portalUrl = new URL('../components/NewsroomArticleExperiencePortal.jsx', import.meta.url);

test('Newsroom home reset yields to user scrolling and does not restart on career hydration', async () => {
  const source = await readFile(portalUrl, 'utf8');

  assert.match(source, /import \{ useEffect, useRef \} from 'react';/);
  assert.match(source, /const careerRef = useRef\(career\);/);
  assert.match(source, /careerRef\.current = career;/);
  assert.match(source, /const handleUserScrollIntent = \(\) =>/);
  assert.match(source, /addEventListener\('touchmove', handleUserScrollIntent/);
  assert.match(source, /addEventListener\('wheel', handleUserScrollIntent/);
  assert.match(source, /const scrollOnce = \(\) =>/);
  assert.match(source, /if \(!teamButton\) return;/);
  assert.match(source, /useEffect\(\(\) => \{[\s\S]*?return null;\n\};/);
  assert.doesNotMatch(source, /\}, \[career\]\);\n\n  return null;/);
});
