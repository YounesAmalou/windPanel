import { describe, expect, test } from 'bun:test';
import { normalizePreset } from './presets';

describe('preset normalization', () => {
  test('normalizes object-shaped mode maps from clipboard imports', () => {
    const preset = normalizePreset({
      name: 'Clipboard preset',
      modes: {
        light: {
          background: 'oklch(1 0 0)',
          'font-sans': 'Georgia, serif',
        },
        dark: {
          background: 'oklch(0 0 0)',
        },
      },
    });

    expect(preset?.modes).toBeArray();
    expect(preset?.modes[0].id).toBe('base');
    expect(preset?.modes[0].label).toBe('Light');
    expect(preset?.modes[0].values['font-sans']).toBe('Georgia, serif');
  });
});
