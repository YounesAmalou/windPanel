<script lang="ts">
  import type { Writable } from 'svelte/store';
  import { slide } from 'svelte/transition';
  import { THEME_VARIABLES, type ThemeMode, type ThemeState, type ThemeVariable } from '../lib/theme';

  // Svelte 5 Props using runes
  let {
    detectedTheme,
    activeMode,
    open,
    onToggleOpen,
    onModeChange,
    onVariableChange
  }: {
    detectedTheme: Writable<ThemeState>;
    activeMode: Writable<ThemeMode>;
    open: Writable<boolean>;
    onToggleOpen: () => void;
    onModeChange: (mode: ThemeMode) => void;
    onVariableChange: (mode: ThemeMode, variable: ThemeVariable, value: string) => void;
  } = $props();

  // Local Component State
  let activeTab = $state<'presets' | 'variables' | 'theme'>('presets');
  let collapsedGroups = $state<Record<string, boolean>>({});
  let themeText = $state('');
  let themeError = $state<string | null>(null);
  let isCopied = $state(false);

  // Sync the theme editor text whenever the detected theme changes, if not currently editing
  $effect(() => {
    if (activeTab === 'theme' && !themeError) {
      themeText = JSON.stringify($detectedTheme, null, 2);
    }
  });

  // Mock Presets Data (You can move this to your lib later)
  const presets = [
    {
      id: 'midnight-breeze', name: 'Midnight Breeze', font: 'Inter, sans-serif', radius: '16px',
      themes: {
        light: { cardBg: '#ffffff', primary: '#3b82f6', secondary: '#8b5cf6', accent: '#f43f5e', bg: '#f8fafc', border: '#e2e8f0' },
        dark: { cardBg: '#1e293b', primary: '#60a5fa', secondary: '#a78bfa', accent: '#fb7185', bg: '#0f172a', border: '#334155' }
      }
    },
    {
      id: 'forest-minimal', name: 'Forest Minimal', font: 'ui-sans-serif, system-ui', radius: '6px',
      themes: {
        light: { cardBg: '#fcfdfb', primary: '#10b981', secondary: '#059669', accent: '#f59e0b', bg: '#ecfdf5', border: '#d1fae5' },
        dark: { cardBg: '#064e3b', primary: '#34d399', secondary: '#10b981', accent: '#fbbf24', bg: '#022c22', border: '#065f46' }
      }
    },
    {
      id: 'neo-brutal', name: 'Neo Brutal', font: 'ui-monospace, monospace', radius: '0px',
      themes: {
        light: { cardBg: '#fbbf24', primary: '#000000', secondary: '#f87171', accent: '#34d399', bg: '#ffffff', border: '#000000' },
        dark: { cardBg: '#000000', primary: '#fbbf24', secondary: '#f87171', accent: '#34d399', bg: '#1f2937', border: '#fbbf24' }
      }
    }
  ];

  // Dynamically group variables logically
  let groupedVariables = $derived(() => {
    const groups: Record<string, string[]> = {
      'Brand Colors': [], 'Backgrounds': [], 'Typography': [], 'Borders & Radius': [], 'Misc': []
    };
    
    for (const v of THEME_VARIABLES) {
      const lower = v.toLowerCase();
      if (lower.includes('primary') || lower.includes('accent') || lower.includes('brand')) groups['Brand Colors'].push(v);
      else if (lower.includes('bg') || lower.includes('background') || lower.includes('surface')) groups['Backgrounds'].push(v);
      else if (lower.includes('font') || lower.includes('text') || lower.includes('typography')) groups['Typography'].push(v);
      else if (lower.includes('radius') || lower.includes('border')) groups['Borders & Radius'].push(v);
      else groups['Misc'].push(v);
    }
    
    return Object.fromEntries(Object.entries(groups).filter(([_, vars]) => vars.length > 0));
  });

  function toggleGroup(group: string) {
    collapsedGroups[group] = !collapsedGroups[group];
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (!parsed.light || !parsed.dark) throw new Error("Missing light/dark objects.");
      
      themeText = text;
      themeError = null;
      // In a full implementation, you would call your setStore function here to apply 'parsed'
    } catch (e) {
      themeError = "Invalid theme format. Ensure it's valid JSON matching the ThemeState structure.";
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(JSON.stringify($detectedTheme, null, 2));
    isCopied = true;
    setTimeout(() => (isCopied = false), 2000);
  }
