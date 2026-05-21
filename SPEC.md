# WindPanel Specification

Last updated: 2026-05-21

## 1. Project Context

WindPanel is a WXT browser extension that injects a Svelte panel into the current website so developers can inspect, edit, import, export, and preset Tailwind CSS v4 theme variables at runtime.

The repository currently contains:

- [x] A WXT extension shell in `src/`.
- [x] A Svelte panel component in `src/components/ThemePanel.svelte`.
- [x] A content script that detects known theme variables and mounts the panel.
- [x] A background script that enables or disables the browser action based on detection.
- [x] A Tailwind 4 Astro demo app in `demo/`.
- [x] A Tailwind 4 shadcn-style theme in `demo/src/styles/global.css`.
- [ ] A dynamic theme mode model beyond fixed `light` and `dark`.
- [ ] Reliable active-mode synchronization when the website toggles theme itself.
- [ ] Persistent custom preset storage.
- [ ] A raw CSS theme parser/editor.
- [ ] Automated tests.
- [ ] Marketplace publishing setup.

## 2. Documentation Ground Truth

Context7 was used for current documentation.

Tailwind CSS v4 notes:

- [x] Tailwind v4 uses CSS-first theme configuration through `@theme`.
- [x] `@theme` values become normal CSS custom properties that can be read at runtime.
- [x] `@theme inline` can map Tailwind tokens to external CSS variables, such as `--color-background: var(--background)`.
- [x] Tailwind colors commonly use `oklch(...)`.
- [x] Dark mode can be customized with `@custom-variant`, including class selectors and data-attribute selectors.
- [ ] WindPanel must not assume `.dark` is the only possible mode selector.

WXT notes:

- [x] WXT supports Shadow DOM UI injection with `createShadowRootUi`.
- [x] `cssInjectionMode: 'ui'` is appropriate for injected UI styles.
- [x] WXT storage supports typed persistent items through `storage.defineItem`.
- [ ] The extension manifest needs `storage` permission before persistent presets/settings can be saved through extension storage.

## 3. Current Implementation Scan

### Extension

- [x] `package.json` defines WXT, Svelte, TypeScript, and Bun scripts.
- [x] `wxt.config.ts` sets the extension name, description, action title, and demo start URL.
- [x] `src/entrypoints/background.ts` disables the action by default and enables it per tab when the content script reports variables.
- [x] `src/entrypoints/content.ts` reads a fixed list of variables from computed styles.
- [x] `src/entrypoints/content.ts` uses a hidden `.dark` probe to read dark values.
- [x] `src/entrypoints/content.ts` applies variable overrides to `body.style`.
- [x] `src/entrypoints/content.ts` toggles `.dark` on both `html` and `body`.
- [ ] `src/entrypoints/content.ts` currently limits modes to `light | dark`.
- [ ] `src/entrypoints/content.ts` currently treats `.dark` as the only non-default mode.
- [ ] `src/entrypoints/content.ts` does not keep `activeMode` synchronized while the panel is mounted.
- [ ] `src/entrypoints/content.ts` mutates `detectedTheme` in place during variable edits.
- [ ] `src/entrypoints/content.ts` contains a debug `console.log` in dark-mode probing.
- [ ] `src/entrypoints/content.ts` does not parse CSS rules to discover available modes.
- [ ] `src/entrypoints/content.ts` does not support data-attribute theme selectors.

### Panel UI

- [x] `ThemePanel.svelte` already has three top-level tabs: `presets`, `variables`, and `theme`.
- [x] The panel slides in from the right side and has a visible handle.
- [x] The variables view has collapsible groups.
- [x] The variables view has text inputs and a native color input fallback.
- [x] The theme view currently supports copy and paste.
- [ ] The theme view is currently JSON-based, but the target behavior is raw CSS.
- [ ] Presets are currently mock data and are not applied or persisted.
- [ ] Mode toggle is hard-coded to `light` and `dark`.
- [ ] Variable grouping does not match the requested groups.
- [ ] OKLCH editing is not implemented.
- [ ] Panel animation and shell layout need polish.

### Demo

- [x] `demo/` is an Astro app using Tailwind 4, shadcn, and React.
- [x] `demo/src/styles/global.css` defines `@theme inline`.
- [x] `demo/src/styles/global.css` defines `:root` variables and `.dark` variables.
- [x] `demo/src/styles/global.css` configures `@custom-variant dark (&:is(.dark *));`.
- [ ] The demo does not yet include UI controls that toggle theme modes from the website itself.
- [ ] The demo does not yet cover data-attribute modes.
- [ ] The demo does not yet cover more than two modes.
- [ ] The demo does not yet cover malformed pasted themes, missing variables, or selector edge cases.

