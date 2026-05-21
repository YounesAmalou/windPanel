import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_MODE_ID,
  REQUIRED_THEME_VARIABLES,
  groupThemeVariables,
  hasRequiredThemeVariables,
  mergeVariables,
  updateModeValue,
  type ThemeDocument,
} from './theme';

describe('theme helpers', () => {
	  test('keeps built-in variables first when merging custom variables', () => {
	    const variables = mergeVariables(['custom-token', 'primary', '--z-token']);

	    expect(variables.indexOf('font-heading')).toBe(0);
	    expect(variables.indexOf('background')).toBeLessThan(variables.indexOf('custom-token'));
	    expect(variables.indexOf('primary')).toBeLessThan(variables.indexOf('custom-token'));
	    expect(variables).toContain('z-token');
	  });

  test('groups variables into requested sections', () => {
    const groups = groupThemeVariables(['primary', 'background', 'radius', 'shadow-md', 'font-heading', 'chart-1', 'unknown']);
    const lookup = Object.fromEntries(groups.map((group) => [group.id, group.variables]));

    expect(lookup.basic).toContain('primary');
    expect(lookup.background).toContain('background');
    expect(lookup.border).toContain('radius');
    expect(lookup.border).toContain('shadow-md');
    expect(lookup.typography).toContain('font-heading');
    expect(lookup.charts).toContain('chart-1');
    expect(lookup.misc).toContain('unknown');
  });

  test('requires a complete theme surface before detection qualifies', () => {
    const complete = Object.fromEntries(REQUIRED_THEME_VARIABLES.map((variable) => [variable, 'oklch(1 0 0)']));
    const incomplete = { ...complete };
    delete incomplete.background;

    expect(hasRequiredThemeVariables(complete)).toBe(true);
    expect(hasRequiredThemeVariables(incomplete)).toBe(false);
  });

  test('updates mode values immutably', () => {
    const document: ThemeDocument = {
      version: 1,
      activeModeId: DEFAULT_MODE_ID,
      updatedAt: 1,
      variables: ['background'],
      modes: [
	        {
	          id: DEFAULT_MODE_ID,
	          label: 'Light',
	          selector: ':root',
	          source: 'computed',
          values: {
            background: 'white',
          },
        },
      ],
    };

    const next = updateModeValue(document, DEFAULT_MODE_ID, '--primary', 'oklch(0.5 0.2 250)');

    expect(next).not.toBe(document);
    expect(document.modes[0].values.primary).toBeUndefined();
    expect(next.modes[0].values.primary).toBe('oklch(0.5 0.2 250)');
    expect(next.variables).toContain('primary');
  });
});
