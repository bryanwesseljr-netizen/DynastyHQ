import { useEffect, useId, useMemo, useState } from 'react';
import { catalogTeamBrand, fallbackTeamBrand, resolveTeamBrand } from '../domain/teamBrandResolver.js';

const Helmet = ({ brand, side, teamName }) => {
  const uid = useId().replace(/:/g, '');
  const mirror = side === 'right' ? 'translate(300 0) scale(-1 1)' : undefined;
  const shellClipId = `helmet-shell-clip-${uid}`;
  const shellGlowId = `helmet-shell-glow-${uid}`;
  const lowerShadeId = `helmet-lower-shade-${uid}`;
  const facemaskGlowId = `helmet-mask-glow-${uid}`;
  const decalX = side === 'right' ? 132 : 92;
  const decalCenterX = decalX + 38;

  return (
    <svg
      className={`dhq-team-helmet dhq-team-helmet--${side}`}
      viewBox="0 0 300 190"
      role="img"
      aria-label={`${teamName || brand.displayName} helmet`}
    >
      <defs>
        <clipPath id={shellClipId}>
          <path d="M27 126C20 101 24 73 41 51C63 24 102 12 149 14C203 16 239 40 255 74C264 93 267 114 262 136H224C220 120 211 108 197 101L188 132C184 150 170 163 152 167H102C88 167 76 159 69 147L61 134H39C33 134 29 131 27 126Z" />
        </clipPath>
        <linearGradient id={shellGlowId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.44" />
          <stop offset="0.27" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="0.58" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.24" />
        </linearGradient>
        <linearGradient id={lowerShadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={facemaskGlowId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.26" />
          <stop offset="0.35" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      <g transform={mirror}>
        <ellipse cx="145" cy="169" rx="111" ry="9" fill="#02060a" fillOpacity="0.38" />

        <path
          d="M27 126C20 101 24 73 41 51C63 24 102 12 149 14C203 16 239 40 255 74C264 93 267 114 262 136H224C220 120 211 108 197 101L188 132C184 150 170 163 152 167H102C88 167 76 159 69 147L61 134H39C33 134 29 131 27 126Z"
          fill={brand.primaryColor}
          stroke="#f4f7f9"
          strokeOpacity="0.68"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />

        <path
          d="M34 94C42 53 82 24 141 20C190 17 228 34 247 62C217 43 178 35 136 39C91 43 57 61 34 94Z"
          fill={`url(#${shellGlowId})`}
          clipPath={`url(#${shellClipId})`}
        />
        <path
          d="M29 112C62 126 103 132 145 127C186 122 219 110 255 86L263 137H224C220 121 210 108 197 101L188 133C184 150 169 163 152 167H102C88 167 76 159 69 147L61 134H39C33 134 29 131 27 126Z"
          fill={`url(#${lowerShadeId})`}
          clipPath={`url(#${shellClipId})`}
        />

        <path
          d="M53 54C84 26 128 17 172 21C199 23 221 31 239 45"
          fill="none"
          stroke={brand.secondaryColor}
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.96"
          clipPath={`url(#${shellClipId})`}
        />
        <path
          d="M55 55C87 30 128 22 169 25C197 27 218 34 235 47"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeOpacity="0.28"
          clipPath={`url(#${shellClipId})`}
        />

        <path d="M76 143L85 154C90 160 98 163 108 163H150C162 160 171 151 174 139L180 116C160 127 126 134 91 131L76 143Z" fill="#060b10" fillOpacity="0.6" />
        <path d="M83 147C101 153 130 154 154 148" fill="none" stroke="#ffffff" strokeOpacity="0.13" strokeWidth="2" />

        <circle cx="177" cy="105" r="15" fill="#071017" fillOpacity="0.92" stroke={brand.secondaryColor} strokeWidth="3" />
        <circle cx="177" cy="105" r="7.5" fill="#010407" stroke="#d9e0e5" strokeOpacity="0.5" strokeWidth="1.5" />
        <circle cx="201" cy="107" r="4.5" fill="#d9e0e5" stroke="#05090d" strokeWidth="1.5" />
        <circle cx="188" cy="132" r="4" fill="#d9e0e5" stroke="#05090d" strokeWidth="1.4" />

        <path d="M198 101C214 103 224 110 231 121" fill="none" stroke="#0b1117" strokeWidth="11" strokeLinecap="round" />
        <path d="M198 101C214 103 224 110 231 121" fill="none" stroke={brand.secondaryColor} strokeWidth="6.5" strokeLinecap="round" />
        <path d="M198 101C214 103 224 110 231 121" fill="none" stroke={`url(#${facemaskGlowId})`} strokeWidth="2.2" strokeLinecap="round" />

        <g fill="none" stroke="#070d12" strokeLinecap="round" strokeLinejoin="round">
          <path d="M228 119C249 119 267 122 283 129" strokeWidth="12" />
          <path d="M223 135H284" strokeWidth="12" />
          <path d="M232 151H276" strokeWidth="11" />
          <path d="M281 129V151" strokeWidth="11" />
        </g>
        <g fill="none" stroke={brand.secondaryColor} strokeLinecap="round" strokeLinejoin="round">
          <path d="M228 119C249 119 267 122 283 129" strokeWidth="6.5" />
          <path d="M223 135H284" strokeWidth="6.5" />
          <path d="M232 151H276" strokeWidth="6" />
          <path d="M281 129V151" strokeWidth="6" />
        </g>
        <g fill="none" stroke="#ffffff" strokeOpacity="0.24" strokeLinecap="round">
          <path d="M229 117C250 117 268 120 283 127" strokeWidth="1.5" />
          <path d="M224 133H283" strokeWidth="1.4" />
        </g>

        <path d="M194 124C204 125 210 129 215 137" fill="none" stroke="#dce3e8" strokeOpacity="0.65" strokeWidth="2.2" />
        <path d="M47 121C67 126 85 128 104 127" fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="2" />
      </g>

      {brand.logo ? (
        <image
          href={brand.logo}
          x={decalX}
          y="54"
          width="76"
          height="62"
          preserveAspectRatio="xMidYMid meet"
          opacity="0.98"
        />
      ) : (
        <g>
          <circle cx={decalCenterX} cy="85" r="30" fill="#02070b" fillOpacity="0.28" stroke={brand.secondaryColor} strokeWidth="2" />
          <text x={decalCenterX} y="93" textAnchor="middle" fill={brand.secondaryColor} fontFamily="Arial Black, sans-serif" fontSize="21" fontWeight="900">{brand.abbreviation}</text>
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
