<script lang="ts">
  import { onMount } from 'svelte';
  import type { Writable } from 'svelte/store';
  import {
    DEFAULT_MODE_ID,
    cloneThemeDocument,
    groupThemeVariables,
    isLikelyColorVariable,
    type ThemeDocument,
  } from '../lib/theme';
  import {
    applyPresetToDocument,
    BUNDLED_PRESETS,
    createPresetFromDocument,
    normalizePreset,
    userPresetsStorage,
    type ThemePreset,
  } from '../lib/presets';
  import { parseThemeCss, serializeThemeDocument, type ThemeParseError } from '../lib/theme-css';

  type TabId = 'presets' | 'variables' | 'theme';
  type ModalState =
    | { type: 'add-preset' }
    | { type: 'variable'; variable: string; kind: VariableEditorKind }
    | null;
  type VariableEditorKind = 'color' | 'font' | 'shadow' | 'border' | 'radius' | 'generic';

  let {
    themeDocument,
    activeModeId,
    open,
    onToggleOpen,
    onModeChange,
    onVariableChange,
    onThemeDocumentChange,
  }: {
    themeDocument: Writable<ThemeDocument>;
    activeModeId: Writable<string>;
    open: Writable<boolean>;
    onToggleOpen: () => void;
    onModeChange: (modeId: string) => void;
    onVariableChange: (modeId: string, variable: string, value: string) => void;
    onThemeDocumentChange: (theme: ThemeDocument) => void;
  } = $props();

  const tabs: { id: TabId; label: string }[] = [
    { id: 'presets', label: 'Presets' },
    { id: 'variables', label: 'Variables' },
    { id: 'theme', label: 'Theme' },
  ];

  let activeTab = $state<TabId>('presets');
  let collapsedGroups = $state<Record<string, boolean>>({});
  let userPresets = $state<ThemePreset[]>([]);
  let notice = $state('');
  let themeText = $state('');
  let themeErrors = $state<ThemeParseError[]>([]);
  let showCopyOptions = $state(false);
  let modal = $state<ModalState>(null);
  let fontSearch = $state('');
  let initialThemeSnapshot = $state<ThemeDocument | null>(null);

  const fontOptions = [
    'Inter, ui-sans-serif, system-ui, sans-serif',
    'Geist Variable, ui-sans-serif, system-ui, sans-serif',
    'Georgia, Cambria, "Times New Roman", serif',
    'ui-serif, Georgia, Cambria, "Times New Roman", serif',
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    '"Trebuchet MS", ui-sans-serif, system-ui, sans-serif',
    'Verdana, Geneva, sans-serif',
    'Arial, Helvetica, sans-serif',
  ];

  let activeMode = $derived(
    $themeDocument.modes.find((mode) => mode.id === $activeModeId) ||
      $themeDocument.modes[0] ||
      {
        id: DEFAULT_MODE_ID,
        label: 'Light',
        selector: ':root',
        values: {},
        source: 'computed' as const,
      },
  );
  let variableGroups = $derived(groupThemeVariables($themeDocument.variables));
  let defaultPreset = $derived(
    initialThemeSnapshot
      ? {
          ...createPresetFromDocument(initialThemeSnapshot, 'Default'),
          id: 'windpanel-page-default',
          source: 'bundled' as const,
        }
      : undefined,
  );
  let presets = $derived([...(defaultPreset ? [defaultPreset] : []), ...BUNDLED_PRESETS, ...userPresets]);
  let filteredFonts = $derived(
    fontOptions.filter((font) => font.toLowerCase().includes(fontSearch.trim().toLowerCase())),
  );

  $effect(() => {
    if (activeTab === 'theme' && themeErrors.length === 0) {
      themeText = serializeThemeDocument($themeDocument);
    }
  });

  $effect(() => {
    if (!initialThemeSnapshot && $themeDocument.modes.length > 0) {
      initialThemeSnapshot = cloneThemeDocument($themeDocument);
    }
  });

  onMount(() => {
    let mounted = true;
    const unwatch = userPresetsStorage.watch((nextPresets) => {
      userPresets = sanitizePresetList(nextPresets);
    });

    void userPresetsStorage.getValue().then((nextPresets) => {
      if (mounted) userPresets = sanitizePresetList(nextPresets);
    });

    return () => {
      mounted = false;
      unwatch();
    };
  });

  function toggleGroup(groupId: string): void {
    collapsedGroups[groupId] = !collapsedGroups[groupId];
  }

  function showNotice(message: string): void {
    notice = message;
    window.setTimeout(() => {
      if (notice === message) notice = '';
    }, 2200);
  }

  async function saveUserPresets(nextPresets: ThemePreset[]): Promise<void> {
    const normalizedPresets = sanitizePresetList(nextPresets);
    userPresets = normalizedPresets;
    await userPresetsStorage.setValue(normalizedPresets);
  }

  function sanitizePresetList(items: unknown): ThemePreset[] {
    const list = Array.isArray(items) ? items : [];

    return list
      .map((item) => normalizePreset(item))
      .filter((preset): preset is ThemePreset => Boolean(preset));
  }

  function openAddPresetModal(): void {
    modal = { type: 'add-preset' };
  }

  async function importPresetFromClipboard(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      const jsonPreset = parsePresetJson(text);

      if (jsonPreset) {
        await saveUserPresets([...userPresets, jsonPreset]);
        showNotice('Preset imported');
        return;
      }

      const parsedTheme = parseThemeCss(text);
      if (parsedTheme.errors.length > 0) {
        themeErrors = parsedTheme.errors;
        activeTab = 'theme';
        themeText = text;
        showNotice('Import needs review');
        return;
      }

      const name = window.prompt('Preset name', 'Imported theme');
      if (!name) return;

      await saveUserPresets([...userPresets, createPresetFromDocument(parsedTheme.document, name)]);
      showNotice('Preset imported');
    } catch {
      showNotice('Clipboard import failed');
    }
  }

  function parsePresetJson(text: string): ThemePreset | undefined {
    try {
      return normalizePreset(JSON.parse(text));
    } catch {
      return undefined;
    }
  }

  async function renamePreset(preset: ThemePreset): Promise<void> {
    if (preset.source !== 'user') return;

    const name = window.prompt('Preset name', preset.name);
    if (!name) return;

    await saveUserPresets(
      userPresets.map((item) => (item.id === preset.id ? { ...item, name, updatedAt: Date.now() } : item)),
    );
    showNotice('Preset renamed');
  }

  async function deletePreset(preset: ThemePreset): Promise<void> {
    if (preset.source !== 'user') return;

    await saveUserPresets(userPresets.filter((item) => item.id !== preset.id));
    showNotice('Preset deleted');
  }

	  async function duplicatePreset(preset: ThemePreset): Promise<void> {
    const copy = {
      ...preset,
      id: `${preset.id}-copy-${Date.now().toString(36)}`,
      name: `${preset.name} Copy`,
      source: 'user' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveUserPresets([...userPresets, copy]);
    showNotice('Preset duplicated');
  }

	  function applyPreset(preset: ThemePreset, allModes = false): void {
	    onThemeDocumentChange(applyPresetToDocument($themeDocument, preset, { modeId: $activeModeId, allModes }));
	    showNotice('Preset applied');
	  }

  async function saveCurrentThemeAsPreset(): Promise<void> {
    const name = window.prompt('Preset name', 'Current theme');
    if (!name) return;

    await saveUserPresets([...userPresets, createPresetFromDocument($themeDocument, name)]);
    showNotice('Preset saved');
  }

  async function copyTheme(): Promise<void> {
    await navigator.clipboard.writeText(serializeThemeDocument($themeDocument));
    showNotice('Theme copied');
  }

  async function copyMode(modeId: string): Promise<void> {
    await navigator.clipboard.writeText(serializeThemeDocument($themeDocument, modeId));
    showCopyOptions = false;
    showNotice('Mode copied');
  }

  async function pasteTheme(): Promise<void> {
    try {
      themeText = await navigator.clipboard.readText();
      applyThemeText();
    } catch {
      showNotice('Clipboard paste failed');
    }
  }

  function applyThemeText(): void {
    const result = parseThemeCss(themeText);
    themeErrors = result.errors;

    if (result.errors.length > 0) {
      showNotice('Theme has parse errors');
      return;
    }

    onThemeDocumentChange(result.document);
    showNotice('Theme applied');
  }

  function valueFor(variable: string): string {
    return activeMode.values[variable] || '';
  }

  function getVariableEditorKind(variable: string, value = valueFor(variable)): VariableEditorKind {
    const lower = variable.toLowerCase();

    if (isLikelyColorVariable(variable, value)) return 'color';
    if (lower.includes('font')) return 'font';
    if (lower.includes('shadow')) return 'shadow';
    if (lower.includes('border') || lower === 'input' || lower === 'ring') return 'border';
    if (lower.includes('radius')) return 'radius';
    return 'generic';
  }

  function openVariableModal(variable: string): void {
    modal = {
      type: 'variable',
      variable,
      kind: getVariableEditorKind(variable),
    };
  }

  function parseOklch(value: string): { l: string; c: string; h: string; alpha: string } | undefined {
    const match = value
      .trim()
      .match(/^oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([^)]+))?\s*\)$/i);

    if (!match) return undefined;

    return {
      l: match[1],
      c: match[2],
      h: match[3],
      alpha: match[4] || '',
    };
  }

  function updateOklch(variable: string, channel: 'l' | 'c' | 'h' | 'alpha', value: string): void {
    const current = parseOklch(valueFor(variable)) || { l: '0.7', c: '0.12', h: '250', alpha: '' };
    const next = { ...current, [channel]: value };
    const alpha = next.alpha ? ` / ${next.alpha}` : '';
    onVariableChange($activeModeId, variable, `oklch(${next.l} ${next.c} ${next.h}${alpha})`);
  }

  function selectFont(variable: string, font: string): void {
    onVariableChange($activeModeId, variable, font);
    if (variable === 'font-heading') onVariableChange($activeModeId, 'font-sans', font);
    if (variable === 'font-sans') onVariableChange($activeModeId, 'font-heading', font);
    modal = null;
    showNotice('Font applied');
  }

  function updateShadow(variable: string, part: 'x' | 'y' | 'blur' | 'spread' | 'color' | 'inset', value: string | boolean): void {
    const current = parseShadowValue(valueFor(variable));
    const next = { ...current, [part]: value };
    const inset = next.inset ? 'inset ' : '';
    onVariableChange($activeModeId, variable, `${inset}${next.x}px ${next.y}px ${next.blur}px ${next.spread}px ${next.color}`);
  }

  function parseShadowValue(value: string): { x: string; y: string; blur: string; spread: string; color: string; inset: boolean } {
    const inset = /\binset\b/.test(value);
    const numbers = value.match(/-?\d+(?:\.\d+)?(?=px)/g) || [];
    const color = value.match(/oklch\([^)]+\)|#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/i)?.[0] || 'oklch(0 0 0 / 0.16)';

    return {
      x: numbers[0] || '0',
      y: numbers[1] || '4',
      blur: numbers[2] || '12',
      spread: numbers[3] || '0',
      color,
      inset,
    };
  }

  function updateRadius(variable: string, value: string): void {
    onVariableChange($activeModeId, variable, value);
  }

  function modeValuesForPreset(preset: ThemePreset): Record<string, string> {
    const modes = Array.isArray(preset.modes) ? preset.modes : normalizePreset(preset)?.modes || [];
	    const presetMode =
	      modes.find((mode) => mode.id === $activeModeId) ||
	      modes.find((mode) => mode.id === DEFAULT_MODE_ID) ||
	      modes[0];

	    return presetMode?.values || {};
	  }
