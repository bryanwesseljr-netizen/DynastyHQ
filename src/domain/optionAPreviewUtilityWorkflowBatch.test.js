import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../option-a-preview/PreviewApp.jsx', import.meta.url);
const cssUrl = new URL('../option-a-preview/preview.css', import.meta.url);

test('global search and career alerts replace mockup-only header actions', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /GlobalSearchModal/);
  assert.match(source, /NotificationPanel/);
  assert.match(source, /searchItems=useMemo/);
  assert.match(source, /notificationItems=useMemo/);
  assert.match(source, /unreadNotificationCount=useMemo/);
  assert.match(source, /loadNotificationState/);
  assert.match(source, /saveNotificationState/);
  assert.match(source, /markAllNotificationsRead/);
  assert.match(source, /deleteNotification/);
  assert.match(source, /clearAllNotifications/);
  assert.match(source, /MARK ALL READ/);
  assert.match(source, /CLEAR ALL/);
  assert.match(source, /Delete notification:/);
  assert.match(source, /All caught up\./);
  assert.match(source, /id:'podcast-audio:'\+weekScope/);
  assert.match(source, /Ctrl\/⌘ K/);
  assert.doesNotMatch(source, /notify\('Search preview'\)/);
  assert.doesNotMatch(source, /No new notifications in the mockup/);
});

test('Game Hub week preparation is useful before a new game exists', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /setDetailOpen\('prep'\)/);
  assert.match(source, /POSTGAME CAPTURE CHECKLIST/);
  assert.match(source, /copyPrepChecklist/);
  assert.match(source, /Play first\. Upload after the final\./);
  assert.doesNotMatch(source, /preparation workspace is not part of the redesigned RTG flow yet/);
});

test('Newsroom Archive browses preserved career editions', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /newsroomArchive=/);
  assert.match(source, /Every saved edition/);
  assert.match(source, /openArchiveMoment\(entry\.season,entry\.week,'newsroom'\)/);
  assert.doesNotMatch(source, /Full archive browsing is coming in the archive workflow pass/);
});

test('Podcast chapters jump into the saved transcript instead of showing a toast', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /const openChapter=/);
  assert.match(source, /data-podcast-chapter/);
  assert.match(source, /onClick=\{\(\)=>openChapter\(chapter,index\)\}/);
});

test('career follower share can be disabled without deleting the public master document', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /disableFollowerShare/);
  assert.match(source, /setDoc\(publicRef,\{redesignFollower:null\},\{merge:true\}\)/);
  assert.match(source, /DISABLE FOLLOW LINK/);
});

test('safe-preview wording names every explicit live write lane', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /confirmed Week Processing, master-audio attachment, or career sharing/);
});

test('new workflow surfaces have mobile styles', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /utility workflow batch/);
  assert.match(css, /\.global-search-modal/);
  assert.match(css, /\.notification-panel/);
  assert.match(css, /\.notification-trigger\.has-unread/);
  assert.match(css, /\.notification-toolbar/);
  assert.match(css, /\.notification-item\.is-unread/);
  assert.match(css, /\.notification-delete/);
  assert.match(css, /notification center clarity/);
  assert.match(css, /\.week-prep-checklist/);
  assert.match(css, /\.newsroom-archive-grid/);
});


