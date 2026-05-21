import { mount, unmount } from 'svelte';
import { get, writable } from 'svelte/store';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import ThemePanel from '../components/ThemePanel.svelte';
import { ACTION_STATUS_MESSAGE, TOGGLE_PANEL_MESSAGE } from '../lib/constant';
import {
  cloneThemeDocument,
  getActiveMode,
  hasDetectedTheme,
  setActiveMode,
  updateModeValue,
  type ThemeDocument,
} from '../lib/theme';
import {
  applyWebsiteMode,
  detectThemeDocument,
  isWindPanelApplyingMode,
  watchWebsiteThemeChanges,
} from '../lib/theme-detect';

type ThemePanelInstance = ReturnType<typeof mount>;

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  async main(ctx) {
    let detectedTheme = detectThemeDocument();
    let hasTheme = hasDetectedTheme(detectedTheme);
    let ui: Awaited<ReturnType<typeof createPanelUi>> | undefined;
    const themeDocumentStore = writable(detectedTheme);
    const activeModeId = writable(detectedTheme.activeModeId);
    const open = writable(false);

    reportAvailability(hasTheme);

    watchWebsiteThemeChanges(() => {
      if (isWindPanelApplyingMode()) return;

      const nextTheme = detectThemeDocument();
      const nextHasTheme = hasDetectedTheme(nextTheme);

      detectedTheme = mergeThemeDocuments(detectedTheme, nextTheme);
      themeDocumentStore.set(detectedTheme);
      activeModeId.set(detectedTheme.activeModeId);
      applyThemeOverride(getActiveMode(detectedTheme).id, detectedTheme);

      if (nextHasTheme !== hasTheme) {
        hasTheme = nextHasTheme;
        reportAvailability(hasTheme);
      }
    });

    browser.runtime.onMessage.addListener((message) => {
      if (message?.type !== TOGGLE_PANEL_MESSAGE || !hasTheme) return;

      void (async () => {
        ui ??= await createPanelUi(ctx, {
          getThemeDocument: () => detectedTheme,
          themeDocumentStore,
          activeModeId,
          open,
          setOpen(value) {
            open.set(value);
          },
          setActiveMode(modeId) {
            detectedTheme = setActiveMode(detectedTheme, modeId);
            themeDocumentStore.set(detectedTheme);
            activeModeId.set(detectedTheme.activeModeId);
            applyWebsiteMode(detectedTheme, detectedTheme.activeModeId);
            applyThemeOverride(detectedTheme.activeModeId, detectedTheme);
          },
          updateTheme(nextTheme) {
            detectedTheme = cloneThemeDocument(nextTheme);
            themeDocumentStore.set(detectedTheme);
            activeModeId.set(detectedTheme.activeModeId);
            applyThemeOverride(detectedTheme.activeModeId, detectedTheme);
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

function applyThemeOverride(modeId: string, theme: ThemeDocument): void {
  const mode = theme.modes.find((item) => item.id === modeId);
  if (!mode) return;

  const targets = [document.documentElement, document.body].filter(Boolean) as HTMLElement[];

  for (const target of targets) {
    for (const variable of theme.variables) {
      const value = mode.values[variable]?.trim();
      const property = `--${variable}`;

      if (value) {
        target.style.setProperty(property, value);
      } else {
        target.style.removeProperty(property);
      }
    }
  }
}

function mergeThemeDocuments(previous: ThemeDocument, detected: ThemeDocument): ThemeDocument {
  const next = cloneThemeDocument(detected);

  for (const previousMode of previous.modes) {
    const nextMode = next.modes.find((mode) => mode.id === previousMode.id);
    if (!nextMode) continue;

    for (const variable of previous.variables) {
      const previousValue = previousMode.values[variable]?.trim();
      if (previousValue && previousValue !== nextMode.values[variable]?.trim()) {
        nextMode.values[variable] = previousMode.values[variable];
      }
    }
  }

  next.variables = Array.from(new Set([...next.variables, ...previous.variables]));
  return next;
}

async function createPanelUi(
  ctx: Parameters<typeof createShadowRootUi>[0],
  state: {
    getThemeDocument: () => ThemeDocument;
    themeDocumentStore: ReturnType<typeof writable<ThemeDocument>>;
    activeModeId: ReturnType<typeof writable<string>>;
    open: ReturnType<typeof writable<boolean>>;
    setOpen: (open: boolean) => void;
    setActiveMode: (modeId: string) => void;
    updateTheme: (theme: ThemeDocument) => void;
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
          themeDocument: state.themeDocumentStore,
          activeModeId: state.activeModeId,
          open: state.open,
          onToggleOpen: () => {
            state.setOpen(!get(state.open));
          },
          onModeChange: (modeId: string) => {
            state.setActiveMode(modeId);
          },
          onVariableChange: (modeId: string, variable: string, value: string) => {
            const nextTheme = updateModeValue(state.getThemeDocument(), modeId, variable, value);
            state.updateTheme(nextTheme);
          },
          onThemeDocumentChange: (theme: ThemeDocument) => {
            state.updateTheme(theme);
          },
        },
      });

      applyWebsiteMode(state.getThemeDocument(), get(state.activeModeId));
      applyThemeOverride(get(state.activeModeId), state.getThemeDocument());

      return { component };
    },
    onRemove: (mounted) => {
      if (mounted?.component) void unmount(mounted.component);
    },
  });
}
