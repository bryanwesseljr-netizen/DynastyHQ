import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { doc, runTransaction } from 'firebase/firestore';
import {
  ChevronRight,
  Clock3,
  GraduationCap,
  Play,
  ShieldCheck,
} from 'lucide-react';
import { appId, db } from '../firebase';
import { beginCollegeCareer } from '../domain/careerTransitions.js';
import { suggestCollegeOutlets } from '../domain/collegeNewsroom.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './career-standby.css';

const DEVICE_ID = globalThis.crypto?.randomUUID?.() || `career-standby-${Date.now()}`;
const clean = (value) => String(value ?? '').trim();
const numberOrBlank = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
};

const isCollegeCareer = (career = {}) => {
  const player = career.player || {};
  if (career.careerStage === 'College' || player.careerStage === 'College') return true;
  return Boolean(player.college && player.school && clean(player.college).toLowerCase() === clean(player.school).toLowerCase());
};

const isPlayerCareer = (career = {}) => !['OC', 'HC', 'Retired'].includes(String(career.careerPhase || 'Player'));

const initialFormFor = (career = {}) => ({
  name: clean(career.player?.name),
  school: clean(career.player?.college),
  city: '',
  state: '',
  classYear: clean(career.player?.classYear || career.player?.year) || 'Freshman',
  position: clean(career.player?.pos) || 'QB',
  archetype: clean(career.player?.archetype) || 'Dual Threat',
  depthChart: clean(career.rtg?.rank) || 'QB3',
  number: clean(career.player?.number),
  stars: career.player?.stars || career.playerRecruiting?.highSchool?.recruitStars || 3,
  height: clean(career.player?.height),
  weight: clean(career.player?.weight),
  overall: career.player?.overall ?? '',
});

const activationReasonLabel = (reason) => ({
  appearance: 'First collegiate appearance',
  starter: 'Named the starter',
  event: 'Meaningful career event',
}[reason] || 'Career tracking activated');

