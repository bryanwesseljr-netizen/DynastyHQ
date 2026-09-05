import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSourceUrl = new URL('../App.jsx', import.meta.url);
const newsroomSourceUrl = new URL('../components/GroundedNewsroom.jsx', import.meta.url);
const newsroomEmptyStateSourceUrl = new URL('../components/NewsroomEmptyState.jsx', import.meta.url);
const newsroomMediaSourceUrl = new URL('../components/NewsroomMediaManager.jsx', import.meta.url);
const podcastStudioSourceUrl = new URL('../components/PodcastStudio.jsx', import.meta.url);
const commandCenterSourceUrl = new URL('../components/CareerCommandCenter.jsx', import.meta.url);
const dashboardV2SourceUrl = new URL('../components/CareerDashboardV2.jsx', import.meta.url);
const dashboardV2StylesUrl = new URL('../dashboard-v2.css', import.meta.url);
const playerRecruitingSourceUrl = new URL('../components/PlayerRecruitingWorkspace.jsx', import.meta.url);
const globalStylesUrl = new URL('../index.css', import.meta.url);

test('the fixed workspace background cannot intercept newsroom article clicks', async () => {
  const [appSource, newsroomSource] = await Promise.all([
    readFile(appSourceUrl, 'utf8'),
    readFile(newsroomSourceUrl, 'utf8'),
  ]);

  assert.match(
    appSource,
    /className="pointer-events-none absolute inset-0 z-0 fixed" aria-hidden="true"/,
  );
  assert.match(
    newsroomSource,
    /className="relative z-10 mx-auto max-w-6xl space-y-6 pb-20 animate-in fade-in"/,
  );
});

test('Career Chronicle ships with the app shell so commitment navigation cannot lose its lazy chunk', async () => {
  const appSource = await readFile(appSourceUrl, 'utf8');

  assert.match(appSource, /import CareerArchive from '\.\/components\/CareerArchive';/);
  assert.doesNotMatch(appSource, /lazy\(\(\) => import\('\.\/components\/CareerArchive'\)\)/);
});

test('the newsroom keeps podcast controls in the dedicated Gridiron Grind workspace', async () => {
  const [appSource, newsroomSource] = await Promise.all([
    readFile(appSourceUrl, 'utf8'),
    readFile(newsroomSourceUrl, 'utf8'),
  ]);

  assert.doesNotMatch(appSource, /setNewsTheme\('podcast'\)/);
  assert.doesNotMatch(newsroomSource, /Podcast Brief|Open Podcast Studio|openStory\('podcast'\)/);
  assert.match(appSource, /\{ id: 'podcast', icon: Radio, label: 'Gridiron Grind Podcast' \}/);
  assert.match(appSource, /activeTab === 'podcast'/);
});

