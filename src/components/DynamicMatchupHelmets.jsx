import { useEffect, useMemo, useState } from 'react';
import genericMatchupHelmets from '../assets/matchup-helmets.webp';
import { catalogTeamBrand, fallbackTeamBrand, resolveTeamBrand } from '../domain/teamBrandResolver.js';

const TeamTint = ({ brand, side }) => (
  <div
    className={`dhq-generic-matchup-helmets__tint dhq-generic-matchup-helmets__tint--${side}`}
    style={{
      '--dhq-team-primary': brand.primaryColor,
      '--dhq-team-secondary': brand.secondaryColor,
      WebkitMaskImage: `url(${genericMatchupHelmets})`,
      maskImage: `url(${genericMatchupHelmets})`,
    }}
    aria-hidden="true"
  />
);

const TeamDecal = ({ brand, teamName, side }) => (
  <div
    className={`dhq-generic-helmet-decal dhq-generic-helmet-decal--${side}`}
    style={{
      '--dhq-team-primary': brand.primaryColor,
      '--dhq-team-secondary': brand.secondaryColor,
    }}
    role="img"
    aria-label={`${teamName || brand.displayName} helmet logo`}
  >
    {brand.logo ? (
      <img src={brand.logo} alt="" draggable="false" />
    ) : (
      <span>{brand.abbreviation}</span>
    )}
  </div>
);

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
      className={`dhq-dynamic-matchup-helmets dhq-generic-matchup-helmets ${className}`.trim()}
      data-home-team={homeTeam || ''}
      data-away-team={awayTeam || ''}
      data-home-brand-source={home.source}
      data-away-brand-source={away.source}
      aria-label={`${homeTeam || 'Home team'} versus ${awayTeam || 'Away team'} helmets`}
    >
      <img
        className="dhq-generic-matchup-helmets__base"
        src={genericMatchupHelmets}
        alt=""
        draggable="false"
      />
      <TeamTint brand={home} side="left" />
      <TeamTint brand={away} side="right" />
      <TeamDecal brand={home} teamName={homeTeam} side="left" />
      <TeamDecal brand={away} teamName={awayTeam} side="right" />
    </div>
  );
};

export default DynamicMatchupHelmets;
