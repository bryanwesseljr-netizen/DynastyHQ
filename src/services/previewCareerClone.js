import { doc, getDoc, setDoc } from 'firebase/firestore';
import { appId, db, isPreviewDeployment, productionAppId } from '../firebase.js';
import { clearWeeklyDraftRecord } from './weeklyDraftStorage.js';

const clean = (value) => String(value || '').trim();

const sourceSummary = (career = {}) => ({
  season: Number(career.currentSeason) || 1,
  week: Number(career.currentWeek) || 1,
  careerPhase: clean(career.careerPhase) || 'Player',
  careerStage: clean(career.careerStage || career.player?.careerStage) || '',
  school: clean(career.player?.school || career.player?.college) || '',
  playerName: clean(career.player?.name) || '',
});

export const cloneProductionCareerToPreview = async (user) => {
  if (!isPreviewDeployment || appId === productionAppId) {
    throw new Error('Production-to-preview cloning is available only inside a DynastyHQ preview deployment.');
  }
  if (!user?.uid) throw new Error('Sign in before copying your production career into the preview.');
  if (!db) throw new Error('DynastyHQ could not connect to the career database.');

  const productionRef = doc(db, 'artifacts', productionAppId, 'users', user.uid, 'hq_data', 'main');
  const previewRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
  const productionSnapshot = await getDoc(productionRef);

  if (!productionSnapshot.exists()) {
    throw new Error('DynastyHQ could not find a production career for this signed-in account.');
  }

  const productionCareer = productionSnapshot.data();
  const summary = sourceSummary(productionCareer);
  const clonedAt = new Date().toISOString();

  // One-way sandbox copy only. This helper never writes to productionRef.
  await setDoc(previewRef, {
    ...productionCareer,
    previewSandboxClone: {
      sourceAppId: productionAppId,
      destinationAppId: appId,
      clonedAt,
      sourceSeason: summary.season,
      sourceWeek: summary.week,
      sourceCareerStage: summary.careerStage,
      sourceSchool: summary.school,
    },
  }, { merge: false });

  // Prevent an unfinished draft from the old preview career from reappearing on reload.
  clearWeeklyDraftRecord(user.uid);

  return { ...summary, clonedAt };
};