test('the career photo library cannot silently trigger paid AI image generation', async () => {
  const [appSource, mediaSource, newsroomSource] = await Promise.all([
    readFile(appSourceUrl, 'utf8'),
    readFile(newsroomMediaSourceUrl, 'utf8'),
    readFile(newsroomSourceUrl, 'utf8'),
  ]);

  assert.match(mediaSource, /Add Photos to Library/);
  assert.match(mediaSource, /Automatically choose library photos/);
  assert.match(mediaSource, /never generates an AI image or uses API image credits/);
  assert.match(newsroomSource, /Reusable Career Media/);
  assert.match(newsroomSource, /Career Photo Library/);
  assert.match(appSource, /assignLibraryPhotosToEdition/);
  assert.doesNotMatch(appSource, /handleGenerateNewsroomMedia\(\{ issue: latestIssue/);
});

test('the podcast studio recovers from incomplete legacy episode data instead of black-screening', async () => {
  const podcastSource = await readFile(podcastStudioSourceUrl, 'utf8');

  assert.match(podcastSource, /class PodcastStudioBoundary extends Component/);
  assert.match(podcastSource, /The studio hit a playback problem/);
  assert.match(podcastSource, /Array\.isArray\(episode\?\.segments\)/);
  assert.match(podcastSource, /const archivedBrief = briefForIssue\(archiveIssue\)/);
  assert.match(podcastSource, /archivedEpisode\?\.title \|\| archivedBrief\.title/);
  assert.doesNotMatch(podcastSource, /archiveIssue\.podcastBrief\.title/);
});

test('the app opens on the command-center homepage with one responsive top navigation', async () => {
  const appSource = await readFile(appSourceUrl, 'utf8');

  assert.match(appSource, /useState\(frontPageParam \? 'newsroom' : 'dashboard'\)/);
  assert.match(appSource, /<header className="fixed inset-x-0 top-0/);
  assert.match(appSource, /aria-label="Primary navigation"/);
  assert.match(appSource, /Dynasty <span className="text-amber-400">HQ<\/span>/);
  assert.doesNotMatch(appSource, /\{ id: 'commandCenter', icon: Activity/);
  assert.doesNotMatch(appSource, /const commandCenterLabel =/);
  assert.match(appSource, /item\.id === 'podcast' \? 'Podcast' : item\.label/);
  assert.match(appSource, /dhq-primary-nav hidden min-w-0 flex-1 items-stretch overflow-hidden/);
  assert.doesNotMatch(appSource, /gridTemplateColumns/);
  assert.match(appSource, /dhq-settings-share-button/);
  assert.match(appSource, /getElementById\('recruit-command-center'\)/);
  assert.match(appSource, /getElementById\('dynastyhq-command-center'\)/);
  assert.match(appSource, /if \(tab === 'commandCenter'\)/);
  assert.doesNotMatch(appSource, /fixed inset-y-0 left-0/);
});

test('the mobile menu keeps weekly agenda visible and reachable on short screens', async () => {
  const appSource = await readFile(appSourceUrl, 'utf8');

  assert.match(appSource, /label: 'Weekly Agenda', mobileLabel: 'Log Weekly Agenda'/);
  assert.match(appSource, /const mobileNavItems = \[/);
  assert.match(appSource, /navItems\.filter\(\(item\) => item\.id === 'dataEntry'\)/);
  assert.match(appSource, /max-h-\[calc\(100dvh-64px\)\] overflow-y-auto overscroll-contain/);
  assert.match(appSource, /mobileNavItems\.map\(\(item\) =>/);
  assert.match(appSource, /item\.mobileLabel \|\| item\.label/);
});

test('every workspace uses the same football-only presentation background', async () => {
  const [appSource, globalStyles] = await Promise.all([
    readFile(appSourceUrl, 'utf8'),
    readFile(globalStylesUrl, 'utf8'),
  ]);

  assert.match(appSource, /import footballStadiumBg from '\.\/assets\/dynastyhq-football-stadium-bg\.webp';/);
  assert.match(appSource, /const getBgImage = \(\) => footballStadiumBg;/);
  assert.match(appSource, /data-background-sport="football"/);
  assert.match(appSource, /dhq-page-main relative w-full flex-1 overflow-y-auto/);
  assert.match(appSource, /object-cover opacity-\[0\.72\]/);
  assert.match(appSource, /from-slate-950\/28 via-slate-950\/38 to-slate-950\/64/);
  assert.match(globalStyles, /rgba\(5, 14, 19, 0\.46\)/);
  assert.match(globalStyles, /rgba\(9, 20, 31, 0\.5\)/);
  assert.match(globalStyles, /rgba\(2, 8, 15, 0\.42\)/);
  assert.doesNotMatch(appSource, /case 'newsroom': return/);
  assert.doesNotMatch(appSource, /case 'podcast': return/);
});

test('desktop workspaces use compact route-aware spacing without changing mobile density', async () => {
  const [appSource, playerRecruitingSource, globalStyles] = await Promise.all([
    readFile(appSourceUrl, 'utf8'),
    readFile(playerRecruitingSourceUrl, 'utf8'),
    readFile(globalStylesUrl, 'utf8'),
  ]);

  assert.match(appSource, /<main data-active-tab=\{activeTab\} className=\{`dhq-page-main/);
  assert.match(globalStyles, /\.dhq-page-main\[data-active-tab\]:not\(\[data-active-tab="dashboard"\]\)/);
  assert.match(globalStyles, /padding: 139px 16px 14px !important/);
  assert.match(globalStyles, /data-active-tab="recruiting"/);
  assert.match(globalStyles, /data-active-tab="newsroom"/);
  assert.match(globalStyles, /data-active-tab="chronicle"/);
  assert.match(globalStyles, /data-active-tab="podcast"/);
  assert.match(globalStyles, /data-active-tab="settings"/);
  assert.match(globalStyles, /data-active-tab="trophies"/);
  assert.match(playerRecruitingSource, /relative z-10 mx-auto max-w-6xl space-y-3 pb-20 animate-in fade-in/);
  assert.match(playerRecruitingSource, /relative z-10 mx-auto max-w-7xl space-y-3 pb-20 animate-in fade-in/);
  assert.match(playerRecruitingSource, /grid grid-cols-3 gap-2/);
  assert.match(playerRecruitingSource, /grid grid-cols-4 gap-2/);
  assert.match(playerRecruitingSource, /md:grid-cols-\[minmax\(0,1\.2fr\)_minmax\(0,1fr\)_minmax\(0,1fr\)_auto\]/);
  assert.match(playerRecruitingSource, /grid gap-2 border-t border-slate-800 p-4 sm:grid-cols-5/);
  assert.match(appSource, /dhq-weekly-agenda-workspace/);
  assert.match(appSource, /dhq-agenda-game-log-drawer/);
  assert.match(globalStyles, /\.dhq-weekly-agenda-grid/);
  assert.match(globalStyles, /\.dhq-weekly-agenda-grid \{[\s\S]*?display: grid !important;[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(appSource, /className="dhq-weekly-agenda-side-stack flex flex-col gap-6"/);
  assert.match(globalStyles, /\.dhq-weekly-agenda-side-stack \{[\s\S]*?display: flex;[\s\S]*?flex-direction: column;[\s\S]*?gap: 14px;/);
  const agendaCardOrder = [...appSource.matchAll(/data-agenda-card="([1-4])"/g)].map((match) => match[1]);
  assert.deepEqual(agendaCardOrder, ['1', '2', '3', '4']);
  const agendaSideStackIndex = appSource.indexOf('className="dhq-weekly-agenda-side-stack flex flex-col gap-6"');
  assert.ok(appSource.indexOf('data-agenda-card="1"') < agendaSideStackIndex);
  for (const cardNumber of ['2', '3', '4']) {
    assert.ok(appSource.indexOf(`data-agenda-card="${cardNumber}"`) > agendaSideStackIndex);
  }
});

test('weekly agenda milestone recorder is a standalone full-width horizontal card below cards 1-4', async () => {
  const [appSource, milestoneSource] = await Promise.all([
    readFile(appSourceUrl, 'utf8'),
    readFile(new URL('../components/MilestoneRecorder.jsx', import.meta.url), 'utf8'),
  ]);

  const milestoneIndex = appSource.indexOf('className="dhq-weekly-agenda-milestone mb-6"');
  const agendaGridIndex = appSource.indexOf('className="dhq-weekly-agenda-grid');
  const cardFourIndex = appSource.indexOf('data-agenda-card="4"');
  assert.ok(milestoneIndex >= 0);
  assert.ok(milestoneIndex > agendaGridIndex);
  assert.ok(milestoneIndex > cardFourIndex);
  assert.equal((appSource.match(/<MilestoneRecorder/g) || []).length, 1);
  assert.match(appSource, /4\. Media & Rumor Mill/);
  assert.match(milestoneSource, /milestone-recorder-layout/);
  assert.match(milestoneSource, /xl:grid-cols-\[minmax\(140px,0\.42fr\)_minmax\(0,1\.58fr\)\]/);
  assert.match(milestoneSource, /milestone-recorder-fields[^\n]*sm:grid-cols-6/);
  assert.match(milestoneSource, /sm:col-span-4/);
  assert.match(milestoneSource, /sm:col-span-2/);
});

test('the homepage uses the stage-aware dashboard v2 without duplicating workspace-level detail', async () => {
  const [wrapperSource, dashboardSource, dashboardStyles] = await Promise.all([
    readFile(commandCenterSourceUrl, 'utf8'),
    readFile(dashboardV2SourceUrl, 'utf8'),
    readFile(dashboardV2StylesUrl, 'utf8'),
  ]);

  assert.match(wrapperSource, /export \{ default \} from '\.\/CareerDashboardV2';/);
  assert.match(dashboardSource, /id="dynastyhq-command-center"/);
  assert.match(dashboardSource, /dhq-home-banner dhq-v2-identity/);
  assert.match(dashboardSource, /data-dashboard-version="2"/);
  assert.match(dashboardSource, /data-dashboard-modules=\{model\.moduleIds\.join\(','\)\}/);
  assert.match(dashboardSource, /buildDashboardV2\(state\)/);
  assert.match(dashboardSource, /stage === CAREER_STAGES\.HIGH_SCHOOL/);
  assert.match(dashboardSource, /stage === CAREER_STAGES\.COLLEGE/);
  assert.match(dashboardSource, /stage === CAREER_STAGES\.OC/);
  assert.match(dashboardSource, /stage === CAREER_STAGES\.HC/);

  for (const title of [
    'Player Snapshot',
    'Current Week',
    'Season Performance',
    'Recent Results',
    'Latest Coverage',
    'Career Milestones',
    'Program Snapshot',
    'Offensive Performance',
    'Team Performance',
    'Trophy Case',
    'Career Journey',
  ]) {
    assert.match(dashboardSource, new RegExp(title));
  }

  assert.match(dashboardSource, /CareerTransitionPanel/);
  assert.match(dashboardSource, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(dashboardSource, /onProfileHeadshotUpload/);
  assert.match(dashboardSource, /Edit Player Profile/);
  assert.match(dashboardSource, /onProfileSave/);
  assert.match(dashboardSource, /role="dialog"/);
  assert.match(dashboardSource, /aria-modal="true"/);
  assert.match(dashboardSource, /Save Profile/);
  assert.doesNotMatch(dashboardSource, /Dynasty Central|Quick Actions/);

  assert.match(dashboardStyles, /\.dhq-v2-grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(dashboardStyles, /@media \(max-width: 720px\)[\s\S]*?\.dhq-v2-grid \{ grid-template-columns: 1fr/);
  assert.match(dashboardStyles, /Keep the proven Gameweek Flow, but make its dashboard presentation compact/);
});

test('schema v12 keeps an unpublished newsroom factual and empty', async () => {
  const [appSource, emptyStateSource] = await Promise.all([
    readFile(appSourceUrl, 'utf8'),
    readFile(newsroomEmptyStateSourceUrl, 'utf8'),
  ]);

  assert.match(appSource, /appState\.schemaVersion >= 12/);
  assert.match(emptyStateSource, /No edition published yet/);
  assert.match(emptyStateSource, /No placeholder players, invented statistics, Crystal Ball picks/);
  assert.doesNotMatch(emptyStateSource, /crystalBallText|Javion Butts|defHeadshot/);
});

test('player data entry presents Top Schools as preferences instead of interest sliders', async () => {
  const appSource = await readFile(appSourceUrl, 'utf8');

  assert.match(appSource, /This is your personal Top Schools order from the game—not a school-interest percentage/);
  assert.match(appSource, /isCoach \? '3\. Manual Recruiting Updates' : '3\. Top Schools Snapshot'/);
  assert.match(appSource, /school\.preferenceRank \|\| school\.customOrder/);
});

test('high-school agenda separates saving a draft from publishing a completed week', async () => {
  const appSource = await readFile(appSourceUrl, 'utf8');

  assert.match(appSource, /Save Progress Only/);
  assert.match(appSource, /Process Completed Game Week/);
  assert.match(appSource, /No Playable Moment data was required, and no game week was published/);
  assert.ok(appSource.indexOf('Save Progress Only') < appSource.indexOf('Process Completed Game Week'));
});
