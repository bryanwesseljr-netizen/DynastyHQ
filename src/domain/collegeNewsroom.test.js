import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addCollegeNewsroomStop,
  createCollegeOutletSet,
  normalizeCollegeNewsroom,
  suggestCollegeOutlets,
} from './collegeNewsroom.js';

test('suggests editable local and regional college outlets', () => {
  assert.deepEqual(suggestCollegeOutlets({ city: 'Toledo', state: 'Ohio' }), {
    localOutletName: 'Toledo Gazette',
    regionalOutletName: 'Ohio College Sports Report',
  });
});

test('archives each college stop so transfers cannot rename old editions', () => {
  const first = addCollegeNewsroomStop({
    collegeNewsroom: {}, school: 'Test University', season: 2, week: 1,
    profile: { city: 'Test City', state: 'Michigan', localOutletName: 'Test City Herald', regionalOutletName: 'Great Lakes Sports' },
    startedAt: '2026-09-01T12:00:00.000Z',
  });
  const second = addCollegeNewsroomStop({
    collegeNewsroom: first, school: 'Transfer University', season: 4, week: 1,
    profile: { city: 'New City', state: 'Ohio', localOutletName: 'New City Ledger', regionalOutletName: 'Ohio College Report' },
    startedAt: '2028-01-01T12:00:00.000Z',
  });

  assert.equal(normalizeCollegeNewsroom(second).stops.length, 2);
  assert.equal(createCollegeOutletSet(first, 'Test University')[0].name, 'Test City Herald');
  assert.equal(createCollegeOutletSet(second, 'Transfer University')[1].name, 'Ohio College Report');
  assert.equal(createCollegeOutletSet(second, 'Transfer University')[3].name, 'College Football Central');
});