</script>

<div class="shell" class:open={$open} aria-label="WindPanel Theme Editor">
  <section class="panel">
    <!-- Drag Handle -->
    <button
      class="handle"
      type="button"
      aria-label={$open ? 'Hide panel' : 'Show panel'}
      onclick={onToggleOpen}
    >
      <div class="handle-pill"></div>
    </button>

    <!-- Header -->
    <header>
      <div class="header-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
        <h2>Theme Engine</h2>
      </div>
      <button type="button" class="icon-btn" aria-label="Close panel" onclick={onToggleOpen}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
      </button>
    </header>

    <!-- Theme Mode Toggle -->
    <div class="segmented-control mode-toggle">
      {#each (['light', 'dark'] as ThemeMode[]) as mode}
        <button
          type="button"
          class:active={$activeMode === mode}
          onclick={() => onModeChange(mode)}
        >
          {#if mode === 'light'}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M5 5l1.5 1.5"/><path d="M17.5 17.5L19 19"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M5 19l1.5-1.5"/><path d="M17.5 6.5L19 5"/></svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          {/if}
          {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </button>
      {/each}
    </div>

    <!-- Main Navigation Tabs -->
    <div class="segmented-control tabs">
      {#each ['presets', 'variables', 'theme'] as tab}
        <button
          type="button"
          class:active={activeTab === tab}
          onclick={() => activeTab = tab as any}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      {/each}
    </div>

    <!-- Content Area -->
    <div class="content-area custom-scrollbar">
      
      <!-- TAB: PRESETS -->
      {#if activeTab === 'presets'}
        <div class="presets-list">
          {#each presets as preset}
            {@const themeData = preset.themes[$activeMode]}
            <button 
              class="preset-card" 
              style="--card-bg: {themeData.cardBg}; --card-border: {themeData.border}; border-radius: {preset.radius}; font-family: {preset.font};"
            >
              <div class="preset-info">
                <span class="preset-name" style="color: {themeData.primary}">{preset.name}</span>
                <span class="preset-font-label">{$activeMode} mode</span>
              </div>
              <div class="preset-visuals">
                <div class="swatches">
                  <div class="swatch" style="background: {themeData.primary}"></div>
                  <div class="swatch" style="background: {themeData.secondary}"></div>
                  <div class="swatch" style="background: {themeData.accent}"></div>
                  <div class="swatch" style="background: {themeData.bg}"></div>
                </div>
                <div class="radius-indicator" style="border-radius: {preset.radius}; border-color: {themeData.primary}"></div>
              </div>
            </button>
          {/each}
        </div>
      {/if}

      <!-- TAB: VARIABLES -->
      {#if activeTab === 'variables'}
        <div class="variables-list">
          {#each Object.entries(groupedVariables()) as [groupName, variables]}
            <div class="var-group">
              <button class="group-header" onclick={() => toggleGroup(groupName)}>
                <span class="group-title">{groupName}</span>
                <svg class="chevron" class:flipped={!collapsedGroups[groupName]} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              
              {#if !collapsedGroups[groupName]}
                <div class="group-grid" transition:slide={{ duration: 250, axis: 'y' }}>
                  {#each variables as variable}
                    <div class="input-cell">
                      <label for={variable}>{variable.replace(/-/g, ' ').replace('color', '')}</label>
                      <div class="input-row">
                        <div class="color-picker-wrapper">
                          <div class="color-preview" style="background: {$detectedTheme[$activeMode][variable] || 'transparent'}"></div>
                          <!-- If value is valid hex, bind it to native picker, else fallback -->
                          <input 
                            type="color" 
                            value={$detectedTheme[$activeMode][variable]?.startsWith('#') ? $detectedTheme[$activeMode][variable].slice(0,7) : '#ffffff'}
                            oninput={(e) => onVariableChange($activeMode, variable, e.currentTarget.value)}
                          />
                        </div>
                        <input
                          id={variable}
                          type="text"
                          spellcheck="false"
                          value={$detectedTheme[$activeMode][variable]}
                          placeholder="inherit"
                          oninput={(e) => onVariableChange($activeMode, variable, e.currentTarget.value)}
                        />
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      <!-- TAB: THEME (JSON Editor) -->
      {#if activeTab === 'theme'}
        <div class="theme-editor">
          <div class="editor-actions">
            <button class="action-btn" onclick={handleCopy}>
              {#if isCopied}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
                Copied!
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                Copy
              {/if}
            </button>
            <button class="action-btn" onclick={handlePaste}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/></svg>
              Paste
            </button>
          </div>
          
          <textarea 
            class="json-area custom-scrollbar" 
            class:has-error={themeError}
            bind:value={themeText} 
            spellcheck="false"
          ></textarea>
          
          {#if themeError}
            <div class="error-banner" transition:slide={{duration: 200}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              <span>{themeError}</span>
            </div>
          {/if}
        </div>
      {/if}

    </div>
  </section>
</div>

<style>
  /* Base Reset & Variables for panel internal styling */
  :global(*) { box-sizing: border-box; }
  
  :root {
    --tw-font: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    --tw-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    --panel-bg: rgba(255, 255, 255, 0.85);
    --panel-border: rgba(15, 23, 42, 0.08);
    --text-main: #0f172a;
    --text-muted: #64748b;
    --bg-muted: #f1f5f9;
    --bg-hover: #e2e8f0;
    --accent: #7c3aed;
    --accent-hover: #6d28d9;
    --shadow-soft: 0 4px 20px -2px rgba(15, 23, 42, 0.1);
    --shadow-hard: -12px 0 48px rgba(15, 23, 42, 0.15);
  }

  /* Shell Container */
  .shell {
    position: fixed;
    top: 0; right: 0;
    z-index: 2147483647; /* Max allowed z-index */
    width: 380px;
    max-width: calc(100vw - 24px);
    height: 100vh;
    font-family: var(--tw-font);
    color: var(--text-main);
    pointer-events: none; /* Let clicks pass through body when closed */
  }

  /* Main Panel Structure */
  .panel {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 20px;
    background: var(--panel-bg);
    border-left: 1px solid var(--panel-border);
    box-shadow: var(--shadow-hard);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    pointer-events: auto;
    
    /* Bouncy Slide Animation */
    transform: translateX(100%);
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .shell.open .panel {
    transform: translateX(0);
  }

  /* Handle to drag/toggle panel */
  .handle {
    position: absolute;
    top: 50%;
    left: -20px;
    width: 20px;
    height: 64px;
    transform: translateY(-50%);
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-right: none;
    border-radius: 12px 0 0 12px;
    box-shadow: -4px 4px 12px rgba(0,0,0,0.05);
    cursor: pointer;
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, width 0.2s ease, left 0.2s ease;
  }
  .handle:hover {
    background: #ffffff;
    width: 24px;
    left: -24px;
  }
  .handle-pill {
    width: 4px;
    height: 24px;
    background: var(--text-muted);
    border-radius: 4px;
    transition: background 0.2s;
  }
  .handle:hover .handle-pill { background: var(--accent); }

  /* Header */
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-main);
  }
  .header-title h2 {
    font-size: 16px;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.01em;
  }
  .icon-btn {
    display: grid;
    place-items: center;
    width: 32px; height: 32px;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .icon-btn:hover { background: var(--bg-muted); color: var(--text-main); }

  /* Segmented Controls (Shared styles) */
  .segmented-control {
    display: flex;
    background: var(--bg-muted);
    padding: 4px;
    border-radius: 10px;
    border: 1px solid var(--panel-border);
    margin-bottom: 12px;
  }
  .segmented-control button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: 6px;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .segmented-control button:hover {
    color: var(--text-main);
  }
  .segmented-control button.active {
    background: #ffffff;
    color: var(--text-main);
    box-shadow: var(--shadow-soft);
  }

  .mode-toggle { margin-bottom: 16px; }
  .tabs { margin-bottom: 24px; }

  /* Content Area & Scrollbar */
  .content-area {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 4px;
    margin-right: -4px;
  }
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(15,23,42,0.1); border-radius: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(15,23,42,0.2); }

  /* PRESETS TAB */
  .presets-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .preset-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: var(--card-bg, #fff);
    border: 1px solid var(--card-border, #e2e8f0);
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    text-align: left;
    width: 100%;
  }
  .preset-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-soft);
  }
  .preset-card:active { transform: translateY(0) scale(0.98); }
  .preset-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .preset-name {
    font-size: 14px;
    font-weight: 600;
  }
  .preset-font-label {
    font-size: 11px;
    color: var(--text-muted);
    font-family: var(--tw-font); /* Keep this readable */
  }
  .preset-visuals {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .swatches {
    display: flex;
    border-radius: 50px;
    overflow: hidden;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
  }
  .swatch { width: 14px; height: 14px; }
  .radius-indicator {
    width: 20px; height: 20px;
    border: 2px solid;
    background: transparent;
  }

  /* VARIABLES TAB */
  .variables-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .var-group {
    border: 1px solid var(--panel-border);
    border-radius: 10px;
    background: #ffffff;
    overflow: hidden;
  }
  .group-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
  }
  .group-header:hover { background: var(--bg-muted); }
  .group-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-main);
  }
  .chevron {
    color: var(--text-muted);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .chevron.flipped { transform: rotate(180deg); }
  
  .group-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 16px;
    border-top: 1px solid var(--panel-border);
    background: var(--bg-muted);
  }
  .input-cell {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .input-cell label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: capitalize;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .input-row {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #ffffff;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    padding: 4px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .input-row:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
  }
  
  /* Custom Color Picker Wrapper */
  .color-picker-wrapper {
    position: relative;
    width: 22px; height: 22px;
    border-radius: 4px;
    border: 1px solid var(--panel-border);
    overflow: hidden;
    flex-shrink: 0;
  }
  .color-preview {
    position: absolute; inset: 0;
    pointer-events: none;
  }
  .color-picker-wrapper input[type="color"] {
    position: absolute;
    top: -10px; left: -10px;
    width: 50px; height: 50px;
    cursor: pointer;
    opacity: 0; /* visually hide native picker structure but keep clickable */
  }
  
  .input-row input[type="text"] {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-family: var(--tw-mono);
    font-size: 12px;
    color: var(--text-main);
  }
  .input-row input[type="text"]::placeholder { color: #a1a1aa; }

  /* THEME TAB */
  .theme-editor {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
  }
  .editor-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #ffffff;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-main);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .action-btn:hover {
    background: var(--bg-muted);
    border-color: #cbd5e1;
  }
  .action-btn:active { transform: scale(0.96); }
  
  .json-area {
    flex: 1;
    width: 100%;
    min-height: 300px;
    padding: 16px;
    background: #1e293b;
    color: #e2e8f0;
    border: 1px solid var(--panel-border);
    border-radius: 10px;
    font-family: var(--tw-mono);
    font-size: 12px;
    line-height: 1.5;
    resize: none;
    outline: none;
    transition: border-color 0.2s;
  }
  .json-area:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
  }
  .json-area.has-error {
    border-color: #ef4444;
  }
  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: #b91c1c;
    font-size: 12px;
    font-weight: 500;
  }

  @media (max-width: 420px) {
    .shell { width: calc(100vw - 16px); }
  }
</style>