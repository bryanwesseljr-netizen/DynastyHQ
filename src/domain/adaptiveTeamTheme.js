const clean = (value) => String(value ?? '').trim();

const HEX = /^#([0-9a-f]{6})$/i;

export const hexToRgb = (value) => {
  const match = HEX.exec(clean(value));
  if (!match) return null;
  return [0, 2, 4].map((index) => Number.parseInt(match[1].slice(index, index + 2), 16));
};

const channelToLinear = (value) => {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = (value) => {
  const rgb = hexToRgb(value);
  if (!rgb) return null;
  const [red, green, blue] = rgb.map(channelToLinear);
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
};

export const contrastRatio = (left, right) => {
  const first = relativeLuminance(left);
  const second = relativeLuminance(right);
  if (first === null || second === null) return 1;
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
};

export const bestTextColor = (background, {
  light = '#f8fbff',
  dark = '#071018',
} = {}) => (
  contrastRatio(background, light) >= contrastRatio(background, dark) ? light : dark
);

export const mixHex = (foreground, background, amount = 0.5) => {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  if (!fg || !bg) return clean(background) || '#07111b';
  const weight = Math.max(0, Math.min(1, Number(amount) || 0));
  const rgb = fg.map((channel, index) => Math.round((channel * weight) + (bg[index] * (1 - weight))));
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};

const readableAccentFor = (accent, surface, onSurface) => {
  if (contrastRatio(accent, surface) >= 4.5) return accent;
  const toward = onSurface === '#f8fbff' ? '#f8fbff' : '#071018';
  for (const weight of [0.72, 0.55, 0.38, 0.22]) {
    const candidate = mixHex(accent, toward, weight);
    if (contrastRatio(candidate, surface) >= 4.5) return candidate;
  }
  return onSurface;
};

export const buildAdaptiveTeamTheme = ({
  primary = '#334155',
  secondary = '#0f172a',
  highlight = '#f8fafc',
} = {}) => {
  const safePrimary = hexToRgb(primary) ? primary : '#334155';
  const safeSecondary = hexToRgb(secondary) ? secondary : '#0f172a';
  const safeHighlight = hexToRgb(highlight) ? highlight : safePrimary;
  const surface = mixHex(safePrimary, '#07111b', 0.18);
  const surfaceStrong = mixHex(safePrimary, '#07111b', 0.28);
  const surfaceAlt = mixHex(safeHighlight, '#07111b', 0.10);
  const onSurface = bestTextColor(surface);
  const darkSurface = onSurface === '#f8fbff';
  const readableHighlight = readableAccentFor(safeHighlight, surface, onSurface);

  return {
    primary: safePrimary,
    secondary: safeSecondary,
    highlight: safeHighlight,
    readableHighlight,
    onPrimary: bestTextColor(safePrimary),
    onHighlight: bestTextColor(safeHighlight),
    surface,
    surfaceStrong,
    surfaceAlt,
    onSurface,
    muted: darkSurface ? '#b8c4cd' : '#37434b',
    subtle: darkSurface ? '#8797a4' : '#56616a',
    border: mixHex(safeHighlight, '#64748b', 0.34),
    focus: readableHighlight,
  };
};
