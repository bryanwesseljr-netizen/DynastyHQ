import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getNewsroomIssueFolder,
  NEWSROOM_MEDIA_FOLDERS,
} from './newsroomMediaFolders.js';

test('explicit career stages determine Newsroom photo folders before story topic words', () => {
  assert.equal(getNewsroomIssueFolder({
    careerPhase: 'Player',
    coverageStage: 'high-school',
    editionType: 'recruiting',
    label: 'Recruiting update',
  }), NEWSROOM_MEDIA_FOLDERS.HIGH_SCHOOL);

  assert.equal(getNewsroomIssueFolder({
    careerPhase: 'Player',
    coverageStage: 'college',
    editionType: 'recruiting',
    label: 'College recruiting and roster update',
  }), NEWSROOM_MEDIA_FOLDERS.COLLEGE);

  assert.equal(getNewsroomIssueFolder({
    careerPhase: 'OC',
    coverageStage: 'college',
    editionType: 'recruiting',
  }), NEWSROOM_MEDIA_FOLDERS.COACHING);
});

test('ambiguous player-era coverage safely defaults to College instead of guessing High School from recruiting language', () => {
  assert.equal(getNewsroomIssueFolder({
    careerPhase: 'Player',
    editionType: 'recruiting',
    label: 'Recruiting notebook',
  }), NEWSROOM_MEDIA_FOLDERS.COLLEGE);
});