const CareerStandbyPortal = () => {
  const { user, career, ready } = useOwnerCareer();
  const [careerHost, setCareerHost] = useState(null);
  const [homeHost, setHomeHost] = useState(null);
  const [form, setForm] = useState(() => initialFormFor({}));
  const [formTouched, setFormTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [activationWeek, setActivationWeek] = useState(1);
  const [activationReason, setActivationReason] = useState('appearance');
  const formTouchedRef = useRef(false);

  const college = useMemo(() => isCollegeCareer(career || {}), [career]);
  const playerCareer = useMemo(() => isPlayerCareer(career || {}), [career]);
  const standby = Boolean(college && career?.careerTracking?.mode === 'standby');
  const shouldOfferTransition = Boolean(ready && career && playerCareer && !college);
  const shouldShowCareerCard = shouldOfferTransition || standby;

  useEffect(() => {
    formTouchedRef.current = formTouched;
  }, [formTouched]);

  useEffect(() => {
    if (!career || formTouchedRef.current) return;
    setForm(initialFormFor(career));
    setActivationWeek(Math.max(0, Number(career.currentWeek) || 1));
  }, [career]);

  useEffect(() => {
    let scheduled = false;
    const sync = () => {
      scheduled = false;

      const careerHero = document.querySelector('.dhq-career-overview .dhq-career-hero');
      if (careerHero && shouldShowCareerCard) {
        let host = document.getElementById('dhq-career-standby-card-host');
        if (!host || host.previousElementSibling !== careerHero) {
          host?.remove();
          host = document.createElement('div');
          host.id = 'dhq-career-standby-card-host';
          careerHero.insertAdjacentElement('afterend', host);
        }
        setCareerHost((current) => (current === host ? current : host));
      } else {
        document.getElementById('dhq-career-standby-card-host')?.remove();
        setCareerHost(null);
      }

      const homeHero = document.querySelector('.dhq-broadcast-hero');
      if (homeHero && standby) {
        homeHero.classList.add('dhq-career-standby-home');
        let host = document.getElementById('dhq-career-standby-home-host');
        if (!host || host.parentElement !== homeHero) {
          host?.remove();
          host = document.createElement('div');
          host.id = 'dhq-career-standby-home-host';
          homeHero.appendChild(host);
        }
        setHomeHost((current) => (current === host ? current : host));
      } else {
        document.querySelector('.dhq-broadcast-hero.dhq-career-standby-home')?.classList.remove('dhq-career-standby-home');
        document.getElementById('dhq-career-standby-home-host')?.remove();
        setHomeHost(null);
      }
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.querySelector('.dhq-broadcast-hero.dhq-career-standby-home')?.classList.remove('dhq-career-standby-home');
      document.getElementById('dhq-career-standby-card-host')?.remove();
      document.getElementById('dhq-career-standby-home-host')?.remove();
    };
  }, [shouldShowCareerCard, standby]);

  const updateForm = (field, value) => {
    setFormTouched(true);
    setMessage(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const commitCareer = async (transform) => {
    if (!user || !db) throw new Error('Sign in to DynastyHQ before changing the active career.');
    const careerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(careerRef);
      if (!snapshot.exists()) throw new Error('Career save was not found. Reload DynastyHQ and try again.');
      const remote = snapshot.data();
      const next = transform(remote);
      transaction.set(careerRef, {
        ...next,
        _sync: {
          ...(remote._sync || {}),
          revision: (Number(remote?._sync?.revision) || 0) + 1,
          deviceId: DEVICE_ID,
          updatedAt: new Date().toISOString(),
        },
      });
    });
  };

  const beginCollege = async (event) => {
    event.preventDefault();
    const school = clean(form.school);
    const city = clean(form.city);
    const stateName = clean(form.state);
    const overall = numberOrBlank(form.overall);
    const stars = Math.max(1, Math.min(5, Number(form.stars) || 3));
    if (!school || !city || !stateName) {
      setMessage({ type: 'error', text: 'College, city, and state are required.' });
      return;
    }
    if (overall !== '' && (overall < 1 || overall > 99)) {
      setMessage({ type: 'error', text: 'Overall must be between 1 and 99.' });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const occurredAt = new Date().toISOString();
      const outlets = suggestCollegeOutlets({ school, city, state: stateName });
      await commitCareer((remote) => {
        const prepared = {
          ...remote,
          player: {
            ...(remote.player || {}),
            name: clean(form.name) || remote.player?.name || '',
            college: school,
            isCommitted: true,
            classYear: clean(form.classYear) || 'Freshman',
            year: clean(form.classYear) || 'Freshman',
            pos: clean(form.position) || 'QB',
            archetype: clean(form.archetype),
            number: clean(form.number),
            height: clean(form.height),
            weight: clean(form.weight),
            stars,
            overall,
          },
          rtg: {
            ...(remote.rtg || {}),
            rank: clean(form.depthChart) || 'QB3',
          },
        };
        const next = beginCollegeCareer(prepared, {
          city,
          state: stateName,
          localOutletName: outlets.localOutletName,
          regionalOutletName: outlets.regionalOutletName,
        }, occurredAt);
        return {
          ...next,
          currentWeekSetup: {
            week: 1,
            type: 'game',
            phase: 'regular',
            label: 'College Career Standby',
            customLabel: 'College Career Standby',
            opponent: '',
            opponentRecord: '',
            kickoff: '',
            venue: '',
            note: 'Tracking begins with a first appearance, starter promotion, or another meaningful career event.',
          },
          careerTracking: {
            mode: 'standby',
            reason: 'waiting-for-first-appearance',
            startedAt: occurredAt,
            activatedAt: '',
            activationReason: '',
          },
        };
      });
      setFormTouched(false);
      setMessage({ type: 'success', text: `${school} is active. DynastyHQ is now on Career Standby.` });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'College chapter could not be started.' });
    } finally {
      setBusy(false);
    }
  };

  const activateTracking = async () => {
    const week = Math.max(0, Math.min(40, Number(activationWeek) || 0));
    setBusy(true);
    setMessage(null);
    try {
      const occurredAt = new Date().toISOString();
      const reasonLabel = activationReasonLabel(activationReason);
      await commitCareer((remote) => ({
        ...remote,
        currentWeek: week,
        currentWeekSetup: {
          ...(remote.currentWeekSetup || {}),
          week,
          type: 'game',
          phase: 'regular',
          label: `Week ${week}`,
          customLabel: '',
          opponent: '',
          opponentRecord: '',
          kickoff: '',
          venue: '',
          note: reasonLabel,
        },
        careerTracking: {
          ...(remote.careerTracking || {}),
          mode: 'active',
          activatedAt: occurredAt,
          activationReason,
        },
        careerChronicle: [...(remote.careerChronicle || []), {
          id: `career-tracking-${remote.currentSeason || 1}-${week}-${Date.parse(occurredAt)}`,
          type: 'career-tracking-activated',
          season: remote.currentSeason || 1,
          week,
          careerPhase: 'Player',
          occurredAt,
          title: `DynastyHQ tracking begins at ${remote.player?.college || remote.player?.school || 'college'}`,
          summary: `${reasonLabel}. Routine inactive weeks before this point remain intentionally unlogged.`,
          factKeys: ['profile.player.college', 'rtg.rank'],
        }],
      }));
      setMessage({ type: 'success', text: `Tracking is active beginning with Week ${week}.` });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Tracking could not be activated.' });
    } finally {
      setBusy(false);
    }
  };

  const openCareer = () => {
    const careerButton = [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')]
      .find((button) => ['CAREER', 'LEGACY'].includes(clean(button.textContent).toUpperCase()));
    careerButton?.click();
  };

  const collegeForm = shouldOfferTransition ? (
    <section className="dhq-standby-card dhq-standby-card--setup" aria-label="Begin college chapter">
      <div className="dhq-standby-card__eyebrow"><GraduationCap size={15} /> College chapter</div>
      <div className="dhq-standby-card__heading">
        <div>
          <h2>Begin Your College Career</h2>
          <p>Set the essentials once. DynastyHQ will then wait quietly until your career actually gives you something worth tracking.</p>
        </div>
        <span className="dhq-standby-badge">No weekly busywork</span>
      </div>

      <form onSubmit={beginCollege} className="dhq-standby-form">
        <label><span>Player name</span><input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Bryan Wessel" /></label>
        <label><span>College</span><input value={form.school} onChange={(event) => updateForm('school', event.target.value)} placeholder="Oregon" required /></label>
        <label><span>College city</span><input value={form.city} onChange={(event) => updateForm('city', event.target.value)} placeholder="Eugene" required /></label>
        <label><span>State</span><input value={form.state} onChange={(event) => updateForm('state', event.target.value)} placeholder="Oregon" required /></label>
        <label><span>Class</span><select value={form.classYear} onChange={(event) => updateForm('classYear', event.target.value)}><option>Freshman</option><option>Sophomore</option><option>Junior</option><option>Senior</option><option>Graduate</option></select></label>
        <label><span>Position</span><input value={form.position} onChange={(event) => updateForm('position', event.target.value)} placeholder="QB" /></label>
        <label><span>Archetype</span><input value={form.archetype} onChange={(event) => updateForm('archetype', event.target.value)} placeholder="Dual Threat" /></label>
        <label><span>Depth chart</span><select value={form.depthChart} onChange={(event) => updateForm('depthChart', event.target.value)}><option value="QB1">QB1</option><option value="QB2">QB2</option><option value="QB3">QB3</option><option value="Redshirt">Redshirt</option><option value="Not captured">Not captured</option></select></label>
        <label><span>Jersey #</span><input value={form.number} onChange={(event) => updateForm('number', event.target.value)} inputMode="numeric" placeholder="6" /></label>
        <label><span>Recruit rating</span><select value={form.stars} onChange={(event) => updateForm('stars', event.target.value)}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}-star</option>)}</select></label>
        <label><span>Overall</span><input type="number" min="1" max="99" value={form.overall} onChange={(event) => updateForm('overall', event.target.value)} placeholder="Optional" /></label>
        <label><span>Height</span><input value={form.height} onChange={(event) => updateForm('height', event.target.value)} placeholder={'6\'1"'} /></label>
        <label><span>Weight</span><input value={form.weight} onChange={(event) => updateForm('weight', event.target.value)} placeholder="205 lbs" /></label>
        <div className="dhq-standby-form__action">
          <p><ShieldCheck size={14} /> High-school history stays archived. Empty bench weeks will not be manufactured.</p>
          <button type="submit" disabled={busy}>{busy ? 'SAVING…' : 'BEGIN COLLEGE + ENTER STANDBY'} <ChevronRight size={15} /></button>
        </div>
      </form>
      {message ? <div className={`dhq-standby-message is-${message.type}`}>{message.text}</div> : null}
    </section>
  ) : null;

  const standbyCard = standby ? (
    <section className="dhq-standby-card dhq-standby-card--waiting" aria-label="Career standby">
      <div className="dhq-standby-card__eyebrow"><Clock3 size={15} /> Career standby</div>
      <div className="dhq-standby-card__heading">
        <div>
          <h2>Waiting for Your Moment</h2>
          <p>No screenshots or weekly logs are required while you are not playing. Resume when you enter a game, become the starter, or hit another career-defining event.</p>
        </div>
        <span className="dhq-standby-badge is-live">{clean(career?.rtg?.rank) || 'Depth chart pending'}</span>
      </div>
      <div className="dhq-standby-status-grid">
        <div><span>Program</span><strong>{clean(career?.player?.college || career?.player?.school) || 'College'}</strong></div>
        <div><span>Class</span><strong>{clean(career?.player?.classYear || career?.player?.year) || 'Freshman'}</strong></div>
        <div><span>Verified appearances</span><strong>0</strong></div>
        <div><span>Tracking</span><strong>Paused by design</strong></div>
      </div>
      <div className="dhq-standby-activate">
        <label><span>Current CFB 27 week</span><input type="number" min="0" max="40" value={activationWeek} onChange={(event) => setActivationWeek(event.target.value)} /></label>
        <label><span>Why start tracking?</span><select value={activationReason} onChange={(event) => setActivationReason(event.target.value)}><option value="appearance">I entered a game</option><option value="starter">I became the starter</option><option value="event">Another meaningful career event</option></select></label>
        <button type="button" onClick={activateTracking} disabled={busy}>{busy ? 'SAVING…' : 'START TRACKING FROM THIS WEEK'} <Play size={14} /></button>
      </div>
      {message ? <div className={`dhq-standby-message is-${message.type}`}>{message.text}</div> : null}
    </section>
  ) : null;

  const homeStandby = standby ? (
    <div className="dhq-home-standby">
      <div className="dhq-home-standby__kicker"><span /> COLLEGE CAREER · STANDBY</div>
      <h1>WAITING FOR YOUR MOMENT</h1>
      <div className="dhq-home-standby__identity">
        <strong>{clean(career?.player?.college || career?.player?.school) || 'YOUR PROGRAM'}</strong>
        <span>{clean(career?.player?.classYear || career?.player?.year) || 'Freshman'} · {clean(career?.rtg?.rank) || clean(career?.player?.pos) || 'Player'}</span>
      </div>
      <p>No upload needed while you are inactive. DynastyHQ wakes back up when you enter a game, earn the starting job, or decide another event belongs in your career story.</p>
      <button type="button" onClick={openCareer}>VIEW CAREER STANDBY <ChevronRight size={17} /></button>
    </div>
  ) : null;

  return (
    <>
      {careerHost && collegeForm ? createPortal(collegeForm, careerHost) : null}
      {careerHost && standbyCard ? createPortal(standbyCard, careerHost) : null}
      {homeHost && homeStandby ? createPortal(homeStandby, homeHost) : null}
    </>
  );
};

export default CareerStandbyPortal;
