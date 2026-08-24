import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const providerUrl = new URL('../components/OwnerCareerContext.jsx', import.meta.url);
const enhancementsUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const quickImportUrl = new URL('../components/QuickImportPortal.jsx', import.meta.url);
const collegeAgendaUrl = new URL('../components/CollegeCareerAgendaCardPortal.jsx', import.meta.url);

test('owner enhancement portals share one owner career provider', async () => {
  const [provider, enhancements] = await Promise.all([
    readFile(providerUrl, 'utf8'),
    readFile(enhancementsUrl, 'utf8'),
  ]);

  assert.match(provider, /export const OwnerCareerProvider/);
  assert.match(provider, /onAuthStateChanged\(auth/);
  assert.match(provider, /onSnapshot\(/);
  assert.match(enhancements, /<OwnerCareerProvider>/);
  assert.match(enhancements, /<QuickImportPortal \/>/);
  assert.match(enhancements, /<CollegeCareerAgendaCardPortal \/>/);
});

test('quick import consumes shared owner state instead of opening another Firebase listener', async () => {
  const source = await readFile(quickImportUrl, 'utf8');

  assert.match(source, /const \{ user, career \} = useOwnerCareer\(\)/);
  assert.doesNotMatch(source, /onAuthStateChanged/);
  assert.doesNotMatch(source, /onSnapshot/);
  assert.doesNotMatch(source, /from 'firebase\/firestore'/);
  assert.match(source, /observer\.observe\(appRoot, \{ childList: true, subtree: true \}\)/);
});

test('college agenda card consumes shared owner state instead of opening another Firebase listener', async () => {
  const source = await readFile(collegeAgendaUrl, 'utf8');

  assert.match(source, /const \{ career: careerState \} = useOwnerCareer\(\)/);
  assert.doesNotMatch(source, /onAuthStateChanged/);
  assert.doesNotMatch(source, /onSnapshot/);
  assert.doesNotMatch(source, /from 'firebase\/firestore'/);
  assert.match(source, /observer\.observe\(appRoot, \{ childList: true, subtree: true \}\)/);
});