## 4. Product Scope

WindPanel must provide three pages inside the right-side panel:

- [x] Presets
- [x] Variables
- [x] Theme

The panel must:

- [x] Show and hide from the right side.
- [x] Leave a handle visible when hidden.
- [ ] Open with a polished animation that feels fast, controlled, and responsive.
- [ ] Hide with a matching polished animation.
- [ ] Have rounded edges and margin from the screen edge instead of a full-height hard edge.
- [ ] Fit desktop and mobile widths without overflowing text or controls.
- [ ] Respect reduced-motion preferences.
- [ ] Keep panel styles isolated from page styles.

## 5. Core Concepts

### Theme Variable

A theme variable is a CSS custom property that WindPanel can read, edit, preview, export, and import.

Examples:

```css
--background: oklch(1 0 0);
--foreground: oklch(0.153 0.006 107.1);
--radius: 0.625rem;
```

Checklist:

- [x] Maintain a known shadcn/Tailwind variable list.
- [ ] Support discovering additional custom properties from theme rules.
- [ ] Track whether each variable is color, radius, typography, border, chart, background, or miscellaneous.
- [ ] Track whether the variable came from known defaults, CSS rule discovery, or user addition.
- [ ] Allow users to add variables manually.
- [ ] Allow users to remove user-created variables.
- [ ] Avoid removing website-provided variables from detection results.

### Theme Mode

A theme mode is a selector state that defines a set of variable values.

Examples:

```css
:root { --background: oklch(1 0 0); }
.dark { --background: oklch(0.153 0.006 107.1); }
[data-theme="dark"] { --background: oklch(0.153 0.006 107.1); }
[data-theme="sepia"] { --background: oklch(0.94 0.04 90); }
```

Checklist:

- [ ] Replace `ThemeMode = 'light' | 'dark'` with a dynamic mode identifier.
- [ ] Add a `default` or `base` mode for `:root`, `html`, and `body` values.
- [ ] Support discovered modes such as `dark`, `light`, `sepia`, `dim`, `system`, or arbitrary project names.
- [ ] Store each mode's display label.
- [ ] Store each mode's selector.
- [ ] Store each mode's activation target, such as `html.class`, `body.class`, `html[data-theme]`, or `body[data-theme]`.
- [ ] Store confidence/source metadata for each discovered mode.
- [ ] Preserve unknown mode selectors in exports.

Suggested model:

```ts
type ThemeModeId = string;

type ThemeActivation =
  | { type: 'class'; target: 'html' | 'body'; value: string }
  | { type: 'attribute'; target: 'html' | 'body'; name: string; value: string }
  | { type: 'media'; query: string }
  | { type: 'selector'; selector: string };

type ThemeModeDefinition = {
  id: ThemeModeId;
  label: string;
  selector: string;
  activation?: ThemeActivation;
  values: Record<string, string>;
  source: 'computed' | 'css-rule' | 'preset' | 'user';
};
```

## 6. Theme Detection

WindPanel must distinguish between available modes before it can safely build mode selectors, mode segments, presets, and exports.

Detection should use multiple sources:

- [x] Computed styles on `document.documentElement`.
- [x] Computed styles on `document.body`.
- [ ] Accessible CSS rules from `document.styleSheets`.
- [ ] Inline `<style>` tags.
- [ ] Constructed stylesheets where available.
- [ ] `html` and `body` class names.
- [ ] `html` and `body` attributes such as `data-theme`, `data-mode`, `data-color-scheme`, and `theme`.
- [ ] `matchMedia('(prefers-color-scheme: dark)')` when the site uses system mode.

Detection algorithm checklist:

- [ ] Read the active website mode from `html` and `body` before reading values.
- [ ] Treat the actual current `html` or `body` selector state as the source of truth.
- [ ] Detect selector patterns from accessible CSS rules that declare custom properties.
- [ ] Parse selectors that contain classes, attributes, `:root`, `html`, and `body`.
- [ ] Detect Tailwind/shadcn variables from declarations such as `--background`, `--primary`, and `--radius`.
- [ ] Detect Tailwind v4 mapped variables from `@theme inline`, such as `--color-background: var(--background)`.
- [ ] Catch and ignore `SecurityError` from cross-origin stylesheets without failing the whole scan.
- [ ] Use computed styles as a fallback when CSS rules are inaccessible.
- [ ] Keep mode discovery separate from active-mode detection.
- [ ] Do not mutate the website when discovering inactive modes unless there is no safer fallback.
- [ ] If probing is necessary, make it temporary, hidden, and guarded against observers.
- [ ] Remove debug logging from detection paths.

