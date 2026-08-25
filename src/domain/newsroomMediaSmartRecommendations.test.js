import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assignLibraryPhotosToEdition,
  NEWSROOM_MEDIA_ORIGINS,
  scoreNewsroomMediaForArticle,
} from './newsroomMedia.js';

test('smart scoring strongly prefers the selected Director scene inside the correct career folder', () => {
  const issue = { id: 'week-1', publicationId: 'week-1', careerPhase: 'Player' };
  const article = { id: 'a1', headline: 'Bearcats prepare for kickoff', dek: 'Pregame feature.', imageSceneOverride: 'tunnel' };
  const tunnel = { id: 'tunnel', careerFolder: 'college', photoType: 'tunnel', sceneTag: 'tunnel', origin: 'upload' };
  const action = { id: 'action', careerFolder: 'college', photoType: 'action', sceneTag: 'pocket-action', origin: 'upload' };
  const highSchoolTunnel = { id: 'hs', careerFolder: 'high-school', photoType: 'tunnel', sceneTag: 'tunnel', origin: 'upload' };

  assert.ok(scoreNewsroomMediaForArticle({ asset: tunnel, article, issue }) > scoreNewsroomMediaForArticle({ asset: action, article, issue }));
  assert.ok(scoreNewsroomMediaForArticle({ asset: tunnel, article, issue }) > scoreNewsroomMediaForArticle({ asset: highSchoolTunnel, article, issue }));
});

test('automatic assignment uses scene-aware ranking while never crossing career folders', () => {
  const issues = [{
    id: 'week-1',
    publicationId: 'week-1',
    careerPhase: 'Player',
    articles: [{
      id: 'a1',
      headline: 'Tunnel anticipation before kickoff',
      dek: 'The team prepares to take the field.',
      imageSceneOverride: 'tunnel',
      mediaAssetId: '',
    }],
  }];
  const mediaLibrary = [
    { id: 'college-action', downloadUrl: 'https://example.com/action.jpg', careerFolder: 'college', photoType: 'action', origin: NEWSROOM_MEDIA_ORIGINS.UPLOAD },
    { id: 'college-tunnel', downloadUrl: 'https://example.com/tunnel.jpg', careerFolder: 'college', photoType: 'tunnel', sceneTag: 'tunnel', origin: NEWSROOM_MEDIA_ORIGINS.UPLOAD },
    { id: 'hs-tunnel', downloadUrl: 'https://example.com/hs.jpg', careerFolder: 'high-school', photoType: 'tunnel', sceneTag: 'tunnel', origin: NEWSROOM_MEDIA_ORIGINS.UPLOAD },
  ];

  const next = assignLibraryPhotosToEdition({ issues, publicationId: 'week-1', mediaLibrary });
  const article = next[0].articles[0];
  assert.equal(article.mediaAssetId, 'college-tunnel');
  assert.equal(article.mediaAutoAssigned, true);
  assert.equal(article.mediaQaStatus, 'unreviewed');
  assert.equal(article.mediaQaAssetId, 'college-tunnel');
});
