import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publishedOffseasonMedia, offshoreArchiveEntry, offseasonPodcastView, offseasonSpecialLabel} from './offseasonMediaViews.js';

const edition = (season,type)=>({
  id:`offseason-season-${season}-${type}`,
  season,type,school:'Oregon',player:'Quarterback',
  publishedAt:'2026-10-11T10:00:00.000Z',
  article:{headline:type==='portal-entry'?'Entering the Portal':'End of the Season',dek:'An important football story',paragraphs:['A saved story.','Another part of the story.']},
  podcast:{title:type==='portal-entry'?'Portal Episode':'Season Recap',summary:'The Huddle season story',
    chapters:[{title:'Opening Drive',summary:'The playoff run'}],
    segments:[{speaker:'Mark Thompson',text:'What a year.'},{speaker:'Sarah Chen',text:'A playoff semifinal exit.'}]},
  facts:{record:{wins:11,losses:2},latestGame:{opponent:'Alabama',score:{team:33,opponent:48}}},
});
test('published offseason coverage keeps both distinct editions and hides drafts',()=>{
  const review=edition(4,'season-review');
  const portal=edition(4,'portal-entry');
  const unfinished={...edition(3,'season-review'),publishedAt:undefined};
  const empty={...edition(3,'portal-entry'),article:{headline:'',paragraphs:[]}};
  const state={offseasonEditions:[portal,unfinished,empty,review]};
  assert.deepEqual(publishedOffseasonMedia(state,4).map(x=>x.id),[review.id,portal.id]);
  assert.deepEqual(publishedOffseasonMedia(state).map(x=>x.id),[review.id,portal.id]);
  assert.deepEqual(state.offseasonEditions,[portal,unfinished,empty,review],'read-only adapters must not alter saved history');
});
test('offseason archive records are real article entries, with a unique ID after the season weeks',()=>{
  const review=edition(4,'season-review'),item=offshoreArchiveEntry(review);
  assert.equal(item.publicationId,review.id);
  assert.equal(item.week,999);
  assert.equal(item.media.newsroom.headline,review.article.headline);
  assert.strictEqual(item.offseasonEdition,review);
  assert.equal(offseasonSpecialLabel(review),'SEASON RETROSPECTIVE');
  assert.equal(offseasonSpecialLabel(edition(4,'portal-entry')),'TRANSFER PORTAL SPECIAL');
});
test('Huddle special uses the saved script and chapters without assigning weekly audio',()=>{
  const saved=edition(4,'season-review'),episode=offseasonPodcastView(saved);
  assert.equal(episode.title,'Season Recap');
  assert.equal(episode.segments.length,2);
  assert.equal(episode.chapters.length,1);
  assert.match(episode.transcript,/Mark Thompson: What a year/);
  assert.equal(episode.audioReady,false);
  assert.equal(episode.episode,null);
  assert.equal(saved.podcast.audioStatus,undefined);
});
test('preview uses the native newspaper, full article and Huddle episode, not standalone summary links',async()=>{
  const [app,frontpage] = await Promise.all([
    readFile(new URL('../option-a-preview/PreviewApp.jsx',import.meta.url),'utf8'),
    readFile(new URL('../option-a-preview/OffseasonNativeNewsroom.jsx',import.meta.url),'utf8'),
  ]);
  assert.match(app,/isOffseasonWeek \? \(/);
  assert.match(app,/articleOpen && selectedOffseason \? \(/);
  assert.match(app,/allOffseason\.map\(offshoreArchiveEntry\)/);
  assert.match(app,/onPodcast=\{\(\)=>openPodcast\('episode',selectedOffseason\.id\)\}/);
  assert.match(app,/isOffseasonEpisode\?offseasonPodcastView\(chosenOffseason\)/);
  assert.match(app,/disabled=\{masterBusy \|\| isOffseasonEpisode\}/);
  assert.doesNotMatch(app,/<OffseasonSpecialLinks/);
  assert.match(frontpage,/className="lead-story offseason-newspaper-front"/);
  assert.match(frontpage,/className="newsroom-article digital-feature article-skin-national offseason-native-article"/);
  assert.match(frontpage,/article\.paragraphs/);
  assert.match(frontpage,/offseason-article-context-band/);
  assert.doesNotMatch(frontpage,/game\.total/);
});
