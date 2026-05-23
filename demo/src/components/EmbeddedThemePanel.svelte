<script lang="ts">
  import { onMount } from "svelte"
  import { get, writable } from "svelte/store"
  import ThemePanel from "../../../src/components/ThemePanel.svelte"
  import {
    cloneThemeDocument,
    createThemeDocument,
    getActiveMode,
    hasDetectedTheme,
    setActiveMode,
    updateModeValue,
    type ThemeDocument,
  } from "../../../src/lib/theme"
  import {
    applyWebsiteMode,
    detectThemeDocument,
    isWindPanelApplyingMode,
  } from "../../../src/lib/theme-detect"

  let ready = false
  let localWriteUntil = 0
  let detectedTheme = createThemeDocument()
  const themeDocument = writable(detectedTheme)
  const activeModeId = writable(detectedTheme.activeModeId)
  const open = writable(true)

  onMount(() => {
    detectedTheme = detectThemeDocument()
    themeDocument.set(detectedTheme)
    activeModeId.set(detectedTheme.activeModeId)
    ready = true

    markLocalWrite()
    applyWebsiteMode(detectedTheme, detectedTheme.activeModeId)
    syncHarnessControls(detectedTheme.activeModeId)
    applyThemeOverride(detectedTheme.activeModeId, detectedTheme)

    return watchExternalThemeChanges(() => {
      if (isWindPanelApplyingMode()) return
      if (Date.now() < localWriteUntil) return

      const nextTheme = detectThemeDocument()
      if (!hasDetectedTheme(nextTheme)) return

      detectedTheme = mergeThemeDocuments(detectedTheme, nextTheme)
      themeDocument.set(detectedTheme)
      activeModeId.set(detectedTheme.activeModeId)
      applyThemeOverride(getActiveMode(detectedTheme).id, detectedTheme)
    })
  })

  function setOpen(value: boolean): void {
    open.set(value)
  }

  function setPanelMode(modeId: string): void {
    markLocalWrite()
    detectedTheme = setActiveMode(detectedTheme, modeId)
    themeDocument.set(detectedTheme)
    activeModeId.set(detectedTheme.activeModeId)
    applyWebsiteMode(detectedTheme, detectedTheme.activeModeId)
    syncHarnessControls(detectedTheme.activeModeId)
    applyThemeOverride(detectedTheme.activeModeId, detectedTheme)
  }

  function setPanelTheme(theme: ThemeDocument): void {
    markLocalWrite()
    detectedTheme = cloneThemeDocument(theme)
    themeDocument.set(detectedTheme)
    activeModeId.set(detectedTheme.activeModeId)
    applyThemeOverride(detectedTheme.activeModeId, detectedTheme)
  }

  function markLocalWrite(): void {
    localWriteUntil = Date.now() + 500
  }

  function syncHarnessControls(modeId: string): void {
    const mode = detectedTheme.modes.find((item) => item.id === modeId)
    const mappedMode = mode?.selector === "html.dark" ? "html-dark" : modeId

    document.dispatchEvent(
      new CustomEvent("windpanel-demo-mode-change", {
        detail: { modeId: mappedMode, selector: mode?.selector || ":root" },
      }),
    )
  }

  function applyThemeOverride(modeId: string, theme: ThemeDocument): void {
    const mode = theme.modes.find((item) => item.id === modeId)
    if (!mode) return

    const targets = [document.documentElement, document.body].filter(Boolean) as HTMLElement[]

    for (const target of targets) {
      for (const variable of theme.variables) {
        const value = mode.values[variable]?.trim()
        const property = `--${variable}`

        if (value) {
          target.style.setProperty(property, value)
        } else {
          target.style.removeProperty(property)
        }
      }
    }
  }

  function mergeThemeDocuments(previous: ThemeDocument, detected: ThemeDocument): ThemeDocument {
    const next = cloneThemeDocument(detected)

    for (const previousMode of previous.modes) {
      const nextMode = next.modes.find((mode) => mode.id === previousMode.id)
      if (!nextMode) continue

      for (const variable of previous.variables) {
        const previousValue = previousMode.values[variable]?.trim()
        if (previousValue && previousValue !== nextMode.values[variable]?.trim()) {
          nextMode.values[variable] = previousMode.values[variable]
        }
      }
    }

    next.variables = Array.from(new Set([...next.variables, ...previous.variables]))
    return next
  }

  function watchExternalThemeChanges(onChange: () => void): () => void {
    let timeout: number | undefined
    const observers: MutationObserver[] = []
    const themeAttributeNames = ["class", "data-theme", "data-mode", "data-color-scheme", "theme"]
    const schedule = () => {
      if (isWindPanelApplyingMode()) return
      if (Date.now() < localWriteUntil) return

      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => {
        if (!isWindPanelApplyingMode() && Date.now() >= localWriteUntil) onChange()
      }, 120)
    }

    const observeModeAttributes = (target: Element | null) => {
      if (!target) return

      const observer = new MutationObserver(schedule)
      observer.observe(target, {
        attributes: true,
        attributeFilter: themeAttributeNames,
      })
      observers.push(observer)
    }

    observeModeAttributes(document.documentElement)
    observeModeAttributes(document.body)

    if (document.head) {
      const observer = new MutationObserver(schedule)
      observer.observe(document.head, {
        childList: true,
        subtree: true,
      })
      observers.push(observer)
    }

    const media = window.matchMedia?.("(prefers-color-scheme: dark)")
    media?.addEventListener?.("change", schedule)

    return () => {
      window.clearTimeout(timeout)
      for (const observer of observers) observer.disconnect()
      media?.removeEventListener?.("change", schedule)
    }
  }
</script>

{#if ready}
  <ThemePanel
    {themeDocument}
    {activeModeId}
    {open}
    onToggleOpen={() => setOpen(!get(open))}
    onModeChange={setPanelMode}
    onVariableChange={(modeId, variable, value) => {
      setPanelTheme(updateModeValue(detectedTheme, modeId, variable, value))
    }}
    onThemeDocumentChange={setPanelTheme}
  />
{/if}
