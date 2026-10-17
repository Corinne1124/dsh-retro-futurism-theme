/**
 * Host half.
 *
 * The theme itself is a browser concern: colours travel as alias-token overrides
 * through the client theme service, and nothing here touches the DOM. What the
 * host owes the browser half is the *choice*: the client loader calls
 * `apply(ctx)` with no config, so the patch config is handed over as a boot
 * global — the same channel the built-in theme uses to publish its palette
 * before plugins start.
 */
export const NAMESPACE = 'dsh-retro-futurism'

/** Boot global the browser half reads before applying. */
export const CONFIG_GLOBAL = '__DSH_RETRO_FUTURISM__'

export interface RetroHostConfig {
  /** `cyberpunk` (default) or `vaporwave`. */
  preset?: string
  /** CRT scanlines; default on. */
  scanlines?: boolean
  /** Perspective grid; default on. */
  grid?: boolean
  /** Slow brightness flicker; default on, and off under reduced-motion. */
  flicker?: boolean
}

/** One row of the index-injection table the webserver plugin collects. */
interface InjectionRow {
  kind: 'global' | 'style' | 'script' | 'script-src' | 'script-preload' | 'html'
  name?: string
  value?: unknown
  text?: string
  placement?: 'head' | 'body'
  src?: string
}

/** The slice of the cordis host context this plugin uses. */
export interface HostContext {
  on?(
    event: 'webserver/index-inject',
    callback: (table: InjectionRow[]) => void,
    options?: { prepend?: boolean },
  ): void
}

/** Only the documented keys travel; anything else in the config is dropped. */
function browserConfig(config: RetroHostConfig | undefined): RetroHostConfig {
  const out: RetroHostConfig = {}
  if (config === undefined) return out
  if (typeof config.preset === 'string') out.preset = config.preset
  for (const key of ['scanlines', 'grid', 'flicker'] as const) {
    if (typeof config[key] === 'boolean') out[key] = config[key]
  }
  return out
}

/**
 * Publish the theme choice for the browser half.
 *
 * `webserver/index-inject` only fires when a webserver is composed; without one
 * there is no page to style, so the listener is simply never called.
 */
export function apply(ctx: HostContext, config?: RetroHostConfig): void {
  if (typeof ctx.on !== 'function') return
  const value = browserConfig(config)
  ctx.on('webserver/index-inject', (table) => {
    table.push({ kind: 'global', name: CONFIG_GLOBAL, value })
  })
}
