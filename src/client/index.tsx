/**
 * Browser-half entry.
 *
 * The client loader calls `apply(ctx)` on a module that exports
 * `name`/`inject`/`apply`, and passes the services named in `inject` through the
 * cordis context. `theme` is the dsh theme service — the only integration point
 * this plugin needs, because it takes alias-token overrides and dsh's own
 * presenter is what writes them to the document.
 */
import {
  createRetroTheme,
  type ClientContext,
  type OverlayFlags,
  type RetroThemeHandle,
} from './theme'
import { DEFAULT_PRESET_ID } from './tokens'

export const name = 'dsh-retro-futurism'

/** `theme` is the override registry; it owns light/dark resolution. */
export const inject = ['theme']

export interface RetroThemeConfig {
  /** `cyberpunk` (default) or `vaporwave`. */
  preset?: string
  /** CRT scanlines; default on. */
  scanlines?: boolean
  /** Perspective grid; default on. */
  grid?: boolean
  /** Slow brightness flicker; default on, and off under reduced-motion. */
  flicker?: boolean
}

let active: RetroThemeHandle | null = null

/** Boot global the host half publishes; see `src/index.ts`. */
interface BootGlobal {
  __DSH_RETRO_FUTURISM__?: unknown
}

/**
 * Keep only the documented keys with the documented types, so a hand-edited
 * patch value cannot half-apply and cannot shadow a valid one with `undefined`.
 */
function normalizeConfig(raw: unknown): RetroThemeConfig {
  if (typeof raw !== 'object' || raw === null) return {}
  const { preset, scanlines, grid, flicker } = raw as RetroThemeConfig
  const out: RetroThemeConfig = {}
  if (typeof preset === 'string') out.preset = preset
  if (typeof scanlines === 'boolean') out.scanlines = scanlines
  if (typeof grid === 'boolean') out.grid = grid
  if (typeof flicker === 'boolean') out.flicker = flicker
  return out
}

/** Paint a preset on the live theme, if one is installed. */
export function setPreset(id: string): boolean {
  return active?.setPreset(id) ?? false
}

/** Turn the CRT effects on or off on the live theme. */
export function setEffects(flags: OverlayFlags): void {
  active?.setEffects(flags)
}

/** The preset the live theme is painting. */
export function currentPresetId(): string | null {
  return active?.preset.id ?? null
}

/**
 * Live switch for the theme, published on `globalThis.__DSH_RETRO__` while the
 * plugin is mounted. It is the surface a settings card will call, and it is how
 * the presets can be compared on a running page:
 *
 *   __DSH_RETRO__.setPreset('vaporwave')
 *   __DSH_RETRO__.setEffects({ scanlines: false })
 */
export interface RetroDebugHandle {
  setPreset(id: string): boolean
  setEffects(flags: OverlayFlags): void
  currentPresetId(): string | null
}

const DEBUG_GLOBAL = '__DSH_RETRO__'

function publishHandle(handle: RetroDebugHandle | null): void {
  const target = globalThis as Record<string, unknown>
  if (handle === null) delete target[DEBUG_GLOBAL]
  else target[DEBUG_GLOBAL] = handle
}

/**
 * Apply the theme.
 *
 * The client loader passes no config, so the choices come from the boot global
 * the host half injects. An explicit argument still wins when present: it keeps
 * the seam open and lets tests exercise every option directly.
 */
export function apply(ctx: ClientContext, config?: RetroThemeConfig): void {
  const fromBoot = normalizeConfig((globalThis as BootGlobal).__DSH_RETRO_FUTURISM__)
  const inline = normalizeConfig(config)
  const options: RetroThemeConfig = { ...fromBoot, ...inline }

  const handle = createRetroTheme(ctx, {
    preset: options.preset ?? DEFAULT_PRESET_ID,
    scanlines: options.scanlines ?? true,
    grid: options.grid ?? true,
    flicker: options.flicker ?? true,
  })
  active = handle
  publishHandle({
    setPreset,
    setEffects,
    currentPresetId,
  })

  const teardown = (): void => {
    if (active === handle) active = null
    publishHandle(null)
    handle.dispose()
  }

  // cordis runs `effect` callbacks in reverse order on unload; without one
  // (tests, a bare context) fall back to the plain dispose hook.
  if (typeof ctx.effect === 'function') {
    ctx.effect(() => teardown, 'dsh-retro-futurism: theme layer')
  } else {
    ctx.onDispose?.(teardown)
  }
}
