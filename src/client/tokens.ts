/**
 * Palette for the skin.
 *
 * Light mode keeps dsh's own palette (`SHIPPED_PALETTE.light`): the reference
 * only covers the dark terminal look, and inventing a light twin nobody asked for
 * would be guessing.
 *
 * Dark mode is authored from the supplied reference and repaints the whole colour
 * surface — alias tokens *and* the component-specific fills, because the chat
 * bubble, the sidebar and the menu material are not alias tokens and would
 * otherwise stay dsh-grey inside a near-black app.
 *
 * Anchors sampled from the reference:
 *   canvas #02080c · panel #030910 · raised #0a1220 · composer #0f1830
 *   hairline rgba(210,216,223,.14…) · body text #d2d8df · muted #5f656c
 *   accent #747eff · bubble #1e2d45 · selection highlight #dee4eb
 *
 * Not ours to own: radius/motion shapes (dsh's own styles) and
 * `--dsh-content-font-size` (`ctx.theme.setFontSize()`).
 */
import { COLOR_TOKENS, SHIPPED_PALETTE, isVerifiedToken } from './verified'

/** Every colour a preset must define. Completeness is enforced by the compiler. */
export type ColorToken = (typeof COLOR_TOKENS)[number]

/** One mode's palette. */
export type ModeColors = Readonly<Record<ColorToken, string>>

export interface RetroPalette {
  id: string
  label: string
  /**
   * Overlay tint as an `r g b` triplet; `style.css` composes the alpha. This is
   * the only thing the two presets disagree on.
   */
  accent: string
  /** Daylight mode — the host's palette, untouched. */
  light: ModeColors
  /** Dark mode — the authored terminal palette. */
  dark: ModeColors
}

/** `{ [token]: { light, dark } }` — the shape `ctx.theme.overrideTokens()` takes. */
export type OverridePairs = Record<string, { light: string; dark: string }>

const LIGHT: ModeColors = SHIPPED_PALETTE.light

