import { storage } from 'wxt/utils/storage';
import {
  DEFAULT_MODE_ID,
  THEME_VARIABLES,
  cloneThemeDocument,
  collectVariablesFromModes,
  getActiveMode,
  getMode,
  mergeVariables,
  normalizeVariableName,
  type ThemeDocument,
  type ThemeModeDefinition,
  type ThemeValues,
} from './theme';

export type PresetSource = 'bundled' | 'user' | 'marketplace';

export type ThemePresetMode = {
  id: string;
  label: string;
  selector: string;
  values: ThemeValues;
};

export type ThemePreset = {
  schemaVersion: 1;
  id: string;
  name: string;
  description?: string;
  source: PresetSource;
  createdAt: number;
  updatedAt: number;
  variables: string[];
  modes: ThemePresetMode[];
};

type UserPresetsStorage = {
  getValue: () => Promise<ThemePreset[]>;
  setValue: (value: ThemePreset[]) => Promise<void>;
  watch: (callback: (value: ThemePreset[] | null, oldValue: ThemePreset[] | null) => void) => () => void;
};

export const userPresetsStorage: UserPresetsStorage = createUserPresetsStorage();

export const BUNDLED_PRESETS: ThemePreset[] = [
  createBundledPreset('violet-focus', 'Violet Focus', {
    light: {
      'font-heading': 'Inter, ui-sans-serif, system-ui, sans-serif',
      'font-sans': 'Inter, ui-sans-serif, system-ui, sans-serif',
      background: 'oklch(1 0 0)',
      foreground: 'oklch(0.15 0.01 270)',
      card: 'oklch(0.99 0.004 270)',
      'card-foreground': 'oklch(0.15 0.01 270)',
      primary: 'oklch(0.54 0.26 292)',
      'primary-foreground': 'oklch(0.98 0.02 292)',
      secondary: 'oklch(0.94 0.03 280)',
      'secondary-foreground': 'oklch(0.22 0.02 280)',
      muted: 'oklch(0.96 0.01 270)',
      'muted-foreground': 'oklch(0.48 0.03 270)',
      accent: 'oklch(0.92 0.06 310)',
      'accent-foreground': 'oklch(0.24 0.05 310)',
      destructive: 'oklch(0.58 0.24 27)',
      border: 'oklch(0.9 0.01 270)',
      input: 'oklch(0.9 0.01 270)',
      ring: 'oklch(0.62 0.18 292)',
      radius: '0.75rem',
      'shadow-sm': '0 1px 3px 0 oklch(0 0 0 / 0.10)',
      shadow: '0 1px 3px 0 oklch(0 0 0 / 0.10), 0 1px 2px -1px oklch(0 0 0 / 0.10)',
    },
    dark: {
      'font-heading': 'Inter, ui-sans-serif, system-ui, sans-serif',
      'font-sans': 'Inter, ui-sans-serif, system-ui, sans-serif',
      background: 'oklch(0.15 0.01 270)',
      foreground: 'oklch(0.98 0.004 270)',
      card: 'oklch(0.2 0.02 270)',
      'card-foreground': 'oklch(0.98 0.004 270)',
      primary: 'oklch(0.68 0.2 292)',
      'primary-foreground': 'oklch(0.16 0.02 292)',
      secondary: 'oklch(0.28 0.03 280)',
      'secondary-foreground': 'oklch(0.96 0.01 280)',
      muted: 'oklch(0.25 0.02 270)',
      'muted-foreground': 'oklch(0.72 0.03 270)',
      accent: 'oklch(0.32 0.08 310)',
      'accent-foreground': 'oklch(0.96 0.02 310)',
      destructive: 'oklch(0.7 0.19 22)',
      border: 'oklch(1 0 0 / 12%)',
      input: 'oklch(1 0 0 / 16%)',
      ring: 'oklch(0.68 0.16 292)',
      radius: '0.75rem',
      'shadow-sm': '0 1px 3px 0 oklch(0 0 0 / 0.20)',
      shadow: '0 1px 3px 0 oklch(0 0 0 / 0.22), 0 1px 2px -1px oklch(0 0 0 / 0.20)',
    },
  }),
  createBundledPreset('forest-calm', 'Forest Calm', {
    light: {
      'font-heading': 'Georgia, Cambria, "Times New Roman", serif',
      'font-sans': 'Georgia, Cambria, "Times New Roman", serif',
      background: 'oklch(0.99 0.01 145)',
      foreground: 'oklch(0.17 0.03 150)',
      card: 'oklch(1 0 0)',
      'card-foreground': 'oklch(0.17 0.03 150)',
      primary: 'oklch(0.51 0.15 155)',
      'primary-foreground': 'oklch(0.98 0.02 145)',
      secondary: 'oklch(0.92 0.05 145)',
      'secondary-foreground': 'oklch(0.22 0.04 150)',
      muted: 'oklch(0.94 0.03 145)',
      'muted-foreground': 'oklch(0.45 0.05 150)',
      accent: 'oklch(0.86 0.12 85)',
      'accent-foreground': 'oklch(0.24 0.04 85)',
      border: 'oklch(0.88 0.04 145)',
      input: 'oklch(0.88 0.04 145)',
      ring: 'oklch(0.55 0.13 155)',
      radius: '0.5rem',
      'shadow-sm': '0 1px 3px 0 oklch(0.22 0.06 145 / 0.10)',
      shadow: '0 1px 3px 0 oklch(0.22 0.06 145 / 0.10), 0 1px 2px -1px oklch(0.22 0.06 145 / 0.10)',
    },
    dark: {
      'font-heading': 'Georgia, Cambria, "Times New Roman", serif',
      'font-sans': 'Georgia, Cambria, "Times New Roman", serif',
      background: 'oklch(0.15 0.03 155)',
      foreground: 'oklch(0.96 0.02 145)',
      card: 'oklch(0.21 0.04 155)',
      'card-foreground': 'oklch(0.96 0.02 145)',
      primary: 'oklch(0.72 0.14 155)',
      'primary-foreground': 'oklch(0.15 0.03 155)',
      secondary: 'oklch(0.28 0.04 155)',
      'secondary-foreground': 'oklch(0.96 0.02 145)',
      muted: 'oklch(0.25 0.03 155)',
      'muted-foreground': 'oklch(0.72 0.04 145)',
      accent: 'oklch(0.76 0.13 85)',
      'accent-foreground': 'oklch(0.18 0.03 85)',
      border: 'oklch(1 0 0 / 12%)',
      input: 'oklch(1 0 0 / 16%)',
      ring: 'oklch(0.69 0.12 155)',
      radius: '0.5rem',
      'shadow-sm': '0 1px 3px 0 oklch(0 0 0 / 0.20)',
      shadow: '0 1px 3px 0 oklch(0 0 0 / 0.25), 0 1px 2px -1px oklch(0 0 0 / 0.22)',
    },
  }),
  createBundledPreset('mono-brutal', 'Mono Brutal', {
    light: {
      'font-heading': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      'font-sans': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      background: 'oklch(1 0 0)',
      foreground: 'oklch(0 0 0)',
      card: 'oklch(0.96 0 0)',
      'card-foreground': 'oklch(0 0 0)',
      primary: 'oklch(0 0 0)',
      'primary-foreground': 'oklch(1 0 0)',
      secondary: 'oklch(0.88 0 0)',
      'secondary-foreground': 'oklch(0 0 0)',
      muted: 'oklch(0.94 0 0)',
      'muted-foreground': 'oklch(0.42 0 0)',
      accent: 'oklch(0.84 0.18 90)',
      'accent-foreground': 'oklch(0 0 0)',
      destructive: 'oklch(0.55 0.24 27)',
      border: 'oklch(0 0 0)',
      input: 'oklch(0 0 0)',
      ring: 'oklch(0 0 0)',
      radius: '0rem',
      'shadow-sm': '4px 4px 0 0 oklch(0 0 0)',
      shadow: '6px 6px 0 0 oklch(0 0 0)',
    },
    dark: {
      'font-heading': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      'font-sans': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      background: 'oklch(0 0 0)',
      foreground: 'oklch(1 0 0)',
      card: 'oklch(0.18 0 0)',
      'card-foreground': 'oklch(1 0 0)',
      primary: 'oklch(1 0 0)',
      'primary-foreground': 'oklch(0 0 0)',
      secondary: 'oklch(0.24 0 0)',
      'secondary-foreground': 'oklch(1 0 0)',
      muted: 'oklch(0.2 0 0)',
      'muted-foreground': 'oklch(0.72 0 0)',
      accent: 'oklch(0.84 0.18 90)',
      'accent-foreground': 'oklch(0 0 0)',
      destructive: 'oklch(0.7 0.19 22)',
      border: 'oklch(1 0 0)',
      input: 'oklch(1 0 0)',
      ring: 'oklch(1 0 0)',
      radius: '0rem',
      'shadow-sm': '4px 4px 0 0 oklch(1 0 0)',
      shadow: '6px 6px 0 0 oklch(1 0 0)',
    },
  }),
];

