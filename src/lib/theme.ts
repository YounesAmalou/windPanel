export const THEME_VARIABLES = [
  'font-heading',
  'font-sans',
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'radius',
  'shadow-2xs',
  'shadow-xs',
  'shadow-sm',
  'shadow',
  'shadow-md',
  'shadow-lg',
  'shadow-xl',
  'shadow-2xl',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
] as const;

export const DEFAULT_MODE_ID = 'base';

export const REQUIRED_THEME_VARIABLES = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
  'shadow-2xs',
  'shadow-xs',
  'shadow-sm',
  'shadow',
  'shadow-md',
  'shadow-lg',
  'shadow-xl',
  'shadow-2xl',
] as const;

export type BuiltInThemeVariable = (typeof THEME_VARIABLES)[number];
export type ThemeVariable = BuiltInThemeVariable | (string & {});
export type ThemeModeId = string;
export type ThemeValues = Record<string, string>;
export type ThemeModeSource = 'computed' | 'css-rule' | 'preset' | 'user';
export type VariableGroupId = 'basic' | 'border' | 'typography' | 'charts' | 'background' | 'misc';

export type ThemeActivation =
  | { type: 'class'; target: 'html' | 'body'; value: string }
  | { type: 'attribute'; target: 'html' | 'body'; name: string; value: string }
  | { type: 'media'; query: string }
  | { type: 'selector'; selector: string };

export type ThemeModeDefinition = {
  id: ThemeModeId;
  label: string;
  selector: string;
  activation?: ThemeActivation;
  values: ThemeValues;
  source: ThemeModeSource;
};

export type ThemeDocument = {
  version: 1;
  variables: string[];
  modes: ThemeModeDefinition[];
  activeModeId: ThemeModeId;
  updatedAt: number;
};

export type VariableGroup = {
  id: VariableGroupId;
  label: string;
  variables: string[];
};

export const VARIABLE_GROUP_LABELS: Record<VariableGroupId, string> = {
  basic: 'Basic',
  border: 'Border',
  typography: 'Typography',
  charts: 'Charts',
  background: 'Background',
  misc: 'Miscellaneous',
};

export const EMPTY_THEME_VALUES = createEmptyThemeValues();

export function cssVariableName(name: string): string {
  return `--${normalizeVariableName(name)}`;
}

export function normalizeVariableName(name: string): string {
  return name.trim().replace(/^--/, '');
}

export function createEmptyThemeValues(variables: readonly string[] = THEME_VARIABLES): ThemeValues {
  return variables.reduce<ThemeValues>((values, name) => {
    values[normalizeVariableName(name)] = '';
    return values;
  }, {});
}

export function createDefaultMode(values: ThemeValues = createEmptyThemeValues()): ThemeModeDefinition {
  return {
    id: DEFAULT_MODE_ID,
    label: 'Light',
    selector: ':root',
    values: { ...values },
    source: 'computed',
  };
}

export function createThemeDocument(modes: ThemeModeDefinition[] = [createDefaultMode()]): ThemeDocument {
  const normalizedModes = modes.length > 0 ? modes.map(cloneThemeMode) : [createDefaultMode()];
  const variables = collectVariablesFromModes(normalizedModes);
  const activeModeId = normalizedModes.some((mode) => mode.id === DEFAULT_MODE_ID)
    ? DEFAULT_MODE_ID
    : normalizedModes[0]?.id || DEFAULT_MODE_ID;

  return {
    version: 1,
    variables,
    modes: normalizedModes,
    activeModeId,
    updatedAt: Date.now(),
  };
}

export function cloneThemeMode(mode: ThemeModeDefinition): ThemeModeDefinition {
  return {
    ...mode,
    activation: mode.activation ? { ...mode.activation } : undefined,
    values: { ...mode.values },
  };
}

