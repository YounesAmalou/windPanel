import { describe, expect, test } from 'bun:test';
import { parseThemeCss, serializeThemeDocument } from './theme-css';

describe('theme css parser', () => {
  test('parses root, class, and data-attribute modes', () => {
    const result = parseThemeCss(`
      :root {
        --background: oklch(1 0 0);
        --primary: oklch(0.52 0.24 292);
      }

      .dark {
        --background: oklch(0.15 0.01 270);
      }

      body[data-theme="sepia"] {
        --background: oklch(0.94 0.04 83);
      }
    `);

    expect(result.errors).toEqual([]);
    expect(result.document.modes.map((mode) => mode.id)).toEqual(['base', 'dark', 'sepia']);
    expect(result.document.modes[2].activation).toEqual({
      type: 'attribute',
      target: 'body',
      name: 'data-theme',
      value: 'sepia',
    });
  });

  test('reports invalid custom property snippets with line and column', () => {
    const result = parseThemeCss(`
      :root {
        --background oklch(1 0 0);
      }
    `);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].snippet).toContain('--background');
    expect(result.errors[0].line).toBeGreaterThan(0);
    expect(result.errors[0].column).toBeGreaterThan(0);
  });

  test('serializes parsed theme documents back to css', () => {
    const result = parseThemeCss(`
      :root {
        --background: oklch(1 0 0);
      }

      .dark {
        --background: oklch(0.15 0.01 270);
      }
    `);

    const css = serializeThemeDocument(result.document);

    expect(css).toContain(':root');
    expect(css).toContain('.dark');
    expect(css).toContain('--background: oklch(1 0 0);');
  });
});
