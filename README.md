# dsh-retro-futurism

A terminal skin for the DeepSeek Harness web GUI.

Dark mode is a full repaint of the supplied reference: near-black canvas, navy
surface ladder, grey hairlines, blue-violet accent, mono type, plus an optional
scanline/grid overlay. **Light mode is left exactly as dsh shipped it** — the
reference only describes the dark look, so there is no invented light twin.

| Preset | Palette | Difference |
| --- | --- | --- |
| `cyberpunk` (default) | reference dark palette · dsh light palette | cyan-leaning scanline tint |
| `vaporwave` | reference dark palette · dsh light palette | violet-leaning scanline tint |

Anchors sampled from the reference:

| Role | Value | Token(s) |
| --- | --- | --- |
| canvas | `#02080c` | `bg-base`, `specific-sidebar-fill` |
| panel | `#030910` | `bg-layer-1`, `markdown-code-block` |
| raised / composer | `#0a1220` / `#0f1830` | `bg-layer-2`, `specific-input-major` |
| hairline | `rgba(210,216,223,.14…)` | `border-l1…l4` |
| body text / muted | `#d2d8df` / `#6f757c` | `label-primary`, `label-tertiary` |
| accent | `#747eff` | `brand-primary`, `state-business-primary`, `link` |
| bubble | `#1e2d45` | `specific-bubble` |
| selection highlight | `#dee4eb` | `switch-thumb` |

## What it touches

Colours go through the theme service like any theme's: the browser half calls
`ctx.theme.overrideTokens('dsh-retro-futurism', …)` with a `{ light, dark }` pair
per token, and dsh's own presenter writes the CSS variables. The writable surface
is the **alias layer plus the component-specific fills** (`--dsw-specific-bubble`,
`-sidebar-fill`, `-menu`, `-input-major`, …) — the bubble, the sidebar and the menu
material are not alias tokens, and a near-black app with dsh-grey bubbles would
not be the reference.

Light mode publishes dsh's own expressions verbatim (`var(--dsw-static-*)`,
`color-mix(…)`), so it keeps resolving per colour scheme and stays pixel-identical
to stock dsh.

`src/client/style.css` holds the rest, and nothing else:

- the monospace family on `--dsw-font-family` / `--ds-font-family-code`;
- the scanline/grid overlay, drawn by `html::before` / `html::after` and switched
  by `data-retro-*` attributes on the root element (no DOM node of its own, no
  motion without `prefers-reduced-motion: no-preference`). The scanline layer is a
  **horizontal grille** — 1px strands every 3px at `0.16` alpha over a `0.7` layer
  opacity — that slides by exactly one pitch every 2.4s (a `transform`, so the
  loop is seamless, nothing in layout moves, and the animation stays on the
  compositor); `grid` stays the coarse 32px layout grid;
- one lit control: the composer's send button, matched as
  `[data-composer-card] button[class*='_primary']` (class-suffix match survives
  CSS-module hashing; the aria-label is localized, so it is not used). Ported from
  the supplied template: a solid accent disc under an equal-width stripe sheet
  (light 0→50%, clear 50→100%, 3.1px pitch) that marches upward every 0.7s, a
  white glyph above it, a micro-glow at rest, a heavier glow plus outer halo on
  hover, a dimmed stalled sheet when disabled, and a `prefers-reduced-motion`
  opt-out. The band colours are sampled from the two references — normal
  `#9ddffd` over `#69add2`, disabled `#6b9be6` over `#4878c6` — so the button is a
  fixed palette rather than a tint of the preset accent; the template's 1px border
  became an inset ring so dsh's fixed 34px control does not resize.

No radius reset, no global glow, no selection tint: the reference is a flat,
bordered terminal, so the skin repaints colour and type but leaves geometry and
motion shape to dsh.

## Layout

```
src/index.ts              host half (no DOM): publishes the patch config
src/client/index.tsx      browser half entry: name / inject / apply
src/client/theme.ts       override layer, stylesheet injection, effect flags
src/client/tokens.ts      presets (authored dark palette, shipped light, overlay tint)
src/client/verified.ts    generated allow-list and the shipped palette itself
src/client/style.css      canvas, typography, overlay, send button
scripts/build-client.mjs        tsc -> single __ModuleLoader__ factory bundle
scripts/gen-verified-tokens.mjs re-extract allow-list + palette from a dsh install
tests/                    palette fidelity, bundle behaviour, host wiring
```

## Build and test

```bash
npm run build        # dist/index.js (host) + dist/client/index.js (browser)
npm test             # builds both halves (pretest), then runs node --test
npm run typecheck    # both halves, no emit
```

The suite loads the real artifacts: `tests/bundle.test.mjs` runs
`dist/client/index.js` through a `window.__ModuleLoader__` stub and applies it to
a stub theme service, so a broken bundle format or a leaked override layer fails
the build; `tests/tokens.test.mjs` asserts the presets match the shipped palette
value-for-value, which is the property this skin exists to preserve.

## Why the browser half is one factory file

The web client does not `import()` plugin client entries. It loads a file that
self-registers with the boot loader and reads the plugin off `module.exports`:

```js
window.__ModuleLoader__.load({ id, factory: (require) => module.exports })
// module.exports = { name, inject: ['theme'], apply }
```

`scripts/build-client.mjs` produces exactly that from ordinary TypeScript
sources: it compiles them as CommonJS into `.build/client`, inlines the
stylesheet, and wraps the modules into one factory. It refuses to emit if a
relative import is unresolvable, if the stylesheet placeholder is missing, or if
the placeholder survives inlining — the three ways this step could silently ship
a broken bundle.

## Switching presets and effects

The client loader calls `apply(ctx)` with no config, so the host half publishes
the patch config as a boot global and the bundle reads it there:

```yaml
- insert:
    - id: retro-futurism
      name: dsh-retro-futurism
      config:
        preset: vaporwave   # cyberpunk | vaporwave
        scanlines: true
        grid: true
        flicker: true
```

Only the documented keys travel; non-boolean flags and unknown keys are dropped
on both sides, and an unknown preset id falls back to `cyberpunk`.

On a running page the bundle publishes `__DSH_RETRO__`:

```js
__DSH_RETRO__.setPreset('vaporwave')
__DSH_RETRO__.setEffects({ scanlines: false })
__DSH_RETRO__.currentPresetId()
```

## Upgrading dsh

Both the allow-list and the palette come from the installed host, so an upgrade
is picked up by regenerating:

```bash
node scripts/gen-verified-tokens.mjs [path/to/dsh-client-ui-theme/lib/client.js]
npm run typecheck
```

`ModeColors` is derived from the generated list: a token dsh adds shows up as a
compile error until both modes cover it, and a token dsh removes is flagged as
excess.

## Deliberate limits

- Dark mode is an authored palette, not a derivation: the values in
  `src/client/tokens.ts` are the sampled anchors, and the tests pin a few of them
  plus "at least 85% of tokens differ from stock dsh". Light mode must stay
  byte-identical to dsh's own palette, and a test enforces that.
- Font *metric* tokens (`--dsw-font-xs-13`, …) are full `font:` shorthands and
  stay untouched; only the base family token is restyled.
- `--dsh-content-font-size` belongs to `ctx.theme.setFontSize()`, not to a theme.
- The ASCII frame furniture of the reference (boxed panel titles, the `ops` column,
  the bracketed status rule) is dsh's own markup and is **not** reproduced; the
  skin repaints what the DOM already provides.
- No inline `body.style` writes, so nothing has to be cleaned out of the document
  on unload.
