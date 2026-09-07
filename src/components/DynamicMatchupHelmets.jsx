import { useEffect, useId, useMemo, useState } from 'react';
import { catalogTeamBrand, fallbackTeamBrand, resolveTeamBrand } from '../domain/teamBrandResolver.js';

const Helmet = ({ brand, side, teamName }) => {
  const uid = useId().replace(/:/g, '');
  const mirror = side === 'right' ? 'translate(280 0) scale(-1 1)' : undefined;
  const shineId = `helmet-shine-${uid}`;
  const clipId = `shell-clip-${uid}`;
  const decalX = side === 'right' ? 117 : 96;
  const decalCenterX = side === 'right' ? 148 : 132;

  return (
    <svg
      className={`dhq-team-helmet dhq-team-helmet--${side}`}
      viewBox="0 0 280 180"
      role="img"
      aria-label={`${teamName || brand.displayName} helmet`}
    >
      <defs>
        <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.34" />
          <stop offset="0.28" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="0.65" stopColor="#000000" stopOpacity="0.03" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.34" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d="M28 104C28 49 70 16 142 16c72 0 111 37 111 95 0 18-4 34-11 48h-51c-3-24-15-42-35-51l-9 50H94l-13-28H49v30H22c4-17 6-36 6-56Z" />
        </clipPath>
      </defs>

      <g transform={mirror}>
        <path
          d="M28 104C28 49 70 16 142 16c72 0 111 37 111 95 0 18-4 34-11 48h-51c-3-24-15-42-35-51l-9 50H94l-13-28H49v30H22c4-17 6-36 6-56Z"
          fill={brand.primaryColor}
          stroke="#e9eef2"
          strokeOpacity="0.7"
          strokeWidth="3"
        />
        <path
          d="M32 102C34 54 73 23 141 23c63 0 98 27 104 70-32-29-73-42-120-39-39 2-70 18-93 48Z"
          fill={`url(#${shineId})`}
          clipPath={`url(#${clipId})`}
        />
        <path d="M124 18c8-2 17-2 25-1l2 78-11 3-12-4Z" fill={brand.secondaryColor} opacity="0.92" />
        <path d="M48 130h34l13 28h52l9-50c21 9 34 26 37 51h-24l-8-18h-38l-6 25H64l-7-18H48Z" fill="#091018" fillOpacity="0.9" />
        <g fill="none" stroke={brand.secondaryColor} strokeLinecap="round" strokeLinejoin="round">
          <path d="M188 109c30 2 48 8 61 18" strokeWidth="7" />
          <path d="M192 124h64" strokeWidth="7" />
          <path d="M201 138h52" strokeWidth="6" />
          <path d="M248 126v25" strokeWidth="6" />
        </g>
        <circle cx="177" cy="101" r="5" fill={brand.secondaryColor} stroke="#05090d" strokeWidth="2" />
      </g>

      {brand.logo ? (
        <image
          href={brand.logo}
          x={decalX}
          y="52"
          width="67"
          height="56"
          preserveAspectRatio="xMidYMid meet"
          opacity="0.98"
        />
      ) : (
        <g>
          <circle cx={decalCenterX} cy="80" r="29" fill="#02070b" fillOpacity="0.3" stroke={brand.secondaryColor} strokeWidth="2" />
          <text x={decalCenterX} y="88" textAnchor="middle" fill={brand.secondaryColor} fontFamily="Arial Black, sans-serif" fontSize="21" fontWeight="900">{brand.abbreviation}</text>
        </g>
      )}
    </svg>
  );
};

const useBrand = (teamName, highSchool, overrides = {}) => {
  const fallback = useMemo(() => {
    if (highSchool) return fallbackTeamBrand(teamName, { ...overrides, source: 'high-school' });
    const catalog = catalogTeamBrand(teamName);
    return fallbackTeamBrand(teamName, {
      primaryColor: overrides.primaryColor || catalog.primaryColor,
      secondaryColor: overrides.secondaryColor || catalog.secondaryColor,
      logo: overrides.logo || '',
      source: catalog.source,
    });
  }, [teamName, highSchool, overrides.logo, overrides.primaryColor, overrides.secondaryColor]);
  const [brand, setBrand] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    setBrand(fallback);
    resolveTeamBrand(teamName, { highSchool, ...overrides }).then((resolved) => {
      if (!cancelled) setBrand(resolved);
    });
    return () => { cancelled = true; };
  }, [teamName, highSchool, fallback, overrides.logo, overrides.primaryColor, overrides.secondaryColor]);

  return brand;
};

const DynamicMatchupHelmets = ({
  homeTeam,
  awayTeam,
  highSchool = false,
  className = '',
  homeBrand = {},
  awayBrand = {},
}) => {
  const home = useBrand(homeTeam, highSchool, homeBrand);
  const away = useBrand(awayTeam, highSchool, awayBrand);

  return (
    <div
      className={`dhq-dynamic-matchup-helmets ${className}`.trim()}
      data-home-team={homeTeam || ''}
      data-away-team={awayTeam || ''}
      data-home-brand-source={home.source}
      data-away-brand-source={away.source}
      aria-label={`${homeTeam || 'Home team'} versus ${awayTeam || 'Away team'} helmets`}
    >
      <Helmet brand={home} side="left" teamName={homeTeam} />
      <Helmet brand={away} side="right" teamName={awayTeam} />
    </div>
  );
};

export default DynamicMatchupHelmets;
