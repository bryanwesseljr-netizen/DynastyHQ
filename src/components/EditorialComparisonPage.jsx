import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, Newspaper, RefreshCw, ShieldCheck } from 'lucide-react';
import { appId, auth, db } from '../firebase';
import { DEFAULT_CAREER_STATE } from '../domain/defaultCareerState';
import { migrateCareerState } from '../domain/weeklyEngine';
import {
  buildNewsroomGenerationPayload,
  normalizeGeneratedNewsroomEdition,
} from '../domain/newsroomGeneration';
import { generateNewsroomEdition } from '../services/newsroomClient';

const issueId = (issue = {}) => issue.publicationId || issue.id || '';
const issueLabel = (issue = {}) => issue.label || `Season ${Number(issue.season) || 1} · Week ${Number(issue.week) || 0}`;

const EditorialComparisonPage = () => {
  const [user, setUser] = useState(auth.currentUser || null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [career, setCareer] = useState(null);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [publicationId, setPublicationId] = useState('');
  const [generationBusy, setGenerationBusy] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [comparison, setComparison] = useState(null);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser || null);
    setAuthReady(true);
  }), []);

  useEffect(() => {
    if (!user || !db) {
      setCareer(null);
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      setLoadBusy(true);
      setLoadError('');
      try {
        const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) throw new Error('The DynastyHQ career save could not be found.');
        const state = migrateCareerState(snapshot.data(), DEFAULT_CAREER_STATE);
        if (cancelled) return;
        setCareer(state);
        const latest = [...(state.newsroomIssues || [])].reverse().find((issue) => issueId(issue));
        setPublicationId((current) => current || issueId(latest));
      } catch (error) {
        if (!cancelled) setLoadError(error?.message || 'Could not load the DynastyHQ career save.');
      } finally {
        if (!cancelled) setLoadBusy(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  const issues = useMemo(() => [...(career?.newsroomIssues || [])].reverse(), [career]);
  const selectedIssue = useMemo(
    () => issues.find((issue) => issueId(issue) === publicationId) || null,
    [issues, publicationId],
  );

  const handleSignIn = async (event) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword('');
    } catch (error) {
      setAuthError(error?.message || 'Sign-in failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const runComparison = async () => {
    if (!user || !career || !publicationId) return;
    setGenerationBusy(true);
    setGenerationError('');
    setComparison(null);
    try {
      const payload = buildNewsroomGenerationPayload(career, publicationId);
      const idToken = await user.getIdToken();
      const generated = await generateNewsroomEdition({ idToken, payload });
      const normalized = normalizeGeneratedNewsroomEdition({
        generated: generated.edition,
        payload,
        model: generated.model,
      });
      setComparison({
        edition: normalized,
        provider: generated.provider || '',
        model: generated.model || '',
        fallbackUsed: Boolean(generated.fallbackUsed),
        fallbackReason: generated.fallbackReason || '',
      });
    } catch (error) {
      setGenerationError(error?.message || 'The editorial comparison could not be generated.');
    } finally {
      setGenerationBusy(false);
    }
  };

  if (!authReady) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <Loader2 className="animate-spin text-amber-400" size={40} aria-label="Loading" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
        <section className="mx-auto max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">PR #21 · Safe Comparison</p>
          <h1 className="mt-2 text-2xl font-black">Sign in to DynastyHQ</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">This page reads your existing career facts only. It does not save, rewrite, publish, or modify Newsroom data.</p>
          <form className="mt-6 space-y-3" onSubmit={handleSignIn}>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
            />
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
            />
            {authError ? <p className="text-xs font-bold text-red-300">{authError}</p> : null}
            <button
              type="submit"
              disabled={authBusy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-60"
            >
              {authBusy ? <Loader2 className="animate-spin" size={16} /> : null}
              Sign in
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 shadow-xl">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-emerald-300" size={24} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Editorial Comparison · Read Only</p>
              <h1 className="mt-1 text-2xl font-black">Gemini Newsroom Quality Test</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">This page reads the same verified DynastyHQ facts your Newsroom would use, but the generated article stays only in this browser session. No Firebase write, rewrite, publish, podcast invalidation, or career-state change occurs here.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 flex-1">
              <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400" htmlFor="comparison-week">Newsroom edition</label>
              <select
                id="comparison-week"
                value={publicationId}
                onChange={(event) => {
                  setPublicationId(event.target.value);
                  setComparison(null);
                  setGenerationError('');
                }}
                disabled={loadBusy || generationBusy}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-bold text-white"
              >
                {issues.map((issue) => <option key={issueId(issue)} value={issueId(issue)}>{issueLabel(issue)}</option>)}
              </select>
              {selectedIssue ? <p className="mt-2 text-xs text-slate-500">Existing status: {selectedIssue.editorialStatus || 'not generated'}</p> : null}
            </div>
            <button
              type="button"
              onClick={runComparison}
              disabled={loadBusy || generationBusy || !publicationId}
              className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
            >
              {generationBusy ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              {generationBusy ? 'Writing comparison…' : 'Generate Gemini comparison'}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>Signed in</span>
            <button type="button" onClick={() => signOut(auth)} className="font-bold text-slate-300 underline underline-offset-2">Sign out</button>
          </div>
          {loadError ? <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300">{loadError}</p> : null}
          {generationError ? <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300">{generationError}</p> : null}
        </section>

        {comparison ? (
          <section className="space-y-5">
            <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4">
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
                <span><strong className="text-blue-200">Provider:</strong> {comparison.provider || 'unknown'}</span>
                <span><strong className="text-blue-200">Model:</strong> {comparison.model || 'unknown'}</span>
                <span><strong className="text-blue-200">Paid fallback:</strong> {comparison.fallbackUsed ? 'YES' : 'NO'}</span>
              </div>
              {comparison.fallbackReason ? <p className="mt-2 text-xs text-slate-400">Fallback reason: {comparison.fallbackReason}</p> : null}
            </div>

            {comparison.edition.articles.map((article) => (
              <article key={article.outletId} className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
                <header className="border-b border-slate-800 p-5 md:p-7">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                    <Newspaper size={14} />
                    {article.audience || article.outletId} · {article.storyFormat}
                  </div>
                  {article.kicker ? <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-slate-400">{article.kicker}</p> : null}
                  <h2 className="mt-2 text-3xl font-black leading-tight md:text-4xl">{article.headline}</h2>
                  {article.dek ? <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-300">{article.dek}</p> : null}
                  <p className="mt-4 text-xs font-bold text-slate-500">{article.byline}</p>
                </header>
                <div className="space-y-5 p-5 text-[15px] leading-7 text-slate-200 md:p-7 md:text-base">
                  {article.paragraphs.map((paragraph, index) => (
                    <div key={`${article.outletId}-p-${index}`}>
                      {article.sectionHeadings[index] ? <h3 className="mb-2 text-lg font-black text-white">{article.sectionHeadings[index]}</h3> : null}
                      <p>{paragraph}</p>
                    </div>
                  ))}
                  {article.pullQuote ? <blockquote className="border-l-4 border-amber-400 pl-4 text-lg font-bold italic text-slate-100">{article.pullQuote}</blockquote> : null}
                  {article.sidebars.map((sidebar) => (
                    <aside key={`${article.outletId}-${sidebar.title}`} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">{sidebar.title}</h3>
                      <ul className="mt-2 space-y-1 text-sm text-slate-300">
                        {sidebar.items.map((item) => <li key={item}>• {item}</li>)}
                      </ul>
                    </aside>
                  ))}
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
};

export default EditorialComparisonPage;