export function cloneThemeDocument(document: ThemeDocument): ThemeDocument {
  return {
    version: 1,
    variables: [...document.variables],
    modes: document.modes.map(cloneThemeMode),
    activeModeId: document.activeModeId,
    updatedAt: document.updatedAt,
  };
}

export function ensureThemeDocumentShape(document: ThemeDocument): ThemeDocument {
  const modes = document.modes.length > 0 ? document.modes.map(cloneThemeMode) : [createDefaultMode()];
  const variables = mergeVariables(document.variables, collectVariablesFromModes(modes));
  const activeModeId = modes.some((mode) => mode.id === document.activeModeId)
    ? document.activeModeId
    : modes[0]?.id || DEFAULT_MODE_ID;

  return {
    version: 1,
    variables,
    modes,
    activeModeId,
    updatedAt: document.updatedAt || Date.now(),
  };
}

export function getMode(document: ThemeDocument, modeId: ThemeModeId): ThemeModeDefinition | undefined {
  return document.modes.find((mode) => mode.id === modeId);
}

export function getActiveMode(document: ThemeDocument): ThemeModeDefinition {
  return getMode(document, document.activeModeId) || document.modes[0] || createDefaultMode();
}

export function hasDetectedTheme(document: ThemeDocument): boolean {
  return document.modes.some((mode) => hasRequiredThemeVariables(mode.values));
}