</script>

<div class="shell" class:open={$open} aria-label="WindPanel Theme Editor">
  <section class="panel" aria-hidden={!$open}>
    <button class="handle" type="button" aria-label={$open ? 'Hide panel' : 'Show panel'} onclick={onToggleOpen}>
      <span class="handle-pill"></span>
    </button>

    <header class="header">
      <div>
        <p class="eyebrow">WindPanel</p>
        <h2>{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
      </div>
      <button type="button" class="icon-btn" aria-label="Close panel" onclick={onToggleOpen}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
      </button>
    </header>

    <div class="segmented mode-list" aria-label="Theme modes">
      {#each $themeDocument.modes as mode (mode.id)}
        <button type="button" class:active={$activeModeId === mode.id} onclick={() => onModeChange(mode.id)}>
          <span>{mode.label}</span>
        </button>
      {/each}
    </div>

    <div class="segmented tabs" aria-label="Panel pages">
      {#each tabs as tab (tab.id)}
        <button type="button" class:active={activeTab === tab.id} onclick={() => (activeTab = tab.id)}>
          {tab.label}
        </button>
      {/each}
    </div>

    <div class="content custom-scrollbar">
      {#if activeTab === 'presets'}
        <div class="section-head">
          <div>
            <h3>Presets</h3>
            <p>{presets.length} available themes</p>
          </div>
          <div class="actions">
            <button type="button" class="action-btn" onclick={openAddPresetModal}>Add</button>
            <button
              type="button"
              class="action-btn"
              title="Import from clipboard"
              aria-label="Import preset from clipboard"
              onclick={importPresetFromClipboard}
            >
              Import
            </button>
            <button type="button" class="action-btn" onclick={() => showNotice('Marketplace support is planned')}>Marketplace</button>
          </div>
        </div>

        <div class="presets-list">
          {#each presets as preset (preset.id)}
            {@const values = modeValuesForPreset(preset)}
            <article
              class="preset-row"
              style={`--preset-bg:${values.background || values.card || '#fff'}; --preset-fg:${values.foreground || '#0f172a'}; --preset-border:${values.border || '#d4d4d8'}; --preset-radius:${values.radius || '10px'}; --preset-font:${values['font-heading'] || values['font-sans'] || 'inherit'};`}
            >
              <button type="button" class="preset-main" onclick={() => applyPreset(preset)}>
                <span class="preset-name">{preset.name}</span>
              </button>
              <div class="swatches" aria-hidden="true">
                {#each ['primary', 'secondary', 'accent', 'background', 'border'] as variable}
                  <span class="swatch" style={`background:${values[variable] || 'transparent'}`}></span>
                {/each}
              </div>
              <span class="radius-preview" style={`border-radius:${values.radius || '8px'}`}></span>
              <div class="row-actions">
                <button type="button" aria-label="Duplicate preset" onclick={() => duplicatePreset(preset)}>Copy</button>
                {#if preset.source === 'user'}
                  <button type="button" aria-label="Rename preset" onclick={() => renamePreset(preset)}>Edit</button>
                  <button type="button" aria-label="Delete preset" onclick={() => deletePreset(preset)}>Delete</button>
                {/if}
              </div>
            </article>
          {/each}
        </div>
      {/if}

      {#if activeTab === 'variables'}
        <div class="section-head">
          <div>
            <h3>Variables</h3>
            <p>{activeMode.label} mode</p>
          </div>
          <button type="button" class="action-btn" onclick={() => showNotice('Manual variable creation is planned')}>Add</button>
        </div>

        <div class="variable-groups">
          {#each variableGroups as group (group.id)}
            <section class="var-group">
              <button type="button" class="group-header" onclick={() => toggleGroup(group.id)}>
                <span>{group.label}</span>
                <svg class:closed={collapsedGroups[group.id]} viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
              </button>

              {#if !collapsedGroups[group.id]}
                <div class="variable-grid">
                  {#each group.variables as variable (variable)}
                    {@const value = valueFor(variable)}
                    {@const isColor = isLikelyColorVariable(variable, value)}
                    <label class="variable-cell" for={`windpanel-${variable}`}>
                      <span class="variable-label">{variable}</span>
                      <span class="input-line">
                        {#if isColor}
                          <button
                            type="button"
                            class="color-swatch"
                            style={`background:${value || 'transparent'}`}
                            aria-label={`Edit ${variable} color`}
                            onclick={() => openVariableModal(variable)}
                          ></button>
                        {:else if variable.includes('radius') || variable.includes('border')}
                          <button
                            type="button"
                            class="border-preview"
                            style={`border-radius:${value || '6px'}`}
                            aria-label={`Edit ${variable}`}
                            onclick={() => openVariableModal(variable)}
                          ></button>
                        {:else if variable.includes('font') || variable.includes('text')}
                          <button
                            type="button"
                            class="type-preview"
                            style={`font-family:${value || 'inherit'}`}
                            aria-label={`Edit ${variable}`}
                            onclick={() => openVariableModal(variable)}
                          >
                            Ag
                          </button>
                        {/if}

                        <input
                          id={`windpanel-${variable}`}
                          type="text"
                          spellcheck="false"
                          value={value}
                          placeholder="inherit"
                          oninput={(event) => onVariableChange($activeModeId, variable, event.currentTarget.value)}
                          onfocus={() => {
                            if (getVariableEditorKind(variable, value) !== 'generic') openVariableModal(variable);
                          }}
                        />
                      </span>
                    </label>
                  {/each}
                </div>
              {/if}
            </section>
          {/each}
        </div>
      {/if}

      {#if activeTab === 'theme'}
        <div class="section-head">
          <div>
            <h3>Theme</h3>
            <p>Raw CSS across all modes</p>
          </div>
	          <div class="actions">
	            <button type="button" class="action-btn" onclick={pasteTheme}>Paste</button>
	            <button type="button" class="action-btn" onclick={copyTheme}>Copy</button>
	            <button type="button" class="action-btn" onclick={saveCurrentThemeAsPreset}>Save preset</button>
	            <div class="more-wrap">
              <button type="button" class="action-btn more-button" aria-label="More copy options" onclick={() => (showCopyOptions = !showCopyOptions)}>...</button>
              {#if showCopyOptions}
                <div class="dropdown">
                  {#each $themeDocument.modes as mode (mode.id)}
                    <button type="button" onclick={() => copyMode(mode.id)}>Copy {mode.label}</button>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>

        <div class="copy-options">
          <button type="button" class="action-btn" onclick={applyThemeText}>Apply CSS</button>
        </div>

        <textarea
          class="theme-text custom-scrollbar"
          class:has-error={themeErrors.length > 0}
          bind:value={themeText}
          spellcheck="false"
        ></textarea>

        {#if themeErrors.length > 0}
          <div class="error-list">
            {#each themeErrors as error}
              <p>
                <strong>Line {error.line}:{error.column}</strong>
                {error.message}
                <code>{error.snippet}</code>
              </p>
            {/each}
          </div>
        {/if}
      {/if}
    </div>

    {#if notice}
      <div class="notice">{notice}</div>
    {/if}

    {#if modal}
	      <button class="modal-backdrop" type="button" aria-label="Close modal" onclick={() => (modal = null)}></button>
	      <section class="modal" role="dialog" aria-modal="true" tabindex="-1">
          {#if modal.type === 'add-preset'}
            <header class="modal-header">
              <h3>Add preset</h3>
              <button type="button" class="icon-btn" aria-label="Close modal" onclick={() => (modal = null)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
              </button>
            </header>
            <p class="modal-copy">Interactive preset creation is coming soon. This will let you choose variables and modes before saving.</p>
          {:else if modal.type === 'variable'}
            {@const variable = modal.variable}
            {@const value = valueFor(variable)}
            <header class="modal-header">
              <div>
                <p class="eyebrow">{modal.kind}</p>
                <h3>{variable}</h3>
              </div>
              <button type="button" class="icon-btn" aria-label="Close modal" onclick={() => (modal = null)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
              </button>
            </header>

            {#if modal.kind === 'color'}
              {@const oklch = parseOklch(value)}
              <div class="color-modal-preview" style={`background:${value || 'transparent'}`}></div>
              <div class="field-grid">
                <label>Lightness<input value={oklch?.l || '0.7'} oninput={(event) => updateOklch(variable, 'l', event.currentTarget.value)} /></label>
                <label>Chroma<input value={oklch?.c || '0.12'} oninput={(event) => updateOklch(variable, 'c', event.currentTarget.value)} /></label>
                <label>Hue<input value={oklch?.h || '250'} oninput={(event) => updateOklch(variable, 'h', event.currentTarget.value)} /></label>
              </div>
            {:else if modal.kind === 'font'}
              <input class="search-input" placeholder="Search fonts" bind:value={fontSearch} />
              <div class="font-list">
                {#each filteredFonts as font}
                  <button type="button" style={`font-family:${font}`} onclick={() => selectFont(variable, font)}>{font}</button>
                {/each}
              </div>
            {:else if modal.kind === 'shadow'}
              {@const shadow = parseShadowValue(value)}
              <div class="shadow-preview" style={`box-shadow:${value || '0 4px 16px oklch(0 0 0 / 0.16)'}`}></div>
              <div class="field-grid">
                <label>X<input type="range" min="-40" max="40" value={shadow.x} oninput={(event) => updateShadow(variable, 'x', event.currentTarget.value)} /></label>
                <label>Y<input type="range" min="-40" max="40" value={shadow.y} oninput={(event) => updateShadow(variable, 'y', event.currentTarget.value)} /></label>
                <label>Blur<input type="range" min="0" max="80" value={shadow.blur} oninput={(event) => updateShadow(variable, 'blur', event.currentTarget.value)} /></label>
                <label>Spread<input type="range" min="-40" max="40" value={shadow.spread} oninput={(event) => updateShadow(variable, 'spread', event.currentTarget.value)} /></label>
                <label class="wide">Color<input value={shadow.color} oninput={(event) => updateShadow(variable, 'color', event.currentTarget.value)} /></label>
                <label class="check-row">Inner<input type="checkbox" checked={shadow.inset} onchange={(event) => updateShadow(variable, 'inset', event.currentTarget.checked)} /></label>
              </div>
            {:else if modal.kind === 'border' || modal.kind === 'radius'}
              <div class="border-modal-preview" style={`border-radius:${value || '8px'}`}></div>
              <div class="field-grid">
                <label class="wide">Value<input value={value} oninput={(event) => updateRadius(variable, event.currentTarget.value)} /></label>
                <label>Radius<input type="range" min="0" max="48" value={parseFloat(value) || 8} oninput={(event) => updateRadius(variable, `${event.currentTarget.value}px`)} /></label>
              </div>
            {:else}
              <label class="modal-field">Value<input value={value} oninput={(event) => onVariableChange($activeModeId, variable, event.currentTarget.value)} /></label>
            {/if}
          {/if}
	      </section>
	    {/if}
	  </section>
</div>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :root {
    --wp-font: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --wp-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    --wp-bg: rgba(255, 255, 255, 0.94);
    --wp-surface: #ffffff;
    --wp-border: rgba(15, 23, 42, 0.12);
    --wp-text: #101828;
    --wp-muted: #667085;
    --wp-soft: #f2f4f7;
    --wp-hover: #e4e7ec;
    --wp-accent: #2563eb;
    --wp-danger: #dc2626;
    --wp-shadow: 0 24px 80px rgba(15, 23, 42, 0.22);
  }

  .shell {
    position: fixed;
    inset: 12px 12px 12px auto;
    z-index: 2147483647;
    width: min(460px, calc(100vw - 28px));
    font-family: var(--wp-font);
    color: var(--wp-text);
    pointer-events: none;
  }

  .panel {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 18px;
    overflow: visible;
    border: 1px solid var(--wp-border);
    border-radius: 18px;
    background: var(--wp-bg);
    box-shadow: var(--wp-shadow);
    backdrop-filter: blur(20px) saturate(140%);
    -webkit-backdrop-filter: blur(20px) saturate(140%);
    pointer-events: auto;
    transform: translateX(calc(100% + 28px)) scale(0.985);
    opacity: 0.98;
    transition:
      transform 360ms cubic-bezier(0.2, 0.9, 0.2, 1),
      opacity 180ms ease;
  }

  .shell.open .panel {
    transform: translateX(0) scale(1);
    opacity: 1;
  }

  .handle {
    position: absolute;
    top: 50%;
    left: -22px;
    display: grid;
    width: 22px;
    height: 68px;
    place-items: center;
    padding: 0;
    border: 1px solid var(--wp-border);
    border-right: 0;
    border-radius: 12px 0 0 12px;
    background: var(--wp-bg);
    color: var(--wp-muted);
    cursor: pointer;
    transform: translateY(-50%);
  }

  .handle-pill {
    width: 4px;
    height: 28px;
    border-radius: 999px;
    background: currentColor;
  }

  .header,
  .section-head,
  .actions,
  .copy-options,
  .row-actions,
  .input-line,
  .preset-row {
    display: flex;
    align-items: center;
  }

  .header,
  .section-head {
    justify-content: space-between;
    gap: 12px;
  }

  .header {
    margin-bottom: 14px;
  }

  .eyebrow,
  .section-head p {
    margin: 0;
    color: var(--wp-muted);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }

  h2,
  h3 {
    margin: 0;
    font-size: 16px;
    line-height: 1.2;
  }

  h3 {
    font-size: 14px;
  }

  button,
  input,
  textarea {
    font: inherit;
  }

  button {
    color: inherit;
  }

  svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2;
  }

  .icon-btn,
  .action-btn,
  .row-actions button {
    border: 1px solid var(--wp-border);
    background: var(--wp-surface);
    cursor: pointer;
    transition:
      background 140ms ease,
      border-color 140ms ease,
      transform 140ms ease;
  }

  .icon-btn {
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border-radius: 8px;
  }

  .icon-btn:hover,
  .action-btn:hover,
  .row-actions button:hover {
    background: var(--wp-soft);
    border-color: rgba(15, 23, 42, 0.2);
  }

  .icon-btn:active,
  .action-btn:active,
  .row-actions button:active {
    transform: translateY(1px);
  }

  .segmented {
    display: flex;
    gap: 4px;
    padding: 4px;
    margin-bottom: 10px;
    overflow-x: auto;
    border: 1px solid var(--wp-border);
    border-radius: 10px;
    background: var(--wp-soft);
  }

  .segmented button {
    min-width: max-content;
    flex: 1;
    height: 32px;
    padding: 0 10px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--wp-muted);
    cursor: pointer;
    font-size: 12px;
    font-weight: 700;
  }

  .segmented button.active {
    background: var(--wp-surface);
    color: var(--wp-text);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
  }

  .tabs {
    margin-bottom: 14px;
  }

  .notice {
    position: absolute;
    right: 18px;
    bottom: 18px;
    left: 18px;
    z-index: 4;
    padding: 8px 10px;
    border: 1px solid rgba(37, 99, 235, 0.2);
    border-radius: 8px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 700;
  }

  .content {
    min-height: 0;
    flex: 1;
    overflow: auto;
    padding-right: 4px;
    padding-bottom: 48px;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.18);
  }

  .section-head {
    margin-bottom: 12px;
  }

  .actions {
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .action-btn {
    min-height: 30px;
    padding: 0 10px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 700;
  }

  .more-wrap {
    position: relative;
  }

  .more-button {
    min-width: 32px;
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 5;
    display: grid;
    min-width: 148px;
    gap: 4px;
    padding: 6px;
    border: 1px solid var(--wp-border);
    border-radius: 8px;
    background: var(--wp-surface);
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
  }

  .dropdown button {
    min-height: 28px;
    padding: 0 8px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    text-align: left;
    font-size: 12px;
    font-weight: 700;
  }

  .dropdown button:hover {
    background: var(--wp-soft);
  }

  .presets-list,
  .variable-groups {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .preset-row {
    gap: 10px;
    min-width: 0;
    padding: 10px;
    border: 1px solid var(--preset-border);
    border-radius: var(--preset-radius);
    background: var(--preset-bg);
    color: var(--preset-fg);
    font-family: var(--preset-font);
  }

  .preset-main {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    padding: 0;
    border: 0;
    background: transparent;
    text-align: left;
    cursor: pointer;
  }

  .preset-name {
    overflow: hidden;
    font-size: 13px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .swatches {
    display: flex;
    overflow: hidden;
    border: 1px solid rgba(15, 23, 42, 0.14);
    border-radius: 999px;
  }

  .swatch {
    width: 14px;
    height: 14px;
  }

  .radius-preview,
  .border-preview {
    display: block;
    width: 22px;
    height: 22px;
    border: 2px solid currentColor;
    flex: 0 0 auto;
  }

  .row-actions {
    gap: 4px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .row-actions button {
    min-height: 24px;
    padding: 0 6px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 800;
  }

  .var-group {
    overflow: hidden;
    border: 1px solid var(--wp-border);
    border-radius: 10px;
    background: var(--wp-surface);
  }

  .group-header {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    padding: 11px 12px;
    border: 0;
    background: transparent;
    cursor: pointer;
    font-size: 13px;
    font-weight: 800;
  }

  .group-header svg {
    transition: transform 160ms ease;
  }

  .group-header svg.closed {
    transform: rotate(-90deg);
  }

  .variable-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    padding: 12px;
    border-top: 1px solid var(--wp-border);
    background: var(--wp-soft);
  }

  .variable-cell {
    position: relative;
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 5px;
  }

  .variable-label {
    overflow: hidden;
    color: var(--wp-muted);
    font-size: 11px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .input-line {
    gap: 6px;
    min-width: 0;
    padding: 4px;
    border: 1px solid var(--wp-border);
    border-radius: 8px;
    background: var(--wp-surface);
  }

  .input-line:focus-within {
    border-color: rgba(37, 99, 235, 0.75);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
  }

  .input-line input[type='text'] {
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--wp-text);
    font-family: var(--wp-mono);
    font-size: 11px;
  }

  .input-line input[type='text'] {
    width: 100%;
  }

  .color-swatch {
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid var(--wp-border);
    border-radius: 5px;
    cursor: pointer;
    flex: 0 0 auto;
  }

  .modal-backdrop {
	    position: absolute;
	    inset: 0;
	    z-index: 6;
	    width: 100%;
	    height: 100%;
	    padding: 0;
	    border: 0;
	    border-radius: 18px;
	    background: rgba(15, 23, 42, 0.22);
	    cursor: default;
	  }

  .modal {
	    position: absolute;
	    top: 50%;
	    left: 50%;
	    z-index: 7;
	    width: min(100%, 360px);
	    max-height: min(620px, calc(100vh - 72px));
	    overflow: auto;
	    transform: translate(-50%, -50%);
	    padding: 14px;
	    border: 1px solid var(--wp-border);
    border-radius: 14px;
    background: var(--wp-surface);
    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .modal-copy {
    margin: 0;
    color: var(--wp-muted);
    font-size: 13px;
    line-height: 1.5;
  }

  .color-modal-preview,
  .shadow-preview,
  .border-modal-preview {
    width: 100%;
    height: 92px;
    margin-bottom: 12px;
    border: 1px solid var(--wp-border);
    border-radius: 12px;
    background: var(--wp-soft);
  }

  .shadow-preview,
  .border-modal-preview {
    width: 120px;
    height: 84px;
    margin-inline: auto;
    background: #ffffff;
  }

  .border-modal-preview {
    border: 3px solid var(--wp-accent);
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .field-grid label,
  .modal-field {
    display: grid;
    gap: 5px;
    color: var(--wp-muted);
    font-size: 11px;
    font-weight: 800;
  }

  .field-grid .wide {
    grid-column: 1 / -1;
  }

  .field-grid input,
  .modal-field input,
  .search-input {
    min-width: 0;
    min-height: 32px;
    padding: 0 8px;
    border: 1px solid var(--wp-border);
    border-radius: 7px;
    outline: none;
    background: #ffffff;
    color: var(--wp-text);
    font-size: 12px;
  }

  .field-grid input[type='range'] {
    padding: 0;
  }

  .check-row {
    display: flex !important;
    align-items: center;
    justify-content: space-between;
  }

  .font-list {
    display: grid;
    gap: 6px;
    max-height: 260px;
    margin-top: 10px;
    overflow: auto;
  }

  .font-list button {
    min-height: 36px;
    padding: 0 10px;
    border: 1px solid var(--wp-border);
    border-radius: 8px;
    background: #ffffff;
    cursor: pointer;
    text-align: left;
    font-size: 13px;
  }

  .font-list button:hover {
    border-color: rgba(37, 99, 235, 0.45);
    background: #eff6ff;
  }

  .type-preview {
    width: 24px;
    color: var(--wp-muted);
    font-size: 13px;
    font-weight: 800;
  }

  .copy-options {
    gap: 8px;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .theme-text {
    width: 100%;
    min-height: 380px;
    padding: 12px;
    border: 1px solid var(--wp-border);
    border-radius: 10px;
    outline: none;
    resize: vertical;
    background: #101828;
    color: #e5e7eb;
    font-family: var(--wp-mono);
    font-size: 12px;
    line-height: 1.55;
  }

  .theme-text:focus {
    border-color: rgba(37, 99, 235, 0.85);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
  }

  .theme-text.has-error {
    border-color: var(--wp-danger);
  }

  .error-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 10px;
  }

  .error-list p {
    margin: 0;
    padding: 9px 10px;
    border: 1px solid #fecaca;
    border-radius: 8px;
    background: #fef2f2;
    color: #991b1b;
    font-size: 12px;
  }

  .error-list strong,
  .error-list code {
    display: block;
  }

  .error-list code {
    margin-top: 4px;
    font-family: var(--wp-mono);
    word-break: break-word;
  }

  @media (max-width: 520px) {
    .shell {
      inset: 8px 8px 8px auto;
      width: calc(100vw - 22px);
    }

    .variable-grid {
      grid-template-columns: 1fr;
    }

    .preset-row {
      align-items: stretch;
      flex-direction: column;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .panel,
    .icon-btn,
    .action-btn,
    .row-actions button,
    .group-header svg {
      transition: none;
    }
  }
</style>
