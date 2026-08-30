import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  BarChart2, Headphones, Loader2, Newspaper, Radio, ShieldCheck, Trophy, UserRound,
} from 'lucide-react';
import footballStadiumBg from '../assets/dynastyhq-football-stadium-bg.webp';
import { appId, db } from '../firebase';
import { loadPublicPodcastAudio } from '../services/podcastAudioStorage';
import {
  playerAppearedInGame,
  PUBLIC_MEDIA_SECTIONS,
  summarizePublicPlayerStats,
} from '../domain/publicMediaProfile';
import GroundedNewsroom from './GroundedNewsroom';
import PodcastStudio from './PodcastStudio';

const sectionLabel = Object.freeze({ stats: 'Player Stats', newsroom: 'Newsroom', podcast: 'Podcast' });
const sectionIcon = Object.freeze({ stats: BarChart2, newsroom: Newspaper, podcast: Radio });

const initialSection = () => {
  const requested = new URLSearchParams(window.location.search).get('section');
  return PUBLIC_MEDIA_SECTIONS.includes(requested) ? requested : 'stats';
};

const scoreText = (game) => {
  if (game?.homeScore === null || game?.homeScore === undefined || game?.awayScore === null || game?.awayScore === undefined) return '—';
  return `${game.homeScore}-${game.awayScore}`;
};

