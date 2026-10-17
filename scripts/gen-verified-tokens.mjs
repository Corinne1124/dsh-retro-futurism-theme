/**
 * Regenerate `src/client/verified.ts` from an installed DSH client-theme bundle.
 *
 * A theme may only override tokens the shipped design system actually declares,
 * so the allow-list is extracted from the DSH build that will host this plugin
 * instead of being hand-maintained. Re-run after a DSH upgrade:
 *
 *   node scripts/gen-verified-tokens.mjs
 *   node scripts/gen-verified-tokens.mjs "<path to dsh-client-ui-theme/lib/client.js>"
 *
 * The path can also come from DSH_THEME_CLIENT, so a CI job can point at an
 * unpacked app instead of `C:/Program Files`.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DEFAULT_SOURCE =
  'C:/Program Files/DSH Desktop/resources/app/node_modules/@deepseek-ai/dsh-client-ui-theme/lib/client.js'

const source = resolve(process.argv[2] ?? process.env.DSH_THEME_CLIENT ?? DEFAULT_SOURCE)
const target = join(here, '..', 'src', 'client', 'verified.ts')

const js = await readFile(source, 'utf8')
  .catch(() => {
    throw new Error(`cannot read the DSH client-theme bundle at ${source} — pass its path as the first argument`)
  })

/** `{ tokenName: one-line description }` from the inspect-token registry. */
function readDescriptions(text) {
  const from = text.indexOf('const BUILTIN_INSPECT_TOKENS')
  if (from < 0) throw new Error('BUILTIN_INSPECT_TOKENS not found — is this the client-theme bundle?')
  const to = text.indexOf(']);', from)
  const slice = text.slice(from, to)
  const out = new Map()
  for (const m of slice.matchAll(/name:\s*"(--[^"]+)",\s*description:\s*"((?:[^"\\]|\\.)*)"/g)) {
    out.set(m[1], m[2])
  }
  return out
}

/**
 * Every declared token, per colour scheme.
 *
 * `design_platform_css_default` is one JS string literal holding the shipped
 * stylesheet; the light palette sits in `body{...}` and the dark one in
 * `body[data-ds-dark-theme]{...}`. Both may span several rules, and later
 * declarations win, so the whole sheet is walked in source order.
 */
function readDeclarations(text) {
  const m = /design_platform_css_default\s*=\s*"((?:[^"\\]|\\.)*)"/.exec(text)
  if (!m) throw new Error('design_platform_css_default not found — is this the client-theme bundle?')
  const css = JSON.parse('"' + m[1] + '"')

  const light = new Map()
  const dark = new Map()
  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const target = /data-ds-dark-theme/.test(rule[1]) ? dark : light
    for (const decl of rule[2].matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;{}]+)/g)) {
      target.set(decl[1], decl[2].trim())
    }
  }
  return { light, dark, css }
}

const descriptions = readDescriptions(js)
const { light, dark, css } = readDeclarations(js)

const names = [...new Set([...light.keys(), ...dark.keys()])].sort()
// A theme owns the alias colours *and* the component-specific fills: the alias
// layer alone cannot reach the chat bubble, the sidebar fill or the menu
// material, which are exactly the surfaces a skin has to repaint. Font metrics,
// radii, shadows, gradients and the static scale stay the design system's
// authority and are excluded.
const writable = names.filter(
  (name) => name.startsWith('--dsw-alias-') || name.startsWith('--dsw-specific-'),
)

if (!writable.some((name) => name.startsWith('--dsw-alias-'))) {
  throw new Error('no --dsw-alias-* tokens found — refusing to write an empty allow-list')
}

const lines = []
const push = (...text) => lines.push(...text)
push('/**')
push(' * Tokens this theme may override — GENERATED, do not edit by hand.')
push(' *')
push(' * Source: the shipped `--dsw-*` stylesheet of @deepseek-ai/dsh-client-ui-theme.')
push(' * Regenerate with: node scripts/gen-verified-tokens.mjs')
push(' *')
push(` * ${writable.length} writable colours (alias + component-specific). The ${names.length - writable.length}`)
push(' * other shipped tokens (static scales, font metrics, radii, shadows, gradients)')
push(' * are the design system\'s authority, not a theme\'s.')
push(' */')
push('export const VERIFIED_TOKENS = [')
for (const name of writable) {
  const note = descriptions.get(name)
  const comment = note ? ` // ${note.replace(/\*\//g, '*\\/').replace(/\s+/g, ' ').trim()}` : ''
  push(`  '${name}',${comment}`)
}
push('] as const')
push('')
push('/** The colour surface every preset must cover in both modes (compile-time enforced). */')
push('export const COLOR_TOKENS = [')
for (const name of writable) push(`  '${name}',`)
push('] as const')
push('')
push('/**')
push(' * The palette dsh ships, copied expression-for-expression.')
push(' *')
push(' * The theme repaints the dark palette but keeps light as dsh built it, so the')
push(' * shipped values stay available as the light baseline and as a reference.')
push(' * `var(--dsw-static-*)` resolves per colour scheme on `body`, so an expression')
push(' * copied from here keeps tracking upstream without a hand-maintained copy.')
push(' */')
push('export const SHIPPED_PALETTE = {')
for (const [mode, map] of [['light', light], ['dark', dark]]) {
  push(`  ${mode}: {`)
  for (const name of writable) {
    const value = map.get(name)
    if (value === undefined) throw new Error(`${name} is missing from the shipped ${mode} palette`)
    push(`    '${name}': ${JSON.stringify(value)},`)
  }
  push('  },')
}
push('} as const')
push('')
push('const VERIFIED: ReadonlySet<string> = new Set(VERIFIED_TOKENS)')
push('')
push('/** Whether `name` is a token this theme is allowed to write. */')
push('export function isVerifiedToken(name: string): boolean {')
push('  return VERIFIED.has(name)')
push('}')
push('')

await writeFile(target, lines.join('\n'), 'utf8')
console.log(`wrote ${target}`)
console.log(`  writable tokens: ${writable.length}`)
console.log(`  shipped css: ${css.length} bytes`)
