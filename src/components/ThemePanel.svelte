<script lang="ts">
  import type { Writable } from 'svelte/store';
  import { THEME_VARIABLES, type ThemeMode, type ThemeState, type ThemeVariable } from '../lib/theme';

  export let detectedTheme: Writable<ThemeState>;
  export let activeMode: Writable<ThemeMode>;
  export let open: Writable<boolean>;
  export let onToggleOpen: () => void;
  export let onModeChange: (mode: ThemeMode) => void;
  export let onVariableChange: (mode: ThemeMode, variable: ThemeVariable, value: string) => void;

  const labels: Record<ThemeMode, string> = {
    light: 'Light',
    dark: 'Dark',
  };
</script>

<div class:open={$open} class="shell" aria-label="WindPanel theme editor">
  <section class="panel">
    <button
      class="handle"
      type="button"
      aria-label={$open ? 'Hide WindPanel theme editor' : 'Show WindPanel theme editor'}
      on:click|stopPropagation={onToggleOpen}
    >
      <span></span>
    </button>

    <header>
      <button type="button" class="close" aria-label="Hide panel" on:click={onToggleOpen}>x</button>
    </header>

    <div class="segments" role="tablist" aria-label="Theme mode">
      {#each (['light', 'dark'] as ThemeMode[]) as mode}
        <button
          type="button"
          class:active={$activeMode === mode}
          aria-selected={$activeMode === mode}
          role="tab"
          on:click={() => onModeChange(mode)}
        >
          {labels[mode]}
        </button>
      {/each}
    </div>

    <div class="fields">
      {#each THEME_VARIABLES as variable}
        <label>
          <span class="capitalize">{variable.replace(/-/g, " ")}</span>
          <input
            spellcheck="false"
            value={$detectedTheme[$activeMode][variable]}
            placeholder="Not present"
            on:input={(event) =>
              onVariableChange($activeMode, variable, event.currentTarget.value)}
          />
        </label>
      {/each}
    </div>
  </section>
</div>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  .capitalize {
    text-transform: capitalize;
  }

  .shell {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 100000;
    width: 360px;
    max-width: calc(100vw - 24px);
    height: 100vh;
    color: #111827;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    pointer-events: none;
  }

  .handle {
    position: absolute;
    top: 18px;
    left: 0;
    width: 38px;
    height: 48px;
    border: 1px solid rgba(15, 23, 42, 0.14);
    border-right: 0;
    border-radius: 10px 0 0 10px;
    background: #ffffff;
    box-shadow: -8px 10px 28px rgba(15, 23, 42, 0.18);
    cursor: pointer;
    pointer-events: auto;
    transform: translateX(-100%);
    transition:
      box-shadow 180ms ease;
    z-index: 2;
  }

  .handle span {
    display: block;
    width: 4px;
    height: 22px;
    margin: auto;
    border-radius: 999px;
    background: #7c3aed;
  }

  .panel {
    position: relative;
    width: 100%;
    height: 100%;
    padding: 18px;
    pointer-events: auto;
    transform: translateX(100%);
    transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
    background: rgba(255, 255, 255, 0.96);
    border-left: 1px solid rgba(15, 23, 42, 0.1);
    box-shadow: -22px 0 70px rgba(15, 23, 42, 0.24);
    backdrop-filter: blur(18px);
  }

  .shell.open .panel {
    transform: translateX(0);
  }

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  .close {
    width: 32px;
    height: 32px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 8px;
    background: #f8fafc;
    color: #475569;
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
  }

  .segments {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    padding: 4px;
    margin-bottom: 14px;
    border: 1px solid rgba(15, 23, 42, 0.1);
    border-radius: 8px;
    background: #f1f5f9;
  }

  .segments button {
    height: 34px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #475569;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition:
      background 180ms ease,
      color 180ms ease,
      box-shadow 180ms ease;
  }

  .segments button.active {
    background: #ffffff;
    color: #111827;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.12);
  }

  .fields {
    display: grid;
    gap: 10px;
    height: calc(100vh - 132px);
    padding-right: 4px;
    overflow-y: auto;
    padding: 1rem 0;
  }

  label {
    display: grid;
    gap: 5px;
  }

  label span {
    color: #475569;
    font-size: 12px;
    font-weight: 700;
  }

  input {
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 8px;
    outline: none;
    background: #ffffff;
    color: #0f172a;
    font: 500 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease;
  }

  input:focus {
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.14);
  }

  input::placeholder {
    color: #94a3b8;
  }

  @media (max-width: 420px) {
    .shell {
      width: calc(100vw - 16px);
    }
  }
</style>
