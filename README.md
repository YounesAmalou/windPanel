# WindPanel

WindPanel is a WXT + Svelte browser extension for inspecting and editing Tailwind-style theme CSS variables on the current website.

The extension checks every visited page for a supported theme variable set. When variables are found, the browser action is enabled and opens an in-page editor panel. When no variables are found, the action stays disabled and its tooltip explains that no Tailwind theme variables are present.

## Features

- Detects Tailwind/shadcn-style CSS custom properties on visited pages.
- Supports light and dark theme modes.
- Opens a Svelte-powered editor panel inside the current page.
- Isolates the editor UI in a Shadow DOM so page styles do not leak into the panel.
- Applies variable changes immediately by writing CSS variable overrides to `body`.
- Toggles website dark mode by adding/removing the `dark` class on `html` and `body`.
- Keeps the panel offscreen when closed, leaving only the handle visible at the right edge.

## Supported Theme Variables

WindPanel currently scans the default theme variable names in [src/lib/theme.ts](src/lib/theme.ts):

```css
--background
--foreground
--card
--card-foreground
--popover
--popover-foreground
--primary
--primary-foreground
--secondary
--secondary-foreground
--muted
--muted-foreground
--accent
--accent-foreground
--destructive
--border
--input
--ring
--chart-1
--chart-2
--chart-3
--chart-4
--chart-5
--radius
--sidebar
--sidebar-foreground
--sidebar-primary
--sidebar-primary-foreground
--sidebar-accent
--sidebar-accent-foreground
--sidebar-border
--sidebar-ring
```

## How It Works

The content script runs on all URLs and checks for known theme variables after the page settles. It reads the active mode from computed styles and uses a temporary hidden `.dark` probe to read dark-mode values without changing `html` or `body` during detection.

If variables are detected, the content script reports availability to the background script. The background script enables the browser action for that tab. Clicking the action sends a message back to the content script, which mounts the Svelte panel using WXT's `createShadowRootUi`.

The editor applies changes live with CSS custom properties on `body`, so the website updates immediately without a page reload.

## Project Structure

```text
src/
  components/
    ThemePanel.svelte       # Svelte UI injected into the current page
  entrypoints/
    background.ts           # Action enable/disable state and click messaging
    content.ts              # Theme detection, panel mounting, live overrides
  lib/
    constant.ts             # Shared message names
    theme.ts                # Theme variable list and theme types
wxt.config.ts               # WXT config and dev start URL
```

## Development

Install dependencies:

```bash
bun install
```

Run the extension and local demo together:

```bash
bun run dev
```

Run only the extension:

```bash
bun run dev:extension
```

Run only the demo app:

```bash
bun run dev:demo
```

The WXT dev browser opens `http://localhost:4321/` by default.

## Checks

Run Svelte and TypeScript diagnostics:

```bash
bun run check
```

## Builds

Build for Chromium:

```bash
bun run build
```

Build for Firefox:

```bash
bun run build:firefox
```

Create extension zips:

```bash
bun run zip
bun run zip:firefox
```

## Notes

- WindPanel is focused on theme variables, not arbitrary Tailwind utility classes.
- Sites that do not expose the supported CSS variables will keep the extension action disabled.
- Cross-origin stylesheets may not expose CSS rules to the extension, so detection relies primarily on computed CSS variables.
- This should be used in dev websites, since variable values may not be available in production.

## Roadmap

- Adding a color snipet feature for easy color value copying.
- Fix bugs related to syncing with the dark/light mode switching from the web page.
- Adding a reset button to clear all overrides.
- Adding oklch color picket support from [oklume](https://oklume.com/).