Mode selector examples to support:

- [ ] `:root`
- [ ] `html`
- [ ] `body`
- [ ] `.dark`
- [ ] `html.dark`
- [ ] `body.dark`
- [ ] `[data-theme="dark"]`
- [ ] `html[data-theme="dark"]`
- [ ] `body[data-theme="dark"]`
- [ ] `[data-mode="dark"]`
- [ ] `[data-theme="sepia"]`
- [ ] Multiple selectors in one rule, such as `:root, .light`.

## 7. Active Mode Synchronization

The active mode must reflect the live website, not only the panel state.

Checklist:

- [ ] Observe `html` and `body` class changes.
- [ ] Observe `html` and `body` attribute changes.
- [ ] Observe `style` changes on `html` and `body`.
- [ ] Observe relevant style/link changes in `document.head`.
- [ ] Listen to `prefers-color-scheme` changes when system mode is detected.
- [ ] Continue synchronization while the panel is mounted.
- [ ] Debounce detection to avoid excessive recomputation.
- [ ] Avoid feedback loops when WindPanel itself applies a mode.
- [ ] Keep an internal `isApplyingMode` guard for panel-initiated changes.
- [ ] If the website changes mode externally, update the panel segment and values.
- [ ] If the panel changes mode, update the website's actual selector target.
- [ ] Preserve unrelated classes and attributes on `html` and `body`.

Activation behavior checklist:

- [ ] If the site uses `html.dark`, toggle only `html.classList`.
- [ ] If the site uses `body.dark`, toggle only `body.classList`.
- [ ] If the site uses `[data-theme="dark"]`, set the detected attribute on the detected target.
- [ ] If multiple activation targets exist, choose the highest-confidence current source.
- [ ] If no activation target is known, apply only variable overrides and show the mode as custom/manual.

## 8. Variable Reading and Overrides

Checklist:

- [ ] Read variables into immutable snapshots.
- [ ] Store original detected values separately from user overrides.
- [ ] Store per-mode user overrides.
- [ ] Apply overrides only for the active mode by default.
- [ ] Support applying a preset to one mode or all modes.
- [ ] Support clearing one variable override.
- [ ] Support clearing all overrides.
- [ ] Support resetting to the detected website values.
- [ ] Preserve invalid but user-entered strings until validation runs.
- [ ] Avoid silently dropping variables that are not in the default list.

Implementation checklist:

- [ ] Add a `ThemeDocument` or equivalent state object for modes, variables, and metadata.
- [ ] Apply variable overrides through a dedicated style element or scoped override layer.
- [ ] Prefer a dedicated style element over writing many values directly to `body.style`.
- [ ] Make override ownership obvious, for example `<style data-windpanel-overrides>`.
- [ ] Remove the override element when all overrides are cleared.
- [ ] Recompute previews from the merged detected values plus overrides.

## 9. Presets Page

Purpose: let users quickly apply existing themes, create their own presets, import presets, edit them, and persist them across browser sessions.

Current state:

- [x] A Presets tab exists.
- [x] The panel contains mock preset cards.
- [x] Preset cards show name, font, swatches, and radius indicator.
- [ ] Presets do not apply real theme values.
- [ ] Presets are not persisted.
- [ ] Presets cannot be edited.

Feature checklist:

- [ ] Add page title `Presets`.
- [ ] Add primary action for creating a preset.
- [ ] Add import-from-clipboard action.
- [ ] Add future marketplace entry point.
- [ ] Show bundled presets that ship with the extension.
- [ ] Show user-created presets saved in extension storage.
- [ ] Allow applying a preset to the active mode.
- [ ] Allow applying a preset to all compatible modes.
- [ ] Allow duplicating a preset.
- [ ] Allow editing a preset.
- [ ] Allow deleting user-created presets.
- [ ] Prevent deleting bundled presets unless copied into user space.
- [ ] Persist user presets across tab closes, browser closes, and browser restarts.
- [ ] Validate imported presets before saving.
- [ ] Preserve mode-specific values in imports.
- [ ] Show a useful error when imported preset data cannot be parsed.

Preset card checklist:

