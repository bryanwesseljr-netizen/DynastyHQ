import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAdaptiveTeamTheme, contrastRatio } from './adaptiveTeamTheme.js';

test('adaptive team theme keeps readable text on Oregon-style program colors', () => {
  const theme = buildAdaptiveTeamTheme({
    primary: '#154733',
    secondary: '#fee123',
    highlight: '#fee123',
  });

  assert.ok(contrastRatio(theme.primary, theme.onPrimary) >= 4.5);
  assert.ok(contrastRatio(theme.highlight, theme.onHighlight) >= 4.5);
  assert.ok(contrastRatio(theme.surface, theme.onSurface) >= 4.5);
  assert.equal(theme.onHighlight, '#071018');
});

test('adaptive team theme remains readable for bright primary programs', () => {
  const theme = buildAdaptiveTeamTheme({ primary: '#ffcc00', highlight: '#003366' });
  assert.ok(contrastRatio(theme.primary, theme.onPrimary) >= 4.5);
  assert.ok(contrastRatio(theme.surfaceStrong, theme.onSurface) >= 4.5);
});
