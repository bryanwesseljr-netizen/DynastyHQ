import { useEffect, useRef } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, db } from '../firebase';
import {
  EDITORIAL_LANGUAGE_VERSION,
  normalizeNewsroomIssueLanguage,
  normalizePodcastEpisodeLanguage,
} from '../domain/editorialRealism.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const careerAtPublication = (career = {}, publicationId = '') => {
  const update = (career.weeklyUpdates || []).find((entry) => (
    entry?.publicationId === publicationId || entry?.id === publicationId || entry?.weekKey === publicationId
  ));
  return update?.rtgSnapshot
    ? { ...career, rtg: { ...(career.rtg || {}), ...update.rtgSnapshot } }
    : career;
};

const issueTextSignature = (issue = {}) => JSON.stringify({
  editorialLanguageVersion: Number(issue?.editorialLanguageVersion) || 0,
  articles: (issue.articles || []).map((article) => ({
    id: article?.id,
    kicker: article?.kicker,
    headline: article?.headline,
    dek: article?.dek,
    paragraphs: article?.paragraphs,
    sectionHeadings: article?.sectionHeadings,
    pullQuote: article?.pullQuote,
    sidebars: article?.sidebars,
  })),
});

const episodeTextSignature = (episode = {}) => JSON.stringify({
  editorialLanguageVersion: Number(episode?.editorialLanguageVersion) || 0,
  id: episode?.id,
  title: episode?.title,
  summary: episode?.summary,
  chapters: episode?.chapters,
  segments: (episode?.segments || []).map((segment) => ({ id: segment?.id, text: segment?.text })),
});

const collectSignatures = (career = {}) => ({
  issues: new Map((career.newsroomIssues || []).map((issue) => [issue?.publicationId || issue?.id || '', issueTextSignature(issue)])),
  episodes: new Map((career.podcastEpisodes || []).map((episode) => [episode?.publicationId || episode?.id || '', episodeTextSignature(episode)])),
});

const changedKeys = (previous, current) => new Set(
  [...current.entries()]
    .filter(([key, signature]) => key && previous.get(key) !== signature)
    .map(([key]) => key),
);

const idsNeedingInitialNormalization = (items = []) => new Set(
  items
    .filter((item) => Number(item?.editorialLanguageVersion) !== EDITORIAL_LANGUAGE_VERSION)
    .map((item) => item?.publicationId || item?.id || '')
    .filter(Boolean),
);

const EditorialLanguageRealismPortal = () => {
  const { user, career } = useOwnerCareer();
  const busyRef = useRef(false);
  const baselineRef = useRef(null);

  useEffect(() => {
    if (!career) return undefined;
    const currentSignatures = collectSignatures(career);
    let changedIssueIds;
    let changedEpisodeIds;

    if (!baselineRef.current) {
      baselineRef.current = currentSignatures;
      changedIssueIds = idsNeedingInitialNormalization(career.newsroomIssues || []);
      changedEpisodeIds = idsNeedingInitialNormalization(career.podcastEpisodes || []);
    } else {
      changedIssueIds = changedKeys(baselineRef.current.issues, currentSignatures.issues);
      changedEpisodeIds = changedKeys(baselineRef.current.episodes, currentSignatures.episodes);
      baselineRef.current = currentSignatures;
    }

    if (!user || !db || busyRef.current || (!changedIssueIds.size && !changedEpisodeIds.size)) return undefined;

    const timer = window.setTimeout(async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const masterRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
        let normalizedSnapshot = null;
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(masterRef);
          if (!snapshot.exists()) return;
          const remote = snapshot.data();
          const before = collectSignatures(remote);
          const newsroomIssues = (remote.newsroomIssues || []).map((issue) => {
            const publicationId = issue?.publicationId || issue?.id || '';
            return changedIssueIds.has(publicationId)
              ? normalizeNewsroomIssueLanguage(issue, careerAtPublication(remote, publicationId))
              : issue;
          });
          const podcastEpisodes = (remote.podcastEpisodes || []).map((episode) => {
            const publicationId = episode?.publicationId || episode?.id || '';
            return changedEpisodeIds.has(publicationId)
              ? normalizePodcastEpisodeLanguage(episode, careerAtPublication(remote, publicationId))
              : episode;
          });
          const nextCareer = { ...remote, newsroomIssues, podcastEpisodes };
          const after = collectSignatures(nextCareer);
          normalizedSnapshot = after;

          const issueChanged = [...changedIssueIds].some((id) => before.issues.get(id) !== after.issues.get(id));
          const episodeChanged = [...changedEpisodeIds].some((id) => before.episodes.get(id) !== after.episodes.get(id));
          if (!issueChanged && !episodeChanged) return;

          const revision = Number(remote?._sync?.revision) || 0;
          transaction.update(masterRef, {
            newsroomIssues,
            podcastEpisodes,
            '_sync.revision': revision + 1,
            '_sync.deviceId': 'editorial-language-realism',
            '_sync.updatedAt': new Date().toISOString(),
          });
        });
        if (normalizedSnapshot) baselineRef.current = normalizedSnapshot;
      } catch (error) {
        console.error('Editorial language normalization failed', error);
      } finally {
        busyRef.current = false;
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [career, user]);

  return null;
};

export default EditorialLanguageRealismPortal;