const PublicPlayerStats = ({ state }) => {
  const currentSeason = Number(state.currentSeason || 1);
  const career = useMemo(() => summarizePublicPlayerStats(state), [state]);
  const season = useMemo(() => summarizePublicPlayerStats(state, currentSeason), [currentSeason, state]);
  const games = useMemo(() => [...(state.gameLogs || [])]
    .filter((game) => game?.stage !== 'high-school')
    .sort((a, b) => (Number(b.season || 1) - Number(a.season || 1)) || (Number(b.week || 0) - Number(a.week || 0))), [state.gameLogs]);
  const player = state.player || {};
  const school = player.college || player.school || 'College Football';

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <section className="overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-950/90 shadow-2xl backdrop-blur-md">
        <div className="grid gap-6 p-6 md:grid-cols-[140px_minmax(0,1fr)_auto] md:items-center md:p-8">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-amber-400/30 bg-slate-900 shadow-xl">
            {player.headshot ? <img src={player.headshot} alt={`${player.name || 'Player'} headshot`} className="h-full w-full object-cover" /> : <UserRound size={54} className="text-slate-600" />}
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">DynastyHQ Player Card</div>
            <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white md:text-5xl">{player.name || 'Road to Glory Player'}</h1>
            <p className="mt-2 text-sm font-bold uppercase tracking-wider text-slate-300">{school} · {player.pos || 'QB'}{player.number ? ` #${player.number}` : ''}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider text-slate-300">
              {player.overall !== null && player.overall !== undefined ? <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">OVR {player.overall}</span> : null}
              {state.rtg?.rank ? <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">{state.rtg.rank}</span> : null}
              {player.archetype ? <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">{player.archetype}</span> : null}
              {player.height || player.weight ? <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">{[player.height, player.weight].filter(Boolean).join(' · ')}</span> : null}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-5 py-4 text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Season {currentSeason}</div>
            <div className="mt-1 text-3xl font-black text-white">{season.games}</div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Appearances</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {[
          ['Games', career.games], ['Pass Yds', career.passYds], ['Pass TD', career.passTD],
          ['Rush Yds', career.rushYds], ['Rush TD', career.rushTD], ['INT', career.interceptions],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-700/60 bg-slate-950/85 p-5 text-center shadow-xl backdrop-blur-md">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Career {label}</div>
            <div className="mt-2 text-3xl font-black text-white">{Number(value || 0).toLocaleString()}</div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-950/90 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-300">Verified Game Log</div>
            <h2 className="mt-1 text-xl font-black uppercase text-white">Career Stats by Week</h2>
          </div>
          <Trophy className="text-amber-400" size={24} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-900/90 text-[9px] font-black uppercase tracking-wider text-slate-500">
              <tr><th className="px-5 py-3">Season</th><th className="px-5 py-3">Week</th><th className="px-5 py-3">Opponent</th><th className="px-5 py-3">Result</th><th className="px-5 py-3">Score</th><th className="px-5 py-3">Passing</th><th className="px-5 py-3">Rushing</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {games.map((game, index) => {
                const appeared = playerAppearedInGame(game);
                return (
                  <tr key={`${game.season}-${game.week}-${game.opponent}-${index}`}>
                    <td className="px-5 py-4 font-mono text-slate-400">S{game.season || 1}</td>
                    <td className="px-5 py-4 font-mono text-slate-400">{game.week}</td>
                    <td className="px-5 py-4 font-bold text-white">{game.opponent || '—'}</td>
                    <td className={`px-5 py-4 font-black ${game.result === 'W' ? 'text-emerald-400' : game.result === 'L' ? 'text-red-400' : 'text-slate-400'}`}>{game.result || '—'}</td>
                    <td className="px-5 py-4 font-mono">{scoreText(game)}</td>
                    <td className="px-5 py-4">{appeared ? `${game.passYds || 0} YDS · ${game.passTD || 0} TD · ${game.int || 0} INT` : <span className="font-black uppercase tracking-wider text-slate-500">DNP</span>}</td>
                    <td className="px-5 py-4">{appeared ? `${game.rushYds || 0} YDS · ${game.rushTD || 0} TD` : '—'}</td>
                  </tr>
                );
              })}
              {!games.length ? <tr><td colSpan="7" className="px-5 py-10 text-center italic text-slate-500">No college game stats have been shared yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const PublicMediaProfilePage = ({ ownerId }) => {
  const [state, setState] = useState(null);
  const [status, setStatus] = useState('loading');
  const [section, setSection] = useState(initialSection);
  const [newsTheme, setNewsTheme] = useState('scouting');

  useEffect(() => {
    if (!db || !ownerId) {
      setStatus('missing');
      return undefined;
    }
    const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'shared_media_profiles', ownerId);
    return onSnapshot(profileRef, (snapshot) => {
      if (!snapshot.exists()) {
        setState(null);
        setStatus('missing');
        return;
      }
      setState(snapshot.data());
      setStatus('ready');
    }, () => setStatus('error'));
  }, [ownerId]);

  const changeSection = (next) => {
    if (!PUBLIC_MEDIA_SECTIONS.includes(next)) return;
    setSection(next);
    const params = new URLSearchParams(window.location.search);
    params.set('section', next);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadAudio = async (episodeId) => {
    if (!db || !ownerId || !episodeId) return null;
    return loadPublicPodcastAudio({ db, appId, ownerId, episodeId });
  };

  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white"><Loader2 className="h-11 w-11 animate-spin text-amber-400" aria-label="Loading shared media profile" /></div>;
  }

  if (status !== 'ready' || !state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center shadow-2xl">
          <ShieldCheck size={42} className="mx-auto text-slate-500" />
          <h1 className="mt-4 text-2xl font-black uppercase">Shared media profile unavailable</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">This link may have been revoked or replaced by the owner.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 selection:bg-amber-500/30">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <img src={footballStadiumBg} className="h-full w-full object-cover opacity-[0.55]" alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/55 via-slate-950/72 to-slate-950/95" />
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-800/90 bg-[#02070a]/95 shadow-xl backdrop-blur-xl">
        <div className="mx-auto flex min-h-[68px] max-w-7xl flex-wrap items-center gap-4 px-4 py-3 md:px-6">
          <div className="mr-auto flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-400"><Trophy size={17} /></span>
            <div><div className="text-sm font-black uppercase tracking-[0.08em] text-white">Dynasty <span className="text-amber-400">HQ</span></div><div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Public Media Profile</div></div>
          </div>
          <nav className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1" aria-label="Shared media navigation">
            {PUBLIC_MEDIA_SECTIONS.map((item) => {
              const Icon = sectionIcon[item];
              const selected = section === item;
              return <button key={item} type="button" onClick={() => changeSection(item)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-wider transition-colors ${selected ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}><Icon size={13} /> {sectionLabel[item]}</button>;
            })}
          </nav>
          <div className="hidden items-center gap-2 text-[8px] font-black uppercase tracking-wider text-emerald-300 lg:flex"><ShieldCheck size={13} /> View only</div>
        </div>
      </header>

      <main className="relative z-10 px-4 py-7 md:px-8 md:py-10">
        {section === 'stats' ? <PublicPlayerStats state={state} /> : null}
        {section === 'newsroom' ? (
          state.newsroomIssues?.length ? <GroundedNewsroom issues={state.newsroomIssues} initialIssueId="" newsTheme={newsTheme} setNewsTheme={setNewsTheme} outletImages={state.outletImages || {}} readOnly mediaLibrary={state.newsroomMediaLibrary || []} mediaBusy={false} writingBusyId="" autoAssignLibrary={false} frontPages={state.postgameFrontPages || []} initialFrontPageId="" /> : <div className="mx-auto max-w-3xl rounded-3xl border border-slate-700 bg-slate-950/90 p-10 text-center"><Newspaper className="mx-auto text-slate-600" size={40} /><h2 className="mt-4 text-2xl font-black uppercase text-white">No Newsroom editions yet</h2></div>
        ) : null}
        {section === 'podcast' ? (
          state.podcastEpisodes?.length || state.newsroomIssues?.length ? <PodcastStudio state={state} readOnly initialPublicationId="" onLoadAudio={loadAudio} /> : <div className="mx-auto max-w-3xl rounded-3xl border border-slate-700 bg-slate-950/90 p-10 text-center"><Headphones className="mx-auto text-slate-600" size={40} /><h2 className="mt-4 text-2xl font-black uppercase text-white">No podcast episodes yet</h2></div>
        ) : null}
      </main>
    </div>
  );
};

export default PublicMediaProfilePage;
