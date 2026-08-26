import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Archive, ChevronDown, Headphones, Image as ImageIcon, Layers3, Loader2, Mic2,
  Radio, Settings2, StickyNote, UploadCloud,
} from 'lucide-react';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { appId, db, firebaseApp } from '../firebase';
import { resolvePodcastShow } from '../domain/podcastShow';
import { compressImage } from '../services/imageCompression';
import { uploadNewsroomMedia } from '../services/newsroomMediaStorage';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import '../podcast-local-show.css';

const clean = (value) => String(value ?? '').trim();
const teamKeyFor = (school) => clean(school || 'team').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'team';

const ARTWORK_SLOTS = Object.freeze([
  { key: 'primary', label: 'Main show cover', hint: 'Use the energetic Mark + Sarah studio cover.' },
  { key: 'editorial', label: 'Editorial artwork', hint: 'Use the clean stadium / notebook cover.' },
  { key: 'hosts', label: 'Host artwork', hint: 'Use the Mark + Sarah portrait cover.' },
]);

const PodcastLocalShowPortal = () => {
  const { user, career } = useOwnerCareer();
  const [mount, setMount] = useState(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [rundownOpen, setRundownOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState('');
  const [message, setMessage] = useState('');
  const [persistedArtwork, setPersistedArtwork] = useState({});

  const show = useMemo(() => resolvePodcastShow(career || {}), [career]);
  const teamKey = useMemo(() => teamKeyFor(show.school), [show.school]);
  const careerArtwork = career?.podcastBranding?.teamArtwork?.[teamKey] || {};
  const artwork = { ...careerArtwork, ...persistedArtwork };
  const primaryArtwork = artwork.primary || career?.outletImages?.podcast || '';

  // Podcast artwork gets its own tiny cloud record in addition to the master career.
  // The master career is rewritten often by normal DynastyHQ saves; this dedicated
  // record makes artwork durable even if a stale career write races an upload.
  useEffect(() => {
    if (!user || !db || !teamKey) {
      setPersistedArtwork({});
      return undefined;
    }

    const brandingRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', `podcast_branding-${teamKey}`);
    return onSnapshot(
      brandingRef,
      (snapshot) => {
        const next = snapshot.exists() ? (snapshot.data()?.artwork || {}) : {};
        setPersistedArtwork(next);
      },
      () => setPersistedArtwork({}),
    );
  }, [teamKey, user]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;
    let ownedMount = null;
    let scheduled = false;

    const sync = () => {
      scheduled = false;
      const heading = [...root.querySelectorAll('h1')].find((node) => {
        const value = clean(node.textContent).toLowerCase();
        return value === 'nippert notebook' || value === clean(show.name).toLowerCase();
      });
      if (!heading) {
        setMount(null);
        if (ownedMount?.parentElement) ownedMount.remove();
        ownedMount = null;
        return;
      }

      const podcastRoot = heading.closest('.max-w-7xl');
      if (!podcastRoot) return;
      podcastRoot.classList.add('dhq-local-podcast-root');
      podcastRoot.style.setProperty('--pod-team-primary', show.primary || '#e00122');
      podcastRoot.style.setProperty('--pod-team-secondary', show.secondary || '#050505');
      podcastRoot.style.setProperty('--pod-team-accent', show.accent || '#ffffff');

      const oldHeader = heading.closest('header');
      if (oldHeader) oldHeader.classList.add('dhq-podcast-legacy-header');

      const archiveHeading = [...podcastRoot.querySelectorAll('h3')].find((node) => /browse the show by career chapter/i.test(node.textContent || ''));
      const archiveSection = archiveHeading?.closest('section');
      if (archiveSection) {
        archiveSection.classList.add('dhq-podcast-legacy-archive');
        archiveSection.dataset.open = archiveOpen ? 'true' : 'false';
      }

      const rundownHeading = [...podcastRoot.querySelectorAll('h3')].find((node) => /show, chapter by chapter/i.test(node.textContent || ''));
      const rundownSection = rundownHeading?.closest('section');
      if (rundownSection) {
        rundownSection.classList.add('dhq-podcast-rundown');
        rundownSection.dataset.open = rundownOpen ? 'true' : 'false';
      }

      const notesHeading = [...podcastRoot.querySelectorAll('h3')].find((node) => /grounded in the week/i.test(node.textContent || ''));
      const notesSection = notesHeading?.closest('section');
      if (notesSection) {
        notesSection.classList.add('dhq-podcast-show-notes');
        notesSection.dataset.open = notesOpen ? 'true' : 'false';
      }

      // The original episode player owns a second artwork slot. Keep it synchronized
      // with the program-specific cover so the Current Week card never shows a stale
      // or blank legacy image.
      if (primaryArtwork) {
        const currentWeekLabel = [...podcastRoot.querySelectorAll('p')].find((node) => /^current week$/i.test(clean(node.textContent)));
        const currentWeekSection = currentWeekLabel?.closest('section');
        if (currentWeekSection) {
          currentWeekSection.classList.add('dhq-podcast-current-episode');
          currentWeekSection.querySelectorAll('img').forEach((image) => {
            if (image.src !== primaryArtwork) image.src = primaryArtwork;
          });
        }
      }

      [...podcastRoot.querySelectorAll('button')].forEach((button) => {
        const text = clean(button.textContent);
        if (/generate full episode|generate episode audio|verified sources required/i.test(text)) {
          button.classList.add('dhq-podcast-production-control');
          button.dataset.open = studioOpen ? 'true' : 'false';
        }
      });

      [...podcastRoot.querySelectorAll('div, p')].forEach((node) => {
        const text = clean(node.textContent);
        if (text.length > 240) return;
        if (/use the podcast v3 panel to create the transcript first|use the podcast v3 panel to run the editorial gate/i.test(text)) {
          node.classList.add('dhq-podcast-production-note');
          node.dataset.open = studioOpen ? 'true' : 'false';
        }
      });

      if (!ownedMount || !ownedMount.isConnected) {
        ownedMount = document.createElement('div');
        ownedMount.dataset.localPodcastMasthead = 'true';
        podcastRoot.insertBefore(ownedMount, podcastRoot.firstChild);
      }
      setMount((current) => current === ownedMount ? current : ownedMount);
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };
    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (ownedMount?.parentElement) ownedMount.remove();
    };
  }, [archiveOpen, notesOpen, primaryArtwork, rundownOpen, show, studioOpen]);

  const uploadArtwork = async (slot, file) => {
    if (!file || !user || !career || !db) return;
    setUploadingSlot(slot);
    setMessage('');
    try {
      const imageDataUrl = await compressImage(file, 1600, 0.91);
      const assetId = `podcast-${teamKey}-${slot}-${Date.now()}`;
      const uploaded = await uploadNewsroomMedia({
        firebaseApp,
        appId,
        userId: user.uid,
        assetId,
        imageDataUrl,
        fileName: file.name || `${slot}-podcast-artwork.jpg`,
        origin: 'podcast-artwork',
      });
      const careerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', 'main');
      const brandingRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', `podcast_branding-${teamKey}`);
      const savedAt = new Date().toISOString();

      await runTransaction(db, async (transaction) => {
        const careerSnapshot = await transaction.get(careerRef);
        const brandingSnapshot = await transaction.get(brandingRef);
        if (!careerSnapshot.exists()) throw new Error('The DynastyHQ career could not be found.');

        const data = careerSnapshot.data();
        const branding = data.podcastBranding || {};
        const teamArtwork = branding.teamArtwork || {};
        const existing = teamArtwork[teamKey] || {};
        const backupArtwork = brandingSnapshot.exists() ? (brandingSnapshot.data()?.artwork || {}) : {};
        const nextArtwork = {
          ...backupArtwork,
          ...existing,
          school: show.school,
          showName: show.name,
          [slot]: uploaded.downloadUrl,
          updatedAt: savedAt,
        };
        const nextBranding = {
          ...branding,
          version: Math.max(5, Number(branding.version) || 0),
          teamArtwork: {
            ...teamArtwork,
            [teamKey]: nextArtwork,
          },
        };
        const remoteRevision = Number(data?._sync?.revision) || 0;
        const patch = {
          podcastBranding: nextBranding,
          '_sync.revision': remoteRevision + 1,
          '_sync.deviceId': data?._sync?.deviceId || 'podcast-artwork-manager',
          '_sync.updatedAt': savedAt,
        };
        if (slot === 'primary') patch.outletImages = { ...(data.outletImages || {}), podcast: uploaded.downloadUrl };

        transaction.update(careerRef, patch);
        transaction.set(brandingRef, {
          version: 1,
          teamKey,
          school: show.school,
          showName: show.name,
          artwork: nextArtwork,
          updatedAt: savedAt,
        });
      });

      setPersistedArtwork((current) => ({
        ...current,
        school: show.school,
        showName: show.name,
        [slot]: uploaded.downloadUrl,
        updatedAt: savedAt,
      }));
      setMessage(`${ARTWORK_SLOTS.find((entry) => entry.key === slot)?.label || 'Artwork'} saved for ${show.school}.`);
    } catch (error) {
      setMessage(error?.message || 'That podcast artwork could not be saved.');
    } finally {
      setUploadingSlot('');
    }
  };

  if (!mount || !career) return null;

  return createPortal(
    <section
      className="dhq-local-podcast"
      style={{
        '--pod-team-primary': show.primary,
        '--pod-team-secondary': show.secondary,
        '--pod-team-accent': show.accent,
      }}
    >
      <div className="dhq-local-podcast__hero">
        <div className="dhq-local-podcast__art">
          {primaryArtwork ? (
            <img src={primaryArtwork} alt={`${show.name} podcast cover`} />
          ) : (
            <div className="dhq-local-podcast__art-fallback"><Headphones size={54} /></div>
          )}
          <span className="dhq-local-podcast__live"><Radio size={12} /> Local team coverage</span>
        </div>

        <div className="dhq-local-podcast__identity">
          <p>{show.school} Football · Local Podcast</p>
          <h1>{show.name}</h1>
          <h2>{show.subtitle}</h2>
          <p className="dhq-local-podcast__tagline">{show.description}</p>
          <div className="dhq-local-podcast__hosts">
            <span><Mic2 size={13} /> Hosted by</span>
            <strong>{show.hostsLabel}</strong>
          </div>
        </div>

        <div className="dhq-local-podcast__alt-art" aria-label="Podcast artwork set">
          {[artwork.editorial, artwork.hosts].filter(Boolean).map((url, index) => <img key={url} src={url} alt={`Alternate ${show.name} artwork ${index + 1}`} />)}
          {!artwork.editorial && !artwork.hosts && (
            <div><ImageIcon size={22} /><span>Alternate show art appears here after setup.</span></div>
          )}
        </div>
      </div>

      <div className="dhq-local-podcast__utility" aria-label="Podcast page sections">
        <button type="button" data-active={archiveOpen} onClick={() => setArchiveOpen((value) => !value)}>
          <Archive size={14} /> Previous Episodes <ChevronDown size={14} />
        </button>
        <button type="button" data-active={rundownOpen} onClick={() => setRundownOpen((value) => !value)}>
          <Layers3 size={14} /> Episode Rundown <ChevronDown size={14} />
        </button>
        <button type="button" data-active={notesOpen} onClick={() => setNotesOpen((value) => !value)}>
          <StickyNote size={14} /> Show Notes <ChevronDown size={14} />
        </button>
        <button type="button" data-active={studioOpen} onClick={() => setStudioOpen((value) => !value)}>
          <Settings2 size={14} /> Studio Controls <ChevronDown size={14} />
        </button>
      </div>

      {studioOpen && (
        <div className="dhq-local-podcast__studio">
          <div className="dhq-local-podcast__studio-heading">
            <div><span>Owner tools</span><h3>Show Artwork</h3><p>These files stay attached to this program&rsquo;s podcast identity. When the career changes teams, the old artwork remains with this chapter.</p></div>
            <small>{show.school}</small>
          </div>
          <div className="dhq-local-podcast__artwork-grid">
            {ARTWORK_SLOTS.map((slot) => {
              const url = slot.key === 'primary' ? primaryArtwork : artwork[slot.key];
              return (
                <div key={slot.key} className="dhq-local-podcast__artwork-slot">
                  <div className="dhq-local-podcast__artwork-preview">
                    {url ? <img src={url} alt="" /> : <ImageIcon size={28} />}
                  </div>
                  <div className="dhq-local-podcast__artwork-copy"><strong>{slot.label}</strong><span>{slot.hint}</span></div>
                  <label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={Boolean(uploadingSlot)}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) uploadArtwork(slot.key, file);
                      }}
                    />
                    {uploadingSlot === slot.key ? <Loader2 className="animate-spin" size={13} /> : <UploadCloud size={13} />}
                    {url ? 'Replace' : 'Upload'}
                  </label>
                </div>
              );
            })}
          </div>
          {message && <p className="dhq-local-podcast__message">{message}</p>}
          <p className="dhq-local-podcast__studio-note">Transcript and audio-generation tools remain in DynastyHQ&rsquo;s existing Podcast panel and stay collapsed until you choose to work on an episode.</p>
        </div>
      )}
    </section>,
    mount,
  );
};

export default PodcastLocalShowPortal;