const DARK: ModeColors = {
  // --- surfaces: near-black canvas over a navy ladder ----------------------
  '--dsw-alias-bg-base': '#02080c',
  '--dsw-alias-bg-document-preview': '#01060a',
  '--dsw-alias-bg-document-selection': 'rgba(116, 126, 255, 0.35)',
  '--dsw-alias-bg-layer-1': '#030910',
  '--dsw-alias-bg-layer-2': '#0a1220',
  '--dsw-alias-bg-layer-3': '#121d33',
  '--dsw-alias-bg-mask-1': 'rgba(0, 4, 8, 0.6)',
  '--dsw-alias-bg-mask-2': 'rgba(0, 4, 8, 0.4)',
  '--dsw-alias-bg-mask-3': 'rgba(0, 4, 8, 0.8)',
  '--dsw-alias-bg-mask-drop': 'rgba(10, 18, 32, 0.72)',
  '--dsw-alias-bg-mask-photo': 'rgba(0, 3, 6, 0.9)',
  '--dsw-alias-bg-module-platform': '#060d16',
  '--dsw-alias-bg-multi-select': '#121d33',
  '--dsw-alias-bg-overlay': '#16233c',
  '--dsw-alias-bg-skeleton': 'rgba(116, 126, 255, 0.08)',
  // --- hairlines: light grey at low alpha, the frame in the reference ------
  '--dsw-alias-border-inverted': 'rgba(210, 216, 223, 0)',
  '--dsw-alias-border-inverted2': 'rgba(210, 216, 223, 0.14)',
  '--dsw-alias-border-l1': 'rgba(210, 216, 223, 0.14)',
  '--dsw-alias-border-l2': 'rgba(210, 216, 223, 0.22)',
  '--dsw-alias-border-l2-darkmode-thin': 'rgba(210, 216, 223, 0.16)',
  '--dsw-alias-border-l3': 'rgba(210, 216, 223, 0.32)',
  '--dsw-alias-border-l4': 'rgba(210, 216, 223, 0.42)',
  // --- brand / accent: the blue-violet of the sine wave --------------------
  '--dsw-alias-brand-primary': '#747eff',
  '--dsw-alias-brand-primary-invert': '#747eff',
  '--dsw-alias-brand-primary-new-colorprimary-new-color': '#8d95ff',
  '--dsw-alias-brand-text': '#a9aeff',
  // --- buttons ------------------------------------------------------------
  '--dsw-alias-button-contrast-fill': '#d2d8df',
  '--dsw-alias-button-elevated-fill': '#0a1220',
  '--dsw-alias-button-floating-fill': '#0f1830',
  '--dsw-alias-button-floating-hover': '#16233c',
  '--dsw-alias-button-ghost-active-border': 'rgba(116, 126, 255, 0.55)',
  '--dsw-alias-button-ghost-active-fill': 'rgba(116, 126, 255, 0.14)',
  '--dsw-alias-button-ghost-active-hover': 'rgba(116, 126, 255, 0.22)',
  '--dsw-alias-button-info-fill': '#747eff',
  '--dsw-alias-button-info-hover': '#8d95ff',
  '--dsw-alias-button-primary-dimmed': 'rgba(116, 126, 255, 0.35)',
  '--dsw-alias-button-primary-fill': '#747eff',
  '--dsw-alias-button-primary-hover': '#8d95ff',
  '--dsw-alias-button-tool-bar-fill': 'rgba(2, 8, 12, 0.6)',
  '--dsw-alias-button-tool-bar-fill-invisible': 'rgba(2, 8, 12, 0.45)',
  '--dsw-alias-button-tool-bar-hover': 'rgba(116, 126, 255, 0.2)',
  // --- diffs --------------------------------------------------------------
  '--dsw-alias-code-diff-added': 'rgba(88, 214, 164, 0.14)',
  '--dsw-alias-code-diff-deleted': 'rgba(255, 122, 134, 0.14)',
  '--dsw-alias-file-diff-added-bg': '#06251c',
  '--dsw-alias-file-diff-added-gutter': '#041c15',
  '--dsw-alias-file-diff-added-marker': '#58d6a4',
  '--dsw-alias-file-diff-deleted-bg': '#2a0f14',
  '--dsw-alias-file-diff-deleted-gutter': '#200b10',
  '--dsw-alias-file-diff-deleted-marker': '#ff7a86',
  // --- interaction layers -------------------------------------------------
  '--dsw-alias-interactive-bg-active': 'rgba(210, 216, 223, 0.16)',
  '--dsw-alias-interactive-bg-hover': 'rgba(210, 216, 223, 0.08)',
  '--dsw-alias-interactive-bg-hover-accent': 'rgba(116, 126, 255, 0.16)',
  '--dsw-alias-interactive-bg-hover-danger': 'rgba(255, 122, 134, 0.16)',
  '--dsw-alias-interactive-bg-hover-solid': '#121d33',
  // --- labels: light grey-blue down to a dim slate ------------------------
  '--dsw-alias-label-caption': '#4b5058',
  '--dsw-alias-label-deep-diving': '#a9aeff',
  '--dsw-alias-label-deep-diving-shimmer': 'rgba(169, 174, 255, 0.45)',
  '--dsw-alias-label-dimmed': '#1b2430',
  '--dsw-alias-label-document-preview': '#b6bec8',
  '--dsw-alias-label-primary': '#d2d8df',
  '--dsw-alias-label-primary-bluish': '#a9aeff',
  '--dsw-alias-label-primary-dimmed': '#b6bec8',
  '--dsw-alias-label-primary-foreground': '#02080c',
  '--dsw-alias-label-primary-inverted': '#030910',
  '--dsw-alias-label-secondary': '#9aa3ad',
  '--dsw-alias-label-shimmer': 'rgba(210, 216, 223, 0.35)',
  '--dsw-alias-label-tertiary': '#6f757c',
  '--dsw-alias-link': '#8d95ff',
  // --- markdown / code surfaces -------------------------------------------
  '--dsw-alias-markdown-citation': '#0a1220',
  '--dsw-alias-markdown-code-block': '#030910',
  '--dsw-alias-markdown-code-block-banner': '#060d16',
  '--dsw-alias-markdown-code-segment-selected': '#121d33',
  '--dsw-alias-markdown-code-segment-unselected': '#030910',
  '--dsw-alias-markdown-inline-code': '#0a1220',
  '--dsw-alias-markdown-placeholder': '#0a1220',
  '--dsw-alias-markdown-tag': '#0a1220',
  // --- menus --------------------------------------------------------------
  '--dsw-alias-menu-group-header-fill': 'rgba(3, 9, 16, 0.94)',
  '--dsw-alias-menu-icon': '#9aa3ad',
  // --- scrollbars ---------------------------------------------------------
  '--dsw-alias-scrollbar-bg-l1': 'rgba(210, 216, 223, 0.12)',
  '--dsw-alias-scrollbar-bg-l2': 'rgba(210, 216, 223, 0.18)',
  '--dsw-alias-scrollbar-hover-l1': 'rgba(116, 126, 255, 0.4)',
  '--dsw-alias-scrollbar-hover-l2': 'rgba(116, 126, 255, 0.55)',
  // --- semantic states ----------------------------------------------------
  '--dsw-alias-state-business-primary': '#747eff',
  '--dsw-alias-state-business-tertiary': 'rgba(116, 126, 255, 0.14)',
  '--dsw-alias-state-error-primary': '#ff7a86',
  '--dsw-alias-state-error-secondary': '#ff9ba4',
  '--dsw-alias-state-idle-primary': '#3a424e',
  '--dsw-alias-state-success-primary': '#58d6a4',
  '--dsw-alias-state-success-secondary': '#7ee6bd',
  '--dsw-alias-state-success-tertiary': 'rgba(88, 214, 164, 0.16)',
  '--dsw-alias-state-warn-label': '#e0c15c',
  '--dsw-alias-state-warn-primary': '#e0c15c',
  '--dsw-alias-state-warn-secondary': '#f0d688',
  '--dsw-alias-state-warn-tertiary': 'rgba(224, 193, 92, 0.16)',
  // --- misc surfaces ------------------------------------------------------
  '--dsw-alias-switch-thumb': '#dee4eb',
  '--dsw-alias-toast-bg': 'rgba(10, 18, 32, 0.96)',
  '--dsw-alias-toast-label': '#d2d8df',
  '--dsw-alias-tooltip-bg': '#0a1220',
  '--dsw-alias-tooltip-key-bg': '#16233c',
  '--dsw-alias-turn-trigger-bg': '#060d16',
  '--dsw-alias-turn-trigger-bg-hover': 'rgba(116, 126, 255, 0.12)',
  // --- component-specific fills (alias tokens cannot reach these) ----------
  '--dsw-specific-bubble': '#1e2d45',
  '--dsw-specific-bubble-highlight': '#2a3d5c',
  '--dsw-specific-input-major': '#0f1830',
  '--dsw-specific-login-input': '#0a1220',
  '--dsw-specific-menu': '#0a1220',
  '--dsw-specific-selector': '#121d33',
  '--dsw-specific-sidebar-fill': '#02080c',
  '--dsw-specific-sidebar-nav-item-active': '#121d33',
  '--dsw-specific-sidebar-nav-item-active-accent': 'rgba(116, 126, 255, 0.22)',
  '--dsw-specific-sidebar-nav-item-hover': 'rgba(210, 216, 223, 0.06)',
  '--dsw-specific-tip': '#0f1830',
}

