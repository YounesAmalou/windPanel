import {
  DEFAULT_MODE_ID,
  THEME_VARIABLES,
  collectVariablesFromModes,
  createDefaultMode,
  cssVariableName,
  getMode,
  hasRequiredThemeVariables,
  normalizeVariableName,
  type ThemeActivation,
  type ThemeDocument,
  type ThemeModeDefinition,
  type ThemeValues,
} from './theme';
import { inferSelectorInfo, splitSelectorList } from './theme-css';

type ModeAccumulator = ThemeModeDefinition & {
  selectorSet: Set<string>;
};

const THEME_ATTRIBUTE_NAMES = ['data-theme', 'data-mode', 'data-color-scheme', 'theme'] as const;

let isApplyingWebsiteMode = false;

export function isWindPanelApplyingMode(): boolean {
  return isApplyingWebsiteMode;
}

export function detectThemeDocument(): ThemeDocument {
  const modes = readThemeModesFromCssRules();
  const baseMode = modes.find((mode) => mode.id === DEFAULT_MODE_ID);
  const computedValues = readComputedThemeValues();

  if ((!baseMode || !hasRequiredThemeVariables(baseMode.values)) && hasRequiredThemeVariables(computedValues)) {
    upsertMode(modes, createDefaultMode(computedValues));
  }

  const activeModeId = detectActiveModeId(modes);
  const activeValues = computedValues;
  const activeMode = modes.find((mode) => mode.id === activeModeId);

  if (activeMode) {
    activeMode.values = {
      ...activeMode.values,
      ...withoutEmptyValues(activeValues),
    };
    activeMode.source = activeMode.source === 'css-rule' ? 'css-rule' : 'computed';
  }

  const normalizedModes = modes.filter((mode) => hasRequiredThemeVariables(mode.values)).map(normalizeModeSelector);
  const resolvedActiveModeId = normalizedModes.some((mode) => mode.id === activeModeId)
    ? activeModeId
    : normalizedModes[0]?.id || DEFAULT_MODE_ID;

  return {
    version: 1,
    variables: collectVariablesFromModes(normalizedModes),
    modes: normalizedModes,
    activeModeId: resolvedActiveModeId,
    updatedAt: Date.now(),
  };
}

export function detectActiveModeId(modes: readonly ThemeModeDefinition[]): string {
  for (const mode of modes) {
    if (mode.id === DEFAULT_MODE_ID || !mode.activation) continue;
    if (activationMatches(mode.activation)) return mode.id;
  }

  const html = document.documentElement;
  const body = document.body;

  if (html.classList.contains('dark') || body?.classList.contains('dark')) {
    const darkMode = modes.find((mode) => mode.id === 'dark' || mode.activation?.type === 'class' && mode.activation.value === 'dark');
    if (darkMode) return darkMode.id;
  }

  for (const attribute of THEME_ATTRIBUTE_NAMES) {
    const value = html.getAttribute(attribute) || body?.getAttribute(attribute);
    if (!value) continue;

    const matched = modes.find((mode) => mode.id === value || mode.activation?.type === 'attribute' && mode.activation.value === value);
    if (matched) return matched.id;
  }

  return DEFAULT_MODE_ID;
}

export function applyWebsiteMode(document: ThemeDocument, modeId: string): void {
  const mode = getMode(document, modeId);
  if (!mode) return;

  isApplyingWebsiteMode = true;

  try {
    clearKnownActivations(document.modes, mode.activation);
    applyActivation(mode.activation);
  } finally {
    window.setTimeout(() => {
      isApplyingWebsiteMode = false;
    }, 0);
  }
}

export function readComputedThemeValues(): ThemeValues {
  const rootStyle = getComputedStyle(document.documentElement);
  const bodyStyle = document.body ? getComputedStyle(document.body) : undefined;
  const values: ThemeValues = {};

  for (const variable of THEME_VARIABLES) {
    const name = cssVariableName(variable);
    const value = bodyStyle?.getPropertyValue(name).trim() || rootStyle.getPropertyValue(name).trim();
    if (value) values[variable] = value;
  }

  return values;
}

export function watchWebsiteThemeChanges(onChange: () => void): () => void {
  let timeout: number | undefined;
  const observers: MutationObserver[] = [];
  const schedule = () => {
    if (isApplyingWebsiteMode) return;

    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      if (!isApplyingWebsiteMode) onChange();
    }, 120);
  };

  const observeAttributes = (target: Element | null) => {
    if (!target) return;

    const observer = new MutationObserver(schedule);
    observer.observe(target, {
      attributes: true,
      attributeFilter: ['class', ...THEME_ATTRIBUTE_NAMES],
    });
    observers.push(observer);
  };

  observeAttributes(document.documentElement);
  observeAttributes(document.body);

  if (document.head) {
    const observer = new MutationObserver(schedule);
    observer.observe(document.head, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    observers.push(observer);
  }

  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener?.('change', schedule);

  return () => {
    window.clearTimeout(timeout);
    for (const observer of observers) observer.disconnect();
    media?.removeEventListener?.('change', schedule);
  };
}

