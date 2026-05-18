export const THEME_VARIABLES = [
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
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
] as const;

export type ThemeMode = 'light' | 'dark';
export type ThemeVariable = (typeof THEME_VARIABLES)[number];
export type ThemeValues = Record<ThemeVariable, string>;
export type ThemeState = Record<ThemeMode, ThemeValues>;

export const EMPTY_THEME_VALUES = THEME_VARIABLES.reduce((values, name) => {
  values[name] = '';
  return values;
}, {} as ThemeValues);

export function createEmptyThemeState(): ThemeState {
  return {
    light: { ...EMPTY_THEME_VALUES },
    dark: { ...EMPTY_THEME_VALUES },
  };
}

export function cssVariableName(name: ThemeVariable): string {
  return `--${name}`;
}
