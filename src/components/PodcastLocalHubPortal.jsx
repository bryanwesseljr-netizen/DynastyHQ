import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Archive, ChevronDown, Headphones, Mic2, Settings2, UploadCloud } from 'lucide-react';
import defaultPodcastCover from '../assets/gridiron-grind-cover.webp';
import { resolvePodcastCoverUrl, resolvePodcastShow } from '../domain/podcastShow.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import '../team-podcast-hub.css';

const findPodcastRoot = () => {
  const heading = [...document.querySelectorAll('h1')].find((node) => (
    /nippert notebook|gridiron grind/i.test(String(node.textContent || ''))
  ));
  return heading?.closest('.max-w-7xl') || null;
};

const findArchiveSection = (root) => {
  if (!root) return null;
  const heading = [...root.querySelectorAll('h3')].find((node) => /browse the show by career chapter/i.test(String(node.textContent || '')));
  return heading?.closest('section') || null;
};

const PodcastLocalHubPortal = () => {
  const { career } = useOwnerCareer();
  const [mount, setMount] = useState(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    const pageRoot = document.getElementById('root');
    if (!pageRoot) return undefined;
    let ownedMount = null;
    let observedRoot = null;

    const sync = () => {
      const podcastRoot = findPodcastRoot();
      if (!podcastRoot) {
        setMount(null);
        if (ownedMount?.parentElement) ownedMount.remove();
        ownedMount = null;
        observedRoot = null;
        return;
      }

      observedRoot = podcastRoot;
      podcastRoot.classList.add('dhq-local-podcast-root');
      podcastRoot.classList.toggle('dhq-local-podcast-archive-open', archiveOpen);

      const legacyHeader = podcastRoot.querySelector(':scope > header');
      if (legacyHeader) legacyHeader.classList.add('dhq-podcast-legacy-header');
      const archiveSection = findArchiveSection(podcastRoot);
      if (archiveSection) archiveSection.classList.add('dhq-podcast-legacy-archive');

      if (!ownedMount || !ownedMount.isConnected) {
        ownedMount = document.createElement('div');
        ownedMount.dataset.localPodcastHub = 'true';
        podcastRoot.insertBefore(ownedMount, podcastRoot.firstChild);
      }
      setMount((current) => current === ownedMount ? current : ownedMount);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(pageRoot, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (observedRoot) observedRoot.classList.remove('dhq-local-podcast-root', 'dhq-local-podcast-archive-open');
      if (ownedMount?.parentElement) ownedMount.remove();
    };
  }, [archiveOpen]);

  const show = useMemo(() => resolvePodcastShow(career || {}), [career]);
  const customCover = resolvePodcastCoverUrl(career?.outletImages?.podcast, '');
  const artwork = customCover || defaultPodcastCover;

  if (!mount || !career) return null;

  const triggerCoverUpload = () => {
    const podcastRoot = findPodcastRoot();
    const fileInput = podcastRoot?.querySelector('.dhq-podcast-legacy-header input[type="file"]');
    fileInput?.click();
  };

  const openStudioTools = () => {
    const button = [...document.querySelectorAll('button')].find((node) => /podcast tools|script \+ audio|open script/i.test(String(node.textContent || '')));
    button?.click();
  };

  return createPortal(
    <section
      className="dhq-local-podcast"
      style={{
        '--pod-primary': show.primary,
        '--pod-secondary': show.secondary,
        '--pod-accent': show.accent,
      }}
    >
      <div className="dhq-local-podcast__hero">
        <div className="dhq-local-podcast__art">
          <img src={artwork} alt={`${show.name} podcast artwork`} />
        </div>
        <div className="dhq-local-podcast__copy">
          <p className="dhq-local-podcast__eyebrow"><Headphones size={14} /> Local team podcast · {show.city}</p>
          <h1>{show.name}</h1>
          <h2>{show.subtitle}</h2>
          <p>{show.description}</p>
          <div className="dhq-local-podcast__hosts">
            <span>Hosted by</span>
            <strong>{show.hostsLabel}</strong>
          </div>
        </div>
        <div className="dhq-local-podcast__badge">
          <span>{show.nickname}</span>
          <strong>Local Coverage</strong>
          <small>Every meaningful week, in context.</small>
        </div>
      </div>

      <div className="dhq-local-podcast__utility">
        <button type="button" data-active={archiveOpen} onClick={() => setArchiveOpen((value) => !value)}>
          <Archive size={14} /> Previous Episodes <ChevronDown size={13} className={archiveOpen ? 'rotate-180' : ''} />
        </button>
        <details>
          <summary><Settings2 size={14} /> Studio Controls <ChevronDown size={13} /></summary>
          <div>
            <button type="button" onClick={openStudioTools}><Mic2 size={13} /> Script + Audio Tools</button>
            <button type="button" onClick={triggerCoverUpload}><UploadCloud size={13} /> Change Show Artwork</button>
            <p>Production controls stay backstage so the default page reads like a finished local podcast site.</p>
          </div>
        </details>
      </div>
    </section>,
    mount,
  );
};

export default PodcastLocalHubPortal;