- [ ] Vertical list of cards.
- [ ] Horizontal content inside each card.
- [ ] Preset title uses the preset's typography/color where safe.
- [ ] Card border reflects the preset border token.
- [ ] Card radius reflects the preset radius token.
- [ ] Swatches show primary, secondary, accent, background, foreground, and border.
- [ ] Card includes edit control for user-editable presets.
- [ ] Card includes apply control.
- [ ] Long names and values do not overflow.

Preset storage checklist:

- [ ] Add WXT `storage.defineItem` for presets.
- [ ] Add `storage` permission to `wxt.config.ts`.
- [ ] Version preset schema.
- [ ] Migrate old preset schema versions.
- [ ] Include preset metadata: id, name, createdAt, updatedAt, source, modes, variables.

Marketplace checklist:

- [ ] Add placeholder UI for marketplace.
- [ ] Define marketplace preset schema.
- [ ] Decide whether marketplace is remote, bundled registry, or both.
- [ ] Add trust/safety rules for imported marketplace data.
- [ ] Add later task for publishing community preset packs.

## 10. Variables Page

Purpose: provide grouped inputs and previews for every editable theme variable.

Current state:

- [x] A Variables tab exists.
- [x] Variables can be edited as raw strings.
- [x] Groups can collapse.
- [x] Some color preview behavior exists.
- [ ] Requested groups are not implemented.
- [ ] OKLCH color editing is not implemented.
- [ ] Non-color previews are basic or missing.

Requested groups:

- [ ] Basic
- [ ] Border
- [ ] Typography
- [ ] Charts
- [ ] Background
- [ ] Miscellaneous

Grouping rules checklist:

- [ ] Basic includes core semantic colors such as foreground, primary, secondary, muted, accent, destructive, card, and popover.
- [ ] Border includes border, input, ring, radius, shadow, outline, and radius-derived values.
- [ ] Typography includes font, text, heading, letter, line, tracking, and weight variables.
- [ ] Charts includes chart variables and should be editable but can skip complex previews.
- [ ] Background includes background, surface, sidebar, overlay, card background, and popover background values.
- [ ] Miscellaneous includes anything not classified elsewhere.
- [ ] Allow variables to appear in only one primary group.
- [ ] Keep grouping deterministic and testable.

Layout checklist:

- [ ] Add page title `Variables`.
- [ ] Add add-variable button.
- [ ] Use a two-column grid when the panel width supports it.
- [ ] Fall back to one column on narrow widths.
- [ ] Enlarge or adjust the panel width only when needed.
- [ ] Keep labels and inputs readable.
- [ ] Keep sections collapsible.
- [ ] Remember collapsed group state during the current panel session.
- [ ] Consider persisting collapsed group preferences later.

Input and preview checklist:

- [ ] Every variable has a raw string input.
- [ ] Color variables show a swatch.
- [ ] Clicking a color swatch opens a color editor.
- [ ] Color editor supports OKLCH values.
- [ ] Color editor can use an OKLCH-friendly workflow inspired by oklume.com.
- [ ] Hex/rgb/hsl/named colors should still be accepted when valid CSS.
- [ ] Border variables show a border preview.
- [ ] Radius variables show a radius preview.
- [ ] Typography variables show a text sample.
- [ ] Chart variables can use simple swatches and raw inputs.
- [ ] Miscellaneous variables detect color-like values when possible.
- [ ] Invalid values are visibly marked without blocking typing.

## 11. Theme Page

Purpose: provide a raw CSS theme editor that shows the full current theme across all modes and can import, validate, export, and save themes as presets.

Current state:

- [x] A Theme tab exists.
- [x] Copy button exists.
- [x] Paste button exists.
- [ ] Editor currently uses JSON instead of raw CSS.
- [ ] Parser does not apply pasted values.
- [ ] Error reporting is generic.

Feature checklist:

- [ ] Add page title `Theme`.
- [ ] Replace JSON editor with CSS editor.
- [ ] Show all modes in one CSS document.
- [ ] Include base/default mode.
- [ ] Include dark mode when present.
- [ ] Include any additional modes when present.
- [ ] Add paste-from-clipboard button.
- [ ] Add copy-current-theme button.
- [ ] Add more-options button.
- [ ] Add copy-single-mode option.
- [ ] Add copy-all-modes option.
- [ ] Add save-as-preset button.
- [ ] Apply valid pasted CSS to current theme state.
- [ ] Preserve mode selectors on import.
- [ ] Keep comments where practical, but do not require comment preservation for MVP.

