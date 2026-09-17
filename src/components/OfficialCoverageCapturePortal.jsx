import { useEffect, useRef } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, db, firebaseApp } from '../firebase';
import { publicationIdFor } from '../domain/officialCoverageCapture.js';
import { uploadNewsroomMedia } from '../services/newsroomMediaStorage.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const STORAGE_KEY = 'dynastyhq-pending-official-coverage-v2';
const DEVICE_ID = globalThis.crypto?.randomUUID?.() || 'official-coverage-capture-v2';
const clean = (value, max = 1600) => String(value ?? '').trim().slice(0, max);
const list = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

const readPending = () => {
  try {
    const parsed = JSON.parse(window.sessionStorage?.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writePending = (items) => {
  try { window.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* best-effort session queue */ }
};

const uniqueText = (values = []) => [...new Set(values.map((value) => clean(value)).filter(Boolean))];

const mergePages = (currentPages = [], incoming = {}) => {
  const key = clean(incoming.sourceFileName, 220) || `page-${currentPages.length + 1}`;
  const page = {
    sourceFileName: clean(incoming.sourceFileName, 220),
    headline: clean(incoming.headline, 260),
    summary: clean(incoming.summary, 1800),
    sourceImageUrl: clean(incoming.sourceImageUrl, 4000),
    storagePath: clean(incoming.storagePath, 4000),
    mimeType: clean(incoming.mimeType, 120),
    capturedAt: incoming.capturedAt || new Date().toISOString(),
  };
  const pages = new Map(list(currentPages).map((item, index) => [clean(item.sourceFileName, 220) || `page-${index + 1}`, item]));
  pages.set(key, { ...(pages.get(key) || {}), ...page });
  return [...pages.values()];
};

const mergeCandidate = (current = {}, incoming = {}) => ({
  ...current,
  ...incoming,
  sourceImageDataUrl: undefined,
  outlet: 'EA SPORTS Network',
  headline: !/^ea sports network game coverage$/i.test(clean(incoming.headline))
    ? clean(incoming.headline, 260)
    : clean(current.headline, 260) || clean(incoming.headline, 260),
  summary: uniqueText([current.summary, incoming.summary]).join(' ').slice(0, 2400),
  sourceFiles: uniqueText([...(current.sourceFiles || []), incoming.sourceFileName]),
  pages: mergePages(current.pages, incoming),
  capturedAt: current.capturedAt || incoming.capturedAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const queueCandidate = (candidate = {}) => {
  const pending = readPending();
  const existingIndex = pending.findIndex((entry) => entry.publicationId === candidate.publicationId);
  const base = existingIndex >= 0
    ? pending[existingIndex]
    : { season: candidate.season, week: candidate.week, publicationId: candidate.publicationId, pages: [], sourceFiles: [] };
  const merged = mergeCandidate(base, candidate);
  if (existingIndex >= 0) pending[existingIndex] = merged;
  else pending.push(merged);
  writePending(pending.slice(-12));
  window.dispatchEvent(new CustomEvent('dynastyhq:official-coverage-queued', { detail: merged }));
  return merged;
};

const weekApplied = (career = {}, publicationId = '') => {
  const appliedHint = (() => {
    try { return window.sessionStorage?.getItem('dhq-session-applied-week') || ''; } catch { return ''; }
  })();
  if (appliedHint === publicationId) return true;
  return list(career.weeklyUpdates).some((entry) => (
    entry?.publicationId === publicationId || entry?.id === publicationId || entry?.weekKey === publicationId
  ));
};

const OfficialCoverageCapturePortal = () => {
  const { user, career } = useOwnerCareer();
  const careerRef = useRef(career);
  const busyRef = useRef(false);

  useEffect(() => { careerRef.current = career; }, [career]);

  useEffect(() => {
    if (!career) return undefined;
    const onCapture = async (event) => {
      const candidate = event.detail || {};
      if (!clean(candidate.outlet) || !/ea sports/i.test(clean(candidate.outlet))) return;
      const current = careerRef.current || {};
      const season = Number(candidate.season ?? current.currentSeason) || 1;
      const week = Math.max(0, Number(candidate.week ?? current.currentWeek) || 0);
      const publicationId = clean(candidate.publicationId) || publicationIdFor(season, week);
      const baseCandidate = { ...candidate, season, week, publicationId };
      queueCandidate(baseCandidate);

      if (!user || !candidate.sourceImageDataUrl) return;
      try {
        const assetId = `ea-network-s${season}-w${week}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const stored = await uploadNewsroomMedia({
          firebaseApp,
          appId,
          userId: user.uid,
          assetId,
          imageDataUrl: candidate.sourceImageDataUrl,
          fileName: candidate.sourceFileName || `ea-sports-network-s${season}-w${week}.jpg`,
          origin: 'ea-network-source',
        });
        queueCandidate({
          ...baseCandidate,
          sourceImageDataUrl: undefined,
          sourceImageUrl: stored.downloadUrl,
          storagePath: stored.storagePath,
          mimeType: stored.mimeType,
        });
      } catch (error) {
        console.warn('DynastyHQ preserved EA coverage text but could not archive the source screenshot', error);
      }
    };
    window.addEventListener('dynastyhq:official-coverage-captured', onCapture);
    return () => window.removeEventListener('dynastyhq:official-coverage-captured', onCapture);
  }, [career, user]);

  useEffect(() => {
    if (!user || !db || !career || busyRef.current) return undefined;
    const ready = readPending().filter((entry) => weekApplied(career, entry.publicationId));
    if (!ready.length) return undefined;
    let cancelled = false;
    busyRef.current = true;

    const persist = async () => {
      try {
        const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(ref);
          if (!snapshot.exists()) return;
          const remote = snapshot.data();
          const articles = list(remote.eaSportsNetworkArticles);
          ready.forEach((candidate) => {
            const index = articles.findIndex((entry) => entry?.publicationId === candidate.publicationId);
            const existing = index >= 0 ? articles[index] : {};
            const article = mergeCandidate(existing, candidate);
            Object.assign(article, {
              id: candidate.publicationId,
              publicationId: candidate.publicationId,
              season: candidate.season,
              week: candidate.week,
              outlet: 'EA SPORTS Network',
              source: 'cfb27-session-import',
              captureStatus: article.pages?.some((page) => page.sourceImageUrl) ? 'source-pages-preserved' : 'confirmed-source',
              preservedAt: existing.preservedAt || new Date().toISOString(),
            });
            if (index >= 0) articles[index] = article;
            else articles.push(article);
          });
          transaction.set(ref, {
            ...remote,
            eaSportsNetworkArticles: articles,
            _sync: {
              revision: (Number(remote?._sync?.revision) || 0) + 1,
              deviceId: DEVICE_ID,
              updatedAt: new Date().toISOString(),
            },
          });
        });
        if (!cancelled) {
          const done = new Set(ready.map((entry) => entry.publicationId));
          writePending(readPending().filter((entry) => !done.has(entry.publicationId)));
        }
      } catch (error) {
        console.error('DynastyHQ official coverage preservation failed', error);
      } finally {
        if (!cancelled) busyRef.current = false;
      }
    };

    persist();
    return () => { cancelled = true; busyRef.current = false; };
  }, [career, user]);

  return null;
};

export default OfficialCoverageCapturePortal;
