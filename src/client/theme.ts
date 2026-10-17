/**
 * Retro-futurism theme layer for the browser half.
 *
 * Colours go through `ctx.theme.overrideTokens()`, not body inline styles: the
 * theme service folds our `{ light, dark }` pairs into the active palette
 * snapshot and dsh's own presenter writes the tokens, so switching between
 * light and dark needs no listener here and the tokens disappear cleanly when
 * the plugin unloads.
 *
 * Only the dimensions dsh ships no token for are ours to paint: radius, glow,
 * scanlines, grid, CRT flicker, selection tint and the type stack. The effects
 * are drawn by `html::before` / `html::after`, switched by attributes on the
 * root element — no extra DOM node, nothing appended to `body`.
 */
import { DEFAULT_PRESET, presetById, toOverridePairs, type RetroPalette } from './tokens'

/** Identity of the override layer — one layer per source, replaced on switch. */
export const SOURCE = 'dsh-retro-futurism'

const STYLE_ID = 'dsh-retro-style'

/** Root attributes the overlay rules in `style.css` key off. */
const FLAG_ATTRIBUTES = {
  scanlines: 'data-retro-scanlines',
  grid: 'data-retro-grid',
  flicker: 'data-retro-flicker',
} as const

/**
 * Build-time placeholder: `scripts/build-client.mjs` replaces this literal with
 * the contents of `src/client/style.css`. Keeping the stylesheet a real file
 * keeps it editable and lintable while shipping a bundle with no runtime fetch.
 */
const RETRO_CSS = '__RETRO_CSS__'

/** The part of the theme service this plugin consumes. */
export interface ThemeOverrideService {
  overrideTokens(
    source: string,
    tokens: Record<string, { light: string; dark: string }>,
  ): () => void
}

/** The slice of the cordis client context this plugin uses. */
export interface ClientContext {
  theme: ThemeOverrideService
  effect?(callback: () => void | (() => void), label?: string): void
  onDispose?(callback: () => void): void
}

export interface OverlayFlags {
  scanlines?: boolean
  grid?: boolean
  flicker?: boolean
}

export interface RetroThemeOptions extends OverlayFlags {
  /** Preset id; unknown or missing ids fall back to the default preset. */
  preset?: string
}

export interface RetroThemeHandle {
  /** The preset currently painted. */
  readonly preset: RetroPalette
  /** Paint another preset by id. Returns false for an unknown id. */
  setPreset(id: string): boolean
  /** Turn the CRT effects on or off, keeping the current preset. */
  setEffects(flags: OverlayFlags): void
  /** Undo everything this handle did. Idempotent. */
  dispose(): void
}

/** The tint variable `style.css` composes its overlay alphas from. */
function tintRule(preset: RetroPalette): string {
  return `body{--retro-accent:${preset.accent}}`
}

function resolvePreset(id: string | undefined): RetroPalette {
  if (id === undefined) return DEFAULT_PRESET
  return presetById(id) ?? DEFAULT_PRESET
}

/**
 * Install the theme and return a handle that can switch presets and uninstall.
 *
 * Nothing is registered twice: a preset switch replaces this handle's override
 * layer (the session keeps a single layer per source) and rewrites the style
 * element in place.
 */
export function createRetroTheme(ctx: ClientContext, options: RetroThemeOptions = {}): RetroThemeHandle {
  let preset = resolvePreset(options.preset)
  let flags: OverlayFlags = {
    scanlines: options.scanlines ?? true,
    grid: options.grid ?? true,
    flicker: options.flicker ?? true,
  }
  let releaseLayer: (() => void) | null = null
  let styleElement: HTMLStyleElement | null = null
  let disposed = false

  function applyFlags(): void {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const entries: [keyof OverlayFlags, string][] = [
      ['scanlines', FLAG_ATTRIBUTES.scanlines],
      ['grid', FLAG_ATTRIBUTES.grid],
      ['flicker', FLAG_ATTRIBUTES.flicker],
    ]
    for (const [name, attribute] of entries) {
      root.setAttribute(attribute, flags[name] === false ? 'off' : 'on')
    }
  }

  function injectStyle(): void {
    if (typeof document === 'undefined') return
    // The bundle is only usable once the build has inlined the stylesheet; a
    // raw placeholder would be silently ignored by the CSS parser.
    if (RETRO_CSS.startsWith('__RETRO_CSS')) return

    if (styleElement === null) {
      styleElement = document.createElement('style')
      styleElement.id = STYLE_ID
      document.head.appendChild(styleElement)
    }
    styleElement.textContent = `${RETRO_CSS}\n${tintRule(preset)}`
  }

  function paint(): void {
    releaseLayer?.()
    releaseLayer = ctx.theme.overrideTokens(SOURCE, toOverridePairs(preset))
  }

  paint()
  injectStyle()
  applyFlags()

  return {
    get preset() {
      return preset
    },

    setPreset(id: string): boolean {
      if (disposed) return false
      const next = presetById(id)
      if (next === undefined) return false
      if (next.id === preset.id) return true
      preset = next
      paint()
      injectStyle()
      return true
    },

    setEffects(next: OverlayFlags): void {
      if (disposed) return
      flags = {
        scanlines: next.scanlines ?? flags.scanlines,
        grid: next.grid ?? flags.grid,
        flicker: next.flicker ?? flags.flicker,
      }
      applyFlags()
    },

    dispose(): void {
      if (disposed) return
      disposed = true
      releaseLayer?.()
      releaseLayer = null
      styleElement?.remove()
      styleElement = null
      if (typeof document !== 'undefined') {
        for (const attribute of Object.values(FLAG_ATTRIBUTES)) {
          document.documentElement.removeAttribute(attribute)
        }
      }
    },
  }
}