Suggested CSS export:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.153 0.006 107.1);
}

.dark {
  --background: oklch(0.153 0.006 107.1);
  --foreground: oklch(0.988 0.003 106.5);
}
```

Parsing checklist:

- [ ] Parse raw CSS, not JSON.
- [ ] Extract only CSS custom property declarations by default.
- [ ] Preserve selector to mode mapping.
- [ ] Validate balanced braces.
- [ ] Validate selector blocks.
- [ ] Validate declarations with missing names.
- [ ] Validate declarations with missing values.
- [ ] Validate missing semicolons where they create ambiguous parsing.
- [ ] Validate duplicate variables in the same selector and choose a deterministic behavior.
- [ ] Allow unknown selectors but mark them as lower-confidence modes.
- [ ] Allow unknown custom properties and classify them as miscellaneous.
- [ ] Report exact invalid text snippets when parsing fails.
- [ ] Report line and column when available.
- [ ] Apply valid blocks when invalid unrelated text can be isolated.

Error UX checklist:

- [ ] Prefer a clear banner or toast for whole-document parse errors.
- [ ] Include the invalid snippet in the error message.
- [ ] Include line and column when possible.
- [ ] Keep inline field errors optional for later.
- [ ] Do not destroy user input after a failed parse.
- [ ] Add success feedback after paste/apply/copy/save.

## 12. Panel Shell and Animation

Current state:

- [x] The panel uses a right-side fixed shell.
- [x] The panel uses a bouncy transform transition.
- [x] A handle remains available while closed.
- [ ] The open animation needs refinement.
- [ ] The panel should not feel glued to the screen edge.

Checklist:

- [ ] Add right, top, and bottom margin on desktop.
- [ ] Add rounded panel edges.
- [ ] Keep the handle aligned to the rounded panel shell.
- [ ] Ensure the handle is usable when the panel is closed.
- [ ] Use a less extreme bounce curve.
- [ ] Tune open duration separately from close duration if needed.
- [ ] Add opacity and subtle scale only if it improves perceived motion.
- [ ] Avoid layout shift during open and close.
- [ ] Add `prefers-reduced-motion` styles.
- [ ] Ensure panel remains usable at mobile widths.
- [ ] Ensure text and controls do not overflow.

## 13. Demo Website Requirements

The demo app should be a test harness for real theme edge cases.

Checklist:

- [ ] Add a visible website-side theme toggle.
- [ ] Add `html.dark` test mode.
- [ ] Add `body.dark` test mode.
- [ ] Add `html[data-theme="dark"]` test mode.
- [ ] Add `body[data-theme="dark"]` test mode.
- [ ] Add at least one third mode, such as `sepia` or `dim`.
- [ ] Add missing-variable scenario.
- [ ] Add extra custom-variable scenario.
- [ ] Add invalid/malformed theme snippet examples for the Theme page.
- [ ] Add components that visibly use primary, secondary, accent, border, radius, and typography variables.
- [ ] Add chart color swatches.
- [ ] Add sidebar color demo.
- [ ] Add visual state that makes live overrides obvious.

## 14. Testing Strategy

Current state:

- [x] `bun run check` exists.
- [ ] No dedicated unit tests were found.
- [ ] No browser/visual tests were found.
- [ ] No parser tests were found.

Checklist:

- [ ] Add unit tests for variable grouping.
- [ ] Add unit tests for mode selector parsing.
- [ ] Add unit tests for CSS theme parsing.
- [ ] Add unit tests for CSS export.
- [ ] Add unit tests for active mode detection.
- [ ] Add unit tests for preset schema validation.
- [ ] Add unit tests for storage migrations.
- [ ] Add WXT fake-browser tests for storage-backed behavior where useful.
- [ ] Add Svelte component checks.
- [ ] Add demo build/typecheck command coverage.
- [ ] Add Playwright/browser tests for panel open/close.
- [ ] Add Playwright/browser tests for website-side theme toggles.
- [ ] Add Playwright/browser tests for panel-side mode toggles.
- [ ] Add Playwright/browser tests for variable edits.
- [ ] Add Playwright/browser tests for preset apply.
- [ ] Add Playwright/browser tests for raw CSS import errors.
- [ ] Add visual checks for panel animation/layout.

Minimum verification commands:

```bash
bun run check
bun run build
bun --cwd demo run build
```

## 15. Open Source Project Basics

Checklist:

- [x] Basic README exists.
- [ ] Rewrite README around the actual product value.
- [ ] Add screenshots or GIFs.
- [ ] Add installation instructions for local development.
- [ ] Add browser loading instructions for Chromium.
- [ ] Add browser loading instructions for Firefox.
- [ ] Add architecture section.
- [ ] Add supported Tailwind theme selector documentation.
- [ ] Add limitations section.
- [ ] Add roadmap linked to this spec.
- [ ] Add license.
- [ ] Add contributing guide.
- [ ] Add code of conduct.
- [ ] Add security policy.
- [ ] Add changelog.
- [ ] Add issue templates.
- [ ] Add PR template.
- [ ] Add release checklist.
- [ ] Add CI workflow.

## 16. Publishing and Marketplaces

Checklist:

- [ ] Confirm extension permissions are minimal.
- [ ] Add `storage` permission only when preset persistence is implemented.
- [ ] Build Chromium package.
- [ ] Build Firefox package.
- [ ] Build Edge package.
- [ ] Verify extension zip output.
- [ ] Add marketplace screenshots.
- [ ] Add marketplace description.
- [ ] Add privacy policy if required.
- [ ] Add Chrome Web Store submission checklist.
- [ ] Add Firefox AMO submission checklist.
- [ ] Add Microsoft Edge Add-ons submission checklist.
- [ ] Add versioning/release process.
- [ ] Add GitHub release workflow.

## 17. Implementation Phases

### Phase 1: Correct Theme Model

- [ ] Introduce dynamic mode and variable data model.
- [ ] Move theme detection/parsing helpers out of `content.ts` into testable modules.
- [ ] Replace fixed `ThemeMode` usages with dynamic ids.
- [ ] Remove debug logging.
- [ ] Add unit tests for new pure helpers.

### Phase 2: Reliable Mode Detection and Sync

- [ ] Discover mode selectors from CSS rules.
- [ ] Detect active mode from live `html` and `body`.
- [ ] Observe external website mode changes while panel is mounted.
- [ ] Apply panel-selected mode through the website's detected selector mechanism.
- [ ] Add demo edge cases for class and data-attribute modes.

### Phase 3: Variables Editing

- [ ] Implement requested variable groups.
- [ ] Add typed previews.
- [ ] Add OKLCH-friendly color workflow.
- [ ] Store overrides separately from detected values.
- [ ] Add reset/clear behavior.

### Phase 4: Presets

- [ ] Define preset schema.
- [ ] Add bundled presets.
- [ ] Add persistent user presets.
- [ ] Add import/export validation.
- [ ] Add edit/delete/duplicate/apply flows.
- [ ] Add marketplace placeholder.

### Phase 5: Theme CSS Editor

- [ ] Implement CSS export for all modes.
- [ ] Implement CSS parser.
- [ ] Implement precise error reporting.
- [ ] Implement paste/apply/copy/save-as-preset actions.
- [ ] Add parser tests and browser tests.

### Phase 6: Polish and Release

- [ ] Refine panel animation and layout.
- [ ] Expand demo app into a proper test harness.
- [ ] Add CI.
- [ ] Polish README and repository docs.
- [ ] Package extension for browser marketplaces.
- [ ] Publish first release.

## 18. Acceptance Criteria

WindPanel is ready for an MVP release when:

- [ ] The panel discovers all available theme modes from the demo.
- [ ] The panel can distinguish base, dark, and at least one additional mode.
- [ ] The panel follows website-side theme toggles while open.
- [ ] The panel can change the website mode using the site's actual selector mechanism.
- [ ] Variable edits apply live and can be reset.
- [ ] Presets can be created, imported, applied, edited, deleted, and persist after browser restart.
- [ ] Raw CSS theme import/export works for all modes.
- [ ] Parser errors identify the invalid snippet clearly.
- [ ] Tests cover the core parsing, detection, storage, and UI flows.
- [ ] README and publishing docs are suitable for an open source extension.

## 19. Current Baseline Diagnostics

`bun run check` was run on 2026-05-21 and currently fails before any implementation work in this spec.

Checklist:

- [ ] Fix `ThemePanel.svelte` grouped variable typing so variables are inferred as `ThemeVariable[]`, not `string[]`.
- [ ] Fix `ThemePanel.svelte` indexed access errors around `$detectedTheme[$activeMode][variable]`.
- [ ] Fix `ThemePanel.svelte` `onVariableChange` calls that currently pass `string` where `ThemeVariable` is required.
- [ ] Re-run `bun run check`.
- [ ] Add this check to CI once the baseline is green.