/** Indigo CRT: the scanline tint joins the palette's own blue-violet. */
export const CYBERPUNK: RetroPalette = {
  id: 'cyberpunk',
  label: 'Terminal · Indigo CRT',
  accent: '116 126 255',
  light: LIGHT,
  dark: DARK,
}

/** Warm CRT: the same palette under a violet scanline tint. */
export const VAPORWAVE: RetroPalette = {
  id: 'vaporwave',
  label: 'Terminal · Violet CRT',
  accent: '185 103 255',
  light: LIGHT,
  dark: DARK,
}

export const PRESETS: readonly RetroPalette[] = [CYBERPUNK, VAPORWAVE]

/** The preset every fallback lands on. */
export const DEFAULT_PRESET: RetroPalette = CYBERPUNK

export const DEFAULT_PRESET_ID = DEFAULT_PRESET.id

/** Look a preset up by id; unknown ids are `undefined` so callers can fall back. */
export function presetById(id: string): RetroPalette | undefined {
  return PRESETS.find((preset) => preset.id === id)
}

/**
 * Drop anything that is not a shipped token.
 *
 * The palettes are typed, so this only matters for values arriving from the
 * outside (plugin config). Keeping it at the write boundary means an outdated
 * or mistyped override can never reach `document.body`.
 */
export function sanitize(map: Readonly<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(map)) {
    if (isVerifiedToken(key)) out[key] = value
  }
  return out
}

/**
 * Flatten a preset into the `{ light, dark }` pair shape the theme service
 * takes. Sanitised per mode, then re-checked as pairs: a token that only one
 * mode defines would leave the other palette showing the built-in colour, so it
 * is dropped from both instead of applied half-way.
 */
export function toOverridePairs(preset: RetroPalette): OverridePairs {
  const light = sanitize(preset.light)
  const dark = sanitize(preset.dark)
  const pairs: OverridePairs = {}
  for (const key of COLOR_TOKENS) {
    const l = light[key]
    const d = dark[key]
    if (l === undefined || d === undefined) continue
    pairs[key] = { light: l, dark: d }
  }
  return pairs
}