export function hasRequiredThemeVariables(values: ThemeValues): boolean {
  return REQUIRED_THEME_VARIABLES.every((variable) => {
    const value = values[variable];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

export function updateModeValue(
  document: ThemeDocument,
  modeId: ThemeModeId,
  variable: string,
  value: string,
): ThemeDocument {
  const normalizedVariable = normalizeVariableName(variable);
  const next = cloneThemeDocument(document);
  const mode = getMode(next, modeId);

  if (!mode) return next;

  mode.values[normalizedVariable] = value;
  next.variables = mergeVariables(next.variables, [normalizedVariable]);
  next.updatedAt = Date.now();

  return next;
}

export function setActiveMode(document: ThemeDocument, modeId: ThemeModeId): ThemeDocument {
  const next = cloneThemeDocument(document);
  next.activeModeId = next.modes.some((mode) => mode.id === modeId) ? modeId : next.activeModeId;
  next.updatedAt = Date.now();
  return next;
}

export function upsertMode(document: ThemeDocument, mode: ThemeModeDefinition): ThemeDocument {
  const next = cloneThemeDocument(document);
  const index = next.modes.findIndex((existing) => existing.id === mode.id);

  if (index >= 0) {
    next.modes[index] = cloneThemeMode(mode);
  } else {
    next.modes.push(cloneThemeMode(mode));
  }

  next.variables = mergeVariables(next.variables, Object.keys(mode.values));
  next.updatedAt = Date.now();

  return next;
}

export function mergeVariables(...groups: readonly string[][]): string[] {
  const known = new Set(THEME_VARIABLES);
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const variable of THEME_VARIABLES) {
    seen.add(variable);
    merged.push(variable);
  }

  for (const group of groups) {
    for (const value of group) {
      const variable = normalizeVariableName(value);
      if (!variable || seen.has(variable)) continue;

      seen.add(variable);
      merged.push(variable);
    }
  }

  return merged.sort((a, b) => {
    const aKnown = known.has(a as BuiltInThemeVariable);
    const bKnown = known.has(b as BuiltInThemeVariable);

    if (aKnown && bKnown) {
      return THEME_VARIABLES.indexOf(a as BuiltInThemeVariable) - THEME_VARIABLES.indexOf(b as BuiltInThemeVariable);
    }

    if (aKnown) return -1;
    if (bKnown) return 1;
    return a.localeCompare(b);
  });
}

export function collectVariablesFromModes(modes: readonly ThemeModeDefinition[]): string[] {
  return mergeVariables(...modes.map((mode) => Object.keys(mode.values)));
}

export function createModeId(labelOrSelector: string): ThemeModeId {
  const normalized = labelOrSelector
    .trim()
    .replace(/^[:.#]+/, '')
    .replace(/["']/g, '')
    .replace(/\[(?:data-theme|data-mode|data-color-scheme|theme)=?([^\]]*)\]/i, '$1')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return normalized || DEFAULT_MODE_ID;
}

export function uniqueModeId(preferredId: string, existingIds: ReadonlySet<string>): string {
  const baseId = createModeId(preferredId);
  let candidate = baseId;
  let index = 2;

  while (existingIds.has(candidate)) {
    candidate = `${baseId}-${index}`;
    index += 1;
  }

  return candidate;
}

export function modeLabelFromId(id: string): string {
  if (id === DEFAULT_MODE_ID) return 'Light';

  return id
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function groupThemeVariables(variables: readonly string[]): VariableGroup[] {
  const groups: Record<VariableGroupId, string[]> = {
    basic: [],
    border: [],
    typography: [],
    charts: [],
    background: [],
    misc: [],
  };

  for (const value of variables) {
    const variable = normalizeVariableName(value);
    groups[getVariableGroupId(variable)].push(variable);
  }

  return (Object.keys(groups) as VariableGroupId[])
    .map((id) => ({
      id,
      label: VARIABLE_GROUP_LABELS[id],
      variables: groups[id],
    }))
    .filter((group) => group.variables.length > 0);
}

export function getVariableGroupId(variable: string): VariableGroupId {
  const value = normalizeVariableName(variable).toLowerCase();

  if (value.startsWith('chart-') || value.includes('chart')) return 'charts';
  if (
    value.includes('radius') ||
    value.includes('border') ||
    value.includes('ring') ||
    value.includes('outline') ||
    value.includes('shadow') ||
    value === 'input'
  ) {
    return 'border';
  }
  if (
    value.includes('font') ||
    value.includes('text') ||
    value.includes('heading') ||
    value.includes('letter') ||
    value.includes('line-height') ||
    value.includes('tracking') ||
    value.includes('weight')
  ) {
    return 'typography';
  }
  if (
    value.includes('background') ||
    value.includes('surface') ||
    value === 'sidebar' ||
    value.includes('sidebar') ||
    value === 'card' ||
    value === 'popover'
  ) {
    return 'background';
  }
  if (
    [
      'foreground',
      'card-foreground',
      'popover-foreground',
      'primary',
      'primary-foreground',
      'secondary',
      'secondary-foreground',
      'muted',
      'muted-foreground',
      'accent',
      'accent-foreground',
      'destructive',
    ].includes(value)
  ) {
    return 'basic';
  }

  return 'misc';
}

export function isLikelyColorValue(value: string): boolean {
  const trimmed = value.trim().toLowerCase();

  return (
    trimmed.startsWith('#') ||
    trimmed.startsWith('oklch(') ||
    trimmed.startsWith('oklab(') ||
    trimmed.startsWith('rgb(') ||
    trimmed.startsWith('rgba(') ||
    trimmed.startsWith('hsl(') ||
    trimmed.startsWith('hsla(') ||
    trimmed.startsWith('color(') ||
    /^[a-z]+$/.test(trimmed)
  );
}

export function isLikelyColorVariable(variable: string, value = ''): boolean {
  const name = normalizeVariableName(variable).toLowerCase();

  if (value && isLikelyColorValue(value)) return true;
  if (name.includes('radius') || name.includes('font') || name.includes('shadow')) return false;

  return (
    name.includes('color') ||
    name.includes('background') ||
    name.includes('foreground') ||
    name.includes('primary') ||
    name.includes('secondary') ||
    name.includes('muted') ||
    name.includes('accent') ||
    name.includes('destructive') ||
    name.includes('border') ||
    name.includes('input') ||
    name.includes('ring') ||
    name.includes('chart') ||
    name.includes('sidebar') ||
    name === 'card' ||
    name === 'popover'
  );
}