function readThemeModesFromCssRules(): ThemeModeDefinition[] {
  const modes = new Map<string, ModeAccumulator>();

  const readRuleList = (rules: CSSRuleList): void => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        readStyleRule(rule, modes);
        continue;
      }

      if ('cssRules' in rule) {
        try {
          readRuleList((rule as CSSGroupingRule).cssRules);
        } catch {
          // Some browser-generated or cross-origin rule groups are inaccessible.
        }
      }
    }
  };

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (sheet.cssRules) readRuleList(sheet.cssRules);
    } catch {
      // Cross-origin stylesheets are allowed to be unreadable. Computed styles remain the fallback.
    }
  }

  return Array.from(modes.values())
    .filter((mode) => hasRequiredThemeVariables(mode.values))
    .map(({ selectorSet, ...mode }) => ({
      ...mode,
      selector: Array.from(selectorSet).join(', ') || mode.selector,
    }));
}

function readStyleRule(rule: CSSStyleRule, modes: Map<string, ModeAccumulator>): void {
  const values = readCustomProperties(rule.style);
  if (Object.keys(values).length === 0) return;
  if (!hasAnyThemeVariable(values)) return;

  for (const selector of splitSelectorList(rule.selectorText)) {
    const selectorInfo = inferSelectorInfo(selector, new Set(modes.keys()));
    const existing = modes.get(selectorInfo.id);

    if (existing) {
      Object.assign(existing.values, values);
      existing.selectorSet.add(selectorInfo.selector);
      continue;
    }

    modes.set(selectorInfo.id, {
      id: selectorInfo.id,
      label: selectorInfo.label,
      selector: selectorInfo.selector,
      selectorSet: new Set([selectorInfo.selector]),
      activation: selectorInfo.activation,
      values: { ...values },
      source: 'css-rule',
    });
  }
}

function hasAnyThemeVariable(values: ThemeValues): boolean {
  const themeVariables = new Set(THEME_VARIABLES);
  return Object.keys(values).some((variable) => themeVariables.has(variable as (typeof THEME_VARIABLES)[number]));
}

function readCustomProperties(style: CSSStyleDeclaration): ThemeValues {
  const values: ThemeValues = {};

  for (let index = 0; index < style.length; index += 1) {
    const property = style.item(index);
    if (!property.startsWith('--')) continue;

    const variable = normalizeVariableName(property);
    values[variable] = style.getPropertyValue(property).trim();
  }

  return values;
}

function upsertMode(modes: ThemeModeDefinition[], mode: ThemeModeDefinition): void {
  const existing = modes.find((item) => item.id === mode.id);

  if (existing) {
    existing.values = {
      ...mode.values,
      ...existing.values,
    };
    existing.selector = existing.selector || mode.selector;
  } else {
    modes.push(mode);
  }
}

function withoutEmptyValues(values: ThemeValues): ThemeValues {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim().length > 0));
}

function normalizeModeSelector(mode: ThemeModeDefinition): ThemeModeDefinition {
  return {
    ...mode,
    selector: mode.selector || (mode.id === DEFAULT_MODE_ID ? ':root' : `.${mode.id}`),
  };
}

function activationMatches(activation: ThemeActivation): boolean {
  if (activation.type === 'class') {
    return getActivationElement(activation.target).classList.contains(activation.value);
  }

  if (activation.type === 'attribute') {
    return getActivationElement(activation.target).getAttribute(activation.name) === activation.value;
  }

  if (activation.type === 'media') {
    return window.matchMedia?.(activation.query).matches || false;
  }

  try {
    return document.documentElement.matches(activation.selector) || Boolean(document.body?.matches(activation.selector));
  } catch {
    return false;
  }
}

function clearKnownActivations(modes: readonly ThemeModeDefinition[], selected?: ThemeActivation): void {
  for (const mode of modes) {
    const activation = mode.activation;
    if (!activation) continue;

    if (activation.type === 'class') {
      const element = getActivationElement(activation.target);
      element.classList.remove(activation.value);
      removeEmptyClassAttribute(element);
      continue;
    }

    if (activation.type === 'attribute') {
      const element = getActivationElement(activation.target);
      if (!selected || selected.type !== 'attribute' || selected.target === activation.target && selected.name === activation.name) {
        element.removeAttribute(activation.name);
      }
    }
  }
}

function applyActivation(activation: ThemeActivation | undefined): void {
  if (!activation) return;

  if (activation.type === 'class') {
    getActivationElement(activation.target).classList.add(activation.value);
    return;
  }

  if (activation.type === 'attribute') {
    getActivationElement(activation.target).setAttribute(activation.name, activation.value);
  }
}

function getActivationElement(target: 'html' | 'body'): HTMLElement {
  return target === 'body' && document.body ? document.body : document.documentElement;
}

function removeEmptyClassAttribute(element: Element): void {
  if (!element.getAttribute('class')) {
    element.removeAttribute('class');
  }
}
