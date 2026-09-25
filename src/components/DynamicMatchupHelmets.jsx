import { useEffect, useMemo, useState } from 'react';
import { catalogTeamBrand, fallbackTeamBrand, resolveTeamBrand } from '../domain/teamBrandResolver.js';

const TeamLogo = ({ brand, teamName, side }) => {
  const placeholder = !String(teamName || '').trim()
    || /NO RESULT|NO FINAL|NEXT OPPONENT|^OPPONENT$/i.test(String(teamName || '').trim());

  return (
    <div
      className={`dhq-matchup-team-logo dhq-matchup-team-logo--${side}`}
      style={{
        '--dhq-team-primary': brand.primaryColor,
        '--dhq-team-secondary': brand.secondaryColor,
      }}
      role="img"
      aria-label={placeholder ? 'No current opponent result' : `${teamName || brand.displayName} logo`}
      data-placeholder={placeholder ? 'true' : 'false'}
    >
      {placeholder ? (
        <span>—</span>
      ) : brand.logo ? (
        <img src={brand.logo} alt="" draggable="false" />
      ) : (
        <span>{brand.abbreviation}</span>
      )}
    </div>
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
      className={`dhq-dynamic-matchup-helmets dhq-team-logo-matchup ${className}`.trim()}
      data-home-team={homeTeam || ''}
      data-away-team={awayTeam || ''}
      data-home-brand-source={home.source}
      data-away-brand-source={away.source}
      aria-label={`${homeTeam || 'Home team'} versus ${awayTeam || 'Away team'} logos`}
    >
      <TeamLogo brand={home} teamName={homeTeam} side="left" />
      <TeamLogo brand={away} teamName={awayTeam} side="right" />
    </div>
  );
};

export default DynamicMatchupHelmets;
