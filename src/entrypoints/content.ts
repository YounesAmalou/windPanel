import { mount, unmount } from 'svelte';
import { get, writable } from 'svelte/store';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import ThemePanel from '../components/ThemePanel.svelte';
import {
  THEME_VARIABLES,
  createEmptyThemeState,
  cssVariableName,
  type ThemeMode,
  type ThemeState,
  type ThemeVariable,
} from '../lib/theme';
import { ACTION_STATUS_MESSAGE, TOGGLE_PANEL_MESSAGE } from '../lib/constant';

type ThemePanelInstance = ReturnType<typeof mount>;

let isReadingTheme = false;

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  async main(ctx) {
    let detectedTheme = detectTheme();
    let hasTheme = hasDetectedTheme(detectedTheme);
    let ui: Awaited<ReturnType<typeof createPanelUi>> | undefined;
    const detectedThemeStore = writable(detectedTheme);
    const activeMode = writable<ThemeMode>(getInitialMode());
    const open = writable(false);

    reportAvailability(hasTheme);
    watchForThemeChanges(() => {
      const nextTheme = detectTheme();
      const nextHasTheme = hasDetectedTheme(nextTheme);

      if (ui?.mounted) return;
      detectedTheme = nextTheme;
      detectedThemeStore.set(detectedTheme);

      if (nextHasTheme !== hasTheme) {
        hasTheme = nextHasTheme;
        reportAvailability(hasTheme);
      }
    });

    browser.runtime.onMessage.addListener((message) => {
      if (message?.type !== TOGGLE_PANEL_MESSAGE || !hasTheme) return;

      void (async () => {
        ui ??= await createPanelUi(ctx, {
          getDetectedTheme: () => detectedTheme,
          detectedThemeStore,
          activeMode,
          open,
          setOpen(value) {
            open.set(value);
          },
          setActiveMode(mode) {
            activeMode.set(mode);
            applyWebsiteMode(mode);
          },
          updateTheme(nextTheme) {
            detectedTheme = nextTheme;
            detectedThemeStore.set(detectedTheme);
          },
        });

        if (!ui.mounted) ui.mount();
        open.update((value) => !value);
      })();
    });
  },
});

function reportAvailability(hasTheme: boolean): void {
  void browser.runtime.sendMessage({
    type: ACTION_STATUS_MESSAGE,
    hasTheme,
  });
}

function watchForThemeChanges(onChange: () => void): void {
  let timeout: number | undefined;
  const schedule = () => {
    if (isReadingTheme) return;

    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      if (!isReadingTheme) onChange();
    }, 150);
  };

  new MutationObserver(schedule).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style'],
    childList: true,
    subtree: true,
  });

  if (document.head) {
    new MutationObserver(schedule).observe(document.head, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  }
}

function detectTheme(): ThemeState {
  const theme = createEmptyThemeState();

  isReadingTheme = true;

  try {
    readComputedTheme(theme[getInitialMode()]);
    readDarkThemeFromProbe(theme.dark);
  } finally {
    queueMicrotask(() => {
      isReadingTheme = false;
    });
  }

  return theme;
}

function readComputedTheme(values: ThemeState[ThemeMode]): void {
  const rootStyle = getComputedStyle(document.documentElement);
  const bodyStyle = document.body ? getComputedStyle(document.body) : undefined;

  for (const variable of THEME_VARIABLES) {
    const name = cssVariableName(variable);
    values[variable] = bodyStyle?.getPropertyValue(name).trim() || rootStyle.getPropertyValue(name).trim() || '';
  }
}

function readDarkThemeFromProbe(values: ThemeState[ThemeMode]): void {
  if (!document.body) return;

  const probe = document.createElement('div');
  const child = document.createElement('div');

  probe.className = 'dark';
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText =
    'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;visibility:hidden;pointer-events:none;';
  probe.append(child);
  document.body.append(probe);

  try {
    const probeStyle = getComputedStyle(probe);
    const childStyle = getComputedStyle(child);

    for (const variable of THEME_VARIABLES) {
      const name = cssVariableName(variable);
      console.log(name, childStyle.getPropertyValue(name).trim(), probeStyle.getPropertyValue(name).trim())
      values[variable] =
        childStyle.getPropertyValue(name).trim() ||
        probeStyle.getPropertyValue(name).trim() ||
        values[variable];
    }
  } finally {
    probe.remove();
  }
}

function hasDetectedTheme(theme: ThemeState): boolean {
  return THEME_VARIABLES.some((variable) => theme.light[variable] || theme.dark[variable]);
}

function getInitialMode(): ThemeMode {
  return document.documentElement.classList.contains('dark') || document.body?.classList.contains('dark')
    ? 'dark'
    : 'light';
}

function applyWebsiteMode(mode: ThemeMode): void {
  setDarkClass(document.documentElement, mode === 'dark');
  if (document.body) setDarkClass(document.body, mode === 'dark');
}

function setDarkClass(element: Element, enabled: boolean): void {
  element.classList.toggle('dark', enabled);

  if (!element.getAttribute('class')) {
    element.removeAttribute('class');
  }
}

function applyThemeOverride(mode: ThemeMode, theme: ThemeState): void {
  if (!document.body) return;

  for (const variable of THEME_VARIABLES) {
    const value = theme[mode][variable].trim();
    const property = cssVariableName(variable);

    if (value) {
      document.body.style.setProperty(property, value);
    } else {
      document.body.style.removeProperty(property);
    }
  }
}

async function createPanelUi(
  ctx: Parameters<typeof createShadowRootUi>[0],
  state: {
    getDetectedTheme: () => ThemeState;
    detectedThemeStore: ReturnType<typeof writable<ThemeState>>;
    activeMode: ReturnType<typeof writable<ThemeMode>>;
    open: ReturnType<typeof writable<boolean>>;
    setOpen: (open: boolean) => void;
    setActiveMode: (mode: ThemeMode) => void;
    updateTheme: (theme: ThemeState) => void;
  },
) {
  return createShadowRootUi<{
    component: ThemePanelInstance;
  }>(ctx, {
    name: 'windpanel-theme-editor',
    position: 'overlay',
    alignment: 'top-right',
    zIndex: 2147483647,
    isolateEvents: true,
    onMount: (container) => {
      const component = mount(ThemePanel, {
        target: container,
        props: {
          detectedTheme: state.detectedThemeStore,
          activeMode: state.activeMode,
          open: state.open,
          onToggleOpen: () => {
            const nextOpen = !get(state.open);
            state.setOpen(nextOpen);
          },
          onModeChange: (mode: ThemeMode) => {
            state.setActiveMode(mode);
            applyThemeOverride(mode, state.getDetectedTheme());
          },
          onVariableChange: (mode: ThemeMode, variable: ThemeVariable, value: string) => {
            const nextTheme = state.getDetectedTheme();
            nextTheme[mode][variable] = value;
            state.updateTheme(nextTheme);
            applyThemeOverride(mode, nextTheme);
          },
        },
      });

      applyWebsiteMode(get(state.activeMode));
      applyThemeOverride(get(state.activeMode), state.getDetectedTheme());

      return { component };
    },
    onRemove: (mounted) => {
      if (mounted?.component) void unmount(mounted.component);
    },
  });
}