export function createPresetFromDocument(document: ThemeDocument, name: string, source: PresetSource = 'user'): ThemePreset {
  const now = Date.now();
  const variables = document.variables.length > 0 ? document.variables : collectVariablesFromModes(document.modes);

  return {
    schemaVersion: 1,
    id: `${slugify(name)}-${now.toString(36)}`,
    name,
    source,
    createdAt: now,
    updatedAt: now,
    variables,
    modes: document.modes.map((mode) => ({
      id: mode.id,
      label: mode.label,
      selector: mode.selector,
      values: pickValues(mode.values, variables),
    })),
  };
}

export function applyPresetToDocument(
  document: ThemeDocument,
  preset: ThemePreset,
  options: { modeId?: string; allModes?: boolean } = {},
): ThemeDocument {
  const next = cloneThemeDocument(document);
  const targetMode = options.modeId ? getMode(next, options.modeId) : getActiveMode(next);

  if (options.allModes) {
    for (const mode of next.modes) {
      const presetMode = findPresetModeForMode(preset, mode);
      if (presetMode) {
        mode.values = {
          ...mode.values,
          ...withoutEmptyValues(presetMode.values),
        };
      }
    }
  } else if (targetMode) {
    const presetMode = findPresetModeForMode(preset, targetMode) || preset.modes[0];
    targetMode.values = {
      ...targetMode.values,
      ...withoutEmptyValues(presetMode?.values || {}),
    };
  }

  next.variables = mergeVariables(next.variables, preset.variables);
  next.updatedAt = Date.now();

  return next;
}

