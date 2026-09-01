import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin } from 'lucide-react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, db } from '../firebase';
import { GAME_LOCATION_CONTEXTS, normalizeGameLocationContext } from '../domain/editorialRealism.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const clean = (value) => String(value ?? '').trim();

const visibleNewsroomContext = (root) => {
  const mediaTools = root?.querySelector('.dhq-newsroom-media-tools');
  const issueSelect = root?.querySelector('select[aria-label="Choose weekly newsroom edition"]');
  if (!mediaTools || !issueSelect?.value) return null;
  return { mediaTools, issueId: issueSelect.value };
};

const NewsroomGameLocationControl = ({ user, career, issue }) => {
  const publicationId = issue?.publicationId || issue?.id || '';
  const saved = normalizeGameLocationContext(career?.weeklyGameContexts?.[publicationId]?.location);
  const [busy, setBusy] = useState(false);
  const isBye = /bye/i.test(clean(issue?.weekType));

  const save = async (location) => {
    if (!user || !db || !publicationId || busy) return;
    setBusy(true);
    try {
      const masterRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(masterRef);
        if (!snapshot.exists()) throw new Error('Your DynastyHQ career could not be loaded.');
        const remote = snapshot.data();
        const contexts = { ...(remote.weeklyGameContexts || {}) };
        const normalized = normalizeGameLocationContext(location);
        if (normalized === GAME_LOCATION_CONTEXTS.UNKNOWN) delete contexts[publicationId];
        else contexts[publicationId] = {
          season: Number(issue?.season) || 1,
          week: Math.max(0, Number(issue?.week) || 0),
          location: normalized,
          updatedAt: new Date().toISOString(),
        };
        transaction.update(masterRef, {
          weeklyGameContexts: contexts,
          '_sync.revision': (Number(remote?._sync?.revision) || 0) + 1,
          '_sync.deviceId': 'newsroom-game-location',
          '_sync.updatedAt': new Date().toISOString(),
        });
      });
    } catch (error) {
      console.error('Newsroom game location could not be saved', error);
    } finally {
      setBusy(false);
    }
  };

  if (!publicationId || isBye) return null;
  return (
    <div className="mb-3 flex flex-col gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2">
        <MapPin size={14} className="mt-0.5 shrink-0 text-blue-300" />
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-200">Game photo context</p>
          <p className="mt-1 text-[9px] leading-relaxed text-slate-500">Tell Auto Select whether this week was home, away, or neutral. It will favor matching uniform-tagged photos and reject an obvious home/away mismatch.</p>
        </div>
      </div>
      <select
        value={saved}
        disabled={busy}
        onChange={(event) => save(event.target.value)}
        className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-[9px] font-black uppercase text-slate-200 outline-none focus:border-blue-400 disabled:opacity-50"
        aria-label="Newsroom game photo context"
      >
        <option value={GAME_LOCATION_CONTEXTS.UNKNOWN}>Not set</option>
        <option value={GAME_LOCATION_CONTEXTS.HOME}>Home game</option>
        <option value={GAME_LOCATION_CONTEXTS.AWAY}>Away game</option>
        <option value={GAME_LOCATION_CONTEXTS.NEUTRAL}>Neutral site</option>
      </select>
    </div>
  );
};

const NewsroomGameLocationPortal = () => {
  const { user, career } = useOwnerCareer();
  const [host, setHost] = useState(null);
  const [issueId, setIssueId] = useState('');

  useEffect(() => {
    const appRoot = document.getElementById('root');
    if (!appRoot) return undefined;
    const ensure = () => {
      const visible = visibleNewsroomContext(appRoot);
      if (!visible) {
        setHost(null);
        setIssueId('');
        return;
      }
      let nextHost = visible.mediaTools.querySelector('[data-newsroom-game-location-host]');
      if (!nextHost) {
        nextHost = document.createElement('div');
        nextHost.dataset.newsroomGameLocationHost = 'true';
        visible.mediaTools.insertBefore(nextHost, visible.mediaTools.firstChild);
      }
      setHost((current) => current === nextHost ? current : nextHost);
      setIssueId((current) => current === visible.issueId ? current : visible.issueId);
    };
    ensure();
    const observer = new MutationObserver(ensure);
    observer.observe(appRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'value'] });
    return () => observer.disconnect();
  }, []);

  const issue = useMemo(() => (career?.newsroomIssues || []).find((entry) => (
    entry?.id === issueId || entry?.publicationId === issueId
  )) || null, [career?.newsroomIssues, issueId]);

  return host && issue ? createPortal(
    <NewsroomGameLocationControl user={user} career={career} issue={issue} />,
    host,
  ) : null;
};

export default NewsroomGameLocationPortal;
