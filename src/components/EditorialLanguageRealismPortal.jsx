import { useEffect, useRef } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { appId, db } from '../firebase';
import {
  normalizeNewsroomIssueLanguage,
  normalizePodcastEpisodeLanguage,
} from '../domain/editorialRealism.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const stableJson = (value) => JSON.stringify(value || []);

const careerAtPublication = (career = {}, publicationId = '') => {
  const update = (career.weeklyUpdates || []).find((entry) => (
    entry?.publicationId === publicationId || entry?.id === publicationId || entry?.weekKey === publicationId
  ));
  return update?.rtgSnapshot
    ? { ...career, rtg: { ...(career.rtg || {}), ...update.rtgSnapshot } }
    : career;
};

const EditorialLanguageRealismPortal = () => {
  const { user, career } = useOwnerCareer();
  const busyRef = useRef(false);

  useEffect(() => {
    if (!user || !db || !career || busyRef.current) return undefined;
    if (!(career.newsroomIssues || []).length && !(career.podcastEpisodes || []).length) return undefined;

    const timer = window.setTimeout(async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const masterRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(masterRef);
          if (!snapshot.exists()) return;
          const remote = snapshot.data();
          const newsroomIssues = (remote.newsroomIssues || []).map((issue) => {
            const publicationId = issue?.publicationId || issue?.id || '';
            return normalizeNewsroomIssueLanguage(issue, careerAtPublication(remote, publicationId));
          });
          const podcastEpisodes = (remote.podcastEpisodes || []).map((episode) => (
            normalizePodcastEpisodeLanguage(episode, careerAtPublication(remote, episode?.publicationId || ''))
          ));
          if (stableJson(newsroomIssues) === stableJson(remote.newsroomIssues)
            && stableJson(podcastEpisodes) === stableJson(remote.podcastEpisodes)) return;

          const revision = Number(remote?._sync?.revision) || 0;
          transaction.update(masterRef, {
            newsroomIssues,
            podcastEpisodes,
            '_sync.revision': revision + 1,
            '_sync.deviceId': 'editorial-language-realism',
            '_sync.updatedAt': new Date().toISOString(),
          });
        });
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
