import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { appId, db } from '../firebase';
import { resolvePodcastShow } from '../domain/podcastShow';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const clean = (value) => String(value ?? '').trim();
const teamKeyFor = (school) => clean(school || 'team')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '') || 'team';

const PodcastArtworkHydrationPortal = () => {
  const { user, career } = useOwnerCareer();
  const [persistedArtwork, setPersistedArtwork] = useState({});
  const show = useMemo(() => resolvePodcastShow(career || {}), [career]);
  const teamKey = useMemo(() => teamKeyFor(show.school), [show.school]);
  const careerArtwork = career?.podcastBranding?.teamArtwork?.[teamKey] || {};
  const artwork = { ...careerArtwork, ...persistedArtwork };
  const primaryArtwork = artwork.primary || career?.outletImages?.podcast || '';

  // Subscribe as soon as the owner session exists. This intentionally does not
  // depend on Studio Controls being opened; listener-facing artwork should be
  // ready the moment the Podcast page mounts.
  useEffect(() => {
    if (!user || !db || !teamKey) {
      setPersistedArtwork({});
      return undefined;
    }

    const brandingRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hq_data', `podcast_branding-${teamKey}`);
    return onSnapshot(
      brandingRef,
      (snapshot) => setPersistedArtwork(snapshot.exists() ? (snapshot.data()?.artwork || {}) : {}),
      () => setPersistedArtwork({}),
    );
  }, [teamKey, user]);

  useEffect(() => {
    const urls = [primaryArtwork, artwork.editorial, artwork.hosts].filter(Boolean);
    if (!urls.length) return undefined;

    let cancelled = false;
    let scheduled = false;
    const ownedImages = new Set();
    const timers = [];

    const ensureImage = (container, url, slot) => {
      if (!container || !url) return;
      const native = [...container.querySelectorAll('img')].find((image) => image.dataset.podcastEagerArtwork !== 'true');
      if (native) {
        if (native.src !== url) native.src = url;
        container.querySelectorAll('img[data-podcast-eager-artwork="true"]').forEach((image) => image.remove());
        return;
      }

      let image = container.querySelector(`img[data-podcast-eager-slot="${slot}"]`);
      if (!image) {
        image = document.createElement('img');
        image.dataset.podcastEagerArtwork = 'true';
        image.dataset.podcastEagerSlot = slot;
        image.alt = `${show.name} podcast artwork`;
        image.style.width = '100%';
        image.style.height = '100%';
        image.style.objectFit = 'cover';
        container.prepend(image);
        ownedImages.add(image);
      }
      if (image.src !== url) image.src = url;
    };

    const paint = () => {
      scheduled = false;
      if (cancelled) return;

      const podcast = document.querySelector('.dhq-local-podcast');
      if (!podcast) return;

      const primaryContainer = podcast.querySelector('.dhq-local-podcast__art');
      ensureImage(primaryContainer, primaryArtwork, 'primary');
      const primaryFallback = primaryContainer?.querySelector('.dhq-local-podcast__art-fallback');
      if (primaryFallback && primaryArtwork) primaryFallback.style.display = 'none';

      const altContainer = podcast.querySelector('.dhq-local-podcast__alt-art');
      const altUrls = [artwork.editorial, artwork.hosts].filter(Boolean);
      if (altContainer && altUrls.length) {
        const nativeAlt = [...altContainer.querySelectorAll('img')].filter((image) => image.dataset.podcastEagerArtwork !== 'true');
        if (nativeAlt.length >= altUrls.length) {
          nativeAlt.slice(0, altUrls.length).forEach((image, index) => {
            if (image.src !== altUrls[index]) image.src = altUrls[index];
          });
          altContainer.querySelectorAll('img[data-podcast-eager-artwork="true"]').forEach((image) => image.remove());
        } else if (nativeAlt.length === 0) {
          altUrls.forEach((url, index) => {
            let image = altContainer.querySelector(`img[data-podcast-eager-slot="alt-${index}"]`);
            if (!image) {
              image = document.createElement('img');
              image.dataset.podcastEagerArtwork = 'true';
              image.dataset.podcastEagerSlot = `alt-${index}`;
              image.alt = `Alternate ${show.name} artwork ${index + 1}`;
              altContainer.prepend(image);
              ownedImages.add(image);
            }
            if (image.src !== url) image.src = url;
          });
        }
        const altFallback = [...altContainer.children].find((node) => node.tagName !== 'IMG');
        if (altFallback) altFallback.style.display = 'none';
      }

      // Keep the legacy Current Week episode tile synchronized too. That tile is
      // outside the local masthead and can mount a beat later than the show art.
      if (primaryArtwork) {
        const root = podcast.closest('.max-w-7xl') || document.getElementById('root');
        const currentWeekLabel = [...(root?.querySelectorAll('p') || [])]
          .find((node) => /^current week$/i.test(clean(node.textContent)));
        const currentWeekSection = currentWeekLabel?.closest('section');
        currentWeekSection?.querySelectorAll('img').forEach((image) => {
          if (image.src !== primaryArtwork) image.src = primaryArtwork;
        });
      }
    };

    const schedule = () => {
      if (scheduled || cancelled) return;
      scheduled = true;
      window.requestAnimationFrame(paint);
    };

    // Preload the images and force a paint as each one becomes available. This
    // avoids the browser-layout quirk where the saved covers first appeared only
    // after Studio Controls caused a reflow.
    const preloaders = urls.map((url) => {
      const image = new Image();
      image.onload = schedule;
      image.onerror = schedule;
      image.src = url;
      if (image.complete) schedule();
      return image;
    });

    schedule();
    [0, 80, 220, 500, 1000].forEach((delay) => timers.push(window.setTimeout(schedule, delay)));

    const observer = new MutationObserver(schedule);
    const root = document.getElementById('root');
    if (root) observer.observe(root, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
      preloaders.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
      ownedImages.forEach((image) => {
        if (image.isConnected) image.remove();
      });
    };
  }, [artwork.editorial, artwork.hosts, primaryArtwork, show.name]);

  return null;
};

export default PodcastArtworkHydrationPortal;