export function normalizePreset(input: unknown): ThemePreset | undefined {
  if (!input || typeof input !== 'object') return undefined;

  const value = input as Partial<ThemePreset>;
  if (!value.name || typeof value.name !== 'string') return undefined;

  const now = Date.now();
  const rawModes = Array.isArray(value.modes)
    ? value.modes
    : value.modes && typeof value.modes === 'object'
      ? Object.entries(value.modes).map(([id, values]) => ({
          id: id === 'light' ? DEFAULT_MODE_ID : id,
          label: id === 'light' ? 'Light' : id,
          selector: id === 'light' ? ':root' : `.${id}`,
          values: values as ThemeValues,
        }))
      : [];

	  const modes = rawModes
	    .filter((mode): mode is ThemePresetMode => Boolean(mode && typeof mode.id === 'string' && typeof mode.values === 'object'))
	    .map((mode) => ({
	      id: mode.id,
	      label: mode.id === DEFAULT_MODE_ID ? 'Light' : mode.label || mode.id,
	      selector: mode.selector || (mode.id === DEFAULT_MODE_ID ? ':root' : `.${mode.id}`),
	      values: normalizeValues(mode.values),
	    }));

  if (modes.length === 0) return undefined;

  return {
    schemaVersion: 1,
    id: value.id || `${slugify(value.name)}-${now.toString(36)}`,
    name: value.name,
    description: value.description,
    source: value.source === 'bundled' || value.source === 'marketplace' ? value.source : 'user',
    createdAt: value.createdAt || now,
    updatedAt: now,
    variables: mergeVariables(value.variables || [], ...modes.map((mode) => Object.keys(mode.values))),
    modes,
  };
}

function createBundledPreset(
  id: string,
  name: string,
  values: { light: ThemeValues; dark: ThemeValues },
): ThemePreset {
  const now = 1779316800000;
  const lightValues = withDefaultVariables(values.light);
  const darkValues = withDefaultVariables(values.dark);
  const modes = [
	    {
	      id: DEFAULT_MODE_ID,
	      label: 'Light',
	      selector: ':root',
	      values: lightValues,
	    },
    {
      id: 'dark',
      label: 'Dark',
      selector: '.dark',
      values: darkValues,
    },
  ];

  return {
    schemaVersion: 1,
    id,
    name,
    source: 'bundled',
    createdAt: now,
    updatedAt: now,
    variables: collectVariablesFromModes(modes as ThemeModeDefinition[]),
    modes,
  };
}

function withDefaultVariables(values: ThemeValues): ThemeValues {
  const output: ThemeValues = { ...values };

  for (const variable of THEME_VARIABLES) {
    output[variable] = values[variable] || '';
  }

  return output;
}

function pickValues(values: ThemeValues, variables: readonly string[]): ThemeValues {
  const output: ThemeValues = {};

  for (const variable of variables) {
    output[normalizeVariableName(variable)] = values[normalizeVariableName(variable)] || '';
  }

  return output;
}

function createUserPresetsStorage(): UserPresetsStorage {
  const browserRuntime = (globalThis as typeof globalThis & { browser?: { runtime?: unknown } }).browser?.runtime;

  if (!browserRuntime) {
    return {
      async getValue() {
        return [];
      },
      async setValue() {},
      watch() {
        return () => {};
      },
    };
  }

  return storage.defineItem<ThemePreset[]>('local:windpanel-user-presets', {
    fallback: [],
  });
}

function normalizeValues(values: ThemeValues): ThemeValues {
  return Object.fromEntries(
    Object.entries(values || {}).map(([name, value]) => [normalizeVariableName(name), typeof value === 'string' ? value : String(value)]),
  );
}

function withoutEmptyValues(values: ThemeValues): ThemeValues {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim().length > 0));
}

function findPresetModeForMode(preset: ThemePreset, mode: ThemeModeDefinition): ThemePresetMode | undefined {
  return (
    preset.modes.find((presetMode) => presetMode.id === mode.id) ||
    preset.modes.find((presetMode) => presetMode.selector === mode.selector) ||
    preset.modes.find((presetMode) => presetMode.id === DEFAULT_MODE_ID)
  );
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'preset';
}