test('Week Processing exposes a strict week-scoped Game Photos lane and full-box archive selectors', async () => {
  const [source,css] = await Promise.all([readFile(sourceUrl,'utf8'),readFile(cssUrl,'utf8')]);

  assert.match(source, /\['photos','Game Photos',Camera\]/);
  assert.match(source, /STRICT WEEK BOUNDARY/);
  assert.match(source, /weekPublicationId:targetPublicationId/);
  assert.match(source, /assignLibraryPhotosToEdition/);
  assert.match(source, /\['home','gamehub','newsroom','podcast','chronicle'\]\.includes\(pageId\)\?'auto':'manual'/);
  assert.match(source, /className="archive-select"/);
  assert.match(css, /\.archive-select>select\{/);
  assert.match(css, /inset:0!important/);
  assert.match(css, /\.game-photo-grid/);
});


test('week photo fallback does not depend on Newsroom generation succeeding', async () => {
  const source = await readFile(new URL('../option-a-preview/useReadOnlyLiveCareer.js', import.meta.url), 'utf8');

  assert.match(source, /weeklyNewsroomPhoto = \(state = \{\}, issue = null, article = null, fallbackPublicationId = ''\)/);
  assert.match(source, /publicationIdFor\(issue\) \|\| clean\(fallbackPublicationId\)/);
  assert.match(source, /weeklyNewsroomPhoto\(state, issue, rawArticle, publicationId\)/);
});


test('weekly photo resolver remains safe when the selected week has no Newsroom issue', async () => {
  const source = await readFile(new URL('../option-a-preview/useReadOnlyLiveCareer.js', import.meta.url), 'utf8');

  assert.match(source, /\.\.\.\(issue\?\.articles \|\| \[\]\)\.map/);
  assert.doesNotMatch(source, /\.\.\.\(issue\.articles \|\| \[\]\)\.map/);
});



test('home next-game card follows the live career instead of the archived week being viewed',async ()=>{
  const source = await readFile(sourceUrl,'utf8');
  assert.match(source, /const liveCareerNextGame=\(data\)=>/);
  assert.match(source, /nextCareerMatchupForHome\(data\)/);
  const helper = await readFile(new URL('./previewHomeMatchup.js', import.meta.url), 'utf8');
  assert.match(helper, /playedWeeks\.has\(week\)/);
  assert.match(helper, /entry\.completed === true/);
  assert.match(source, /const matchup=liveNextGame/);
  assert.match(source, /<CardHeader title="YOUR NEXT GAME"\/>/);
  assert.match(source, /openArchiveMoment\(matchup\.season,matchup\.week,'gamehub'\)/);
  assert.match(source, /matchup\.awaiting\?go\('gamehub'\)/);
  assert.match(source, /PREPARE NEXT GAME/);
  assert.doesNotMatch(source, /openArchiveMoment\(data\.next\?\.season \|\| data\.season,data\.next\?\.week,'gamehub'\)/);
});

test('Podcast Featured Episode prefers the real master-audio runtime',async ()=>{
  const source = await readFile(sourceUrl,'utf8');
  assert.match(source, /previewAudioDurationForFile/);
  assert.match(source, /masterAudioDurationSeconds/);
  assert.match(source, /const featuredDuration=episode\.audioReady && actualAudioDurationSeconds>0/);
  assert.match(source, /<b>\{featuredDuration\}<\/b>/);
});

test('EA SPORTS Network coverage is promoted as a first-class official artifact',async ()=>{
  const [source,css] = await Promise.all([readFile(sourceUrl,'utf8'),readFile(cssUrl,'utf8')]);
  assert.match(source, /uploadOfficialArticleScreenshots/);
  assert.match(source, /screenshotStoragePath/);
  assert.match(source, /home-official-coverage/);
  assert.match(source, /EA SPORTS NETWORK/);
  assert.match(source, /OfficialCoverageReader/);
  assert.match(source, /stitchedScreenshotUrl/);
  assert.match(source, /OFFICIAL COVERAGE/);
  assert.match(source, /OFFICIAL ARTICLES/);
  assert.match(css, /official EA coverage as a first-class career artifact/);
  assert.match(css, /\.ea-official-reader/);
  assert.match(css, /\.ea-original-artifact/);
});


test('homepage navigation uses explicit targets and flexible cards',async ()=>{
  const [source,css] = await Promise.all([readFile(sourceUrl,'utf8'),readFile(cssUrl,'utf8')]);
  assert.match(source, /onClick=\{\(\)=>openArticle\(data\.news\?\.article\?\.id \|\| ''\)\}/);
  assert.match(source, /openArchiveMoment\(matchup\.season,matchup\.week,'gamehub'\)/);
  assert.match(source, /matchup\.awaiting\?go\('gamehub'\)/);
  assert.match(css, /flexible homepage cards/);
  assert.match(css, /\.home-page \.reference-newsroom-card\{[\s\S]*height:auto!important/);
});


test('Chronicle memory stack and media vault cards navigate to preserved content',async ()=>{
  const [source,css] = await Promise.all([readFile(sourceUrl,'utf8'),readFile(cssUrl,'utf8')]);
  assert.match(source, /className="chronicle-memory-card"/);
  assert.match(source, /openArchiveMoment\(activeSeasonNumber,activeWeekNumber,'newsroom'\)/);
  assert.match(source, /openArchiveMoment\(activeSeasonNumber,activeWeekNumber,'podcast','episode'\)/);
  assert.match(source, /museum-media-grid/);
  assert.match(source, /openChronicleMedia\(latestNewsroomEntry,'newsroom'\)/);
  assert.match(source, /openChronicleMedia\(latestPodcastEntry,'podcast','episode'\)/);
  assert.match(source, /openChronicleMedia\(latestOfficialEntry,'newsroom'\)/);
  assert.match(css, /Chronicle cards are real archive shortcuts/);
  assert.match(css, /\.chronicle-memory-card:not\(:disabled\):hover/);
  assert.match(css, /\.museum-media-grid>button/);
});


test('saved weeks can bypass fresh uploads and attach only optional media',async ()=>{
  const [source,css] = await Promise.all([readFile(sourceUrl,'utf8'),readFile(cssUrl,'utf8')]);
  assert.match(source, /THIS WEEK IS ALREADY SAVED/);
  assert.match(source, /SKIP TO OPTIONAL COVERAGE/);
  assert.match(source, /setRtgSkipped\(true\);setCoverageSkipped\(false\);setPhase\('coverage'\)/);
  assert.match(source, /const mediaOnlyUpdate=hasSavedGame && !selectedGameFacts\.length/);
  assert.match(source, /if\(mediaOnlyUpdate\)\{[\s\S]*nextState=remote;[\s\S]*action='updated'/);
  assert.match(source, /SAVED GAME PRESERVED/);
  assert.match(source, /YES · ATTACH OPTIONAL MEDIA/);
  assert.match(source, /optional media was safely updated\. Existing verified game data was preserved/);
  assert.match(css, /saved-week optional media shortcut/);
  assert.match(css, /\.processing-saved-shortcut/);
});


test('Week Processing exposes one EA SPORTS Network upload path in Coverage only',async ()=>{
  const source=await readFile(sourceUrl,'utf8');
  const uploadButtons=source.match(/UPLOAD EA ARTICLE/g) || [];
  assert.equal(uploadButtons.length,1);
  assert.match(source,/EA SPORTS NETWORK · OPTIONAL/);
  assert.match(source,/use the single optional EA upload in Coverage/);
  assert.match(source,/SKIP TO OPTIONAL COVERAGE/);
  assert.doesNotMatch(source,/Final score · Player stats · Team stats · EA SPORTS Network pages/);
  assert.doesNotMatch(source,/\['EA SPORTS Network','Recognizes article pages without treating them as stats\.'/);
});
