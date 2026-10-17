# dsh-retro-futurism-theme

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

# dsh-retro-futurism-theme

DeepSeek Harness Web GUI 的终端皮肤。

深色模式是近黑画布、藏青色表面层级、灰色细线、蓝紫色强调色、等宽字体，外加可选的扫描线/网格叠加层。**浅色模式完全保持 dsh 出厂原样** —— 只描述了深色外观，因此不存在凭空发明的浅色对应版本。

| 预设 | 调色板 | 差异 |
| --- | --- | --- |
| `cyberpunk`（默认） | 参考深色调色板 · dsh 浅色调色板 | 偏青色的扫描线色调 |
| `vaporwave` | 参考深色调色板 · dsh 浅色调色板 | 偏紫色的扫描线色调 |

从参考稿中采样的锚点：

| 角色 | 值 | 令牌 |
| --- | --- | --- |
| 画布 | `#02080c` | `bg-base`、`specific-sidebar-fill` |
| 面板 | `#030910` | `bg-layer-1`、`markdown-code-block` |
| 凸起层 / 输入框 | `#0a1220` / `#0f1830` | `bg-layer-2`、`specific-input-major` |
| 细线 | `rgba(210,216,223,.14…)` | `border-l1…l4` |
| 正文文字 / 弱化文字 | `#d2d8df` / `#6f757c` | `label-primary`、`label-tertiary` |
| 强调色 | `#747eff` | `brand-primary`、`state-business-primary`、`link` |
| 气泡 | `#1e2d45` | `specific-bubble` |
| 选中高亮 | `#dee4eb` | `switch-thumb` |

## 它触及的范围

颜色像任何主题一样通过主题服务处理：浏览器端调用 `ctx.theme.overrideTokens('dsh-retro-futurism', …)`，每个令牌传入 `{ light, dark }` 一对值，然后由 dsh 自己的呈现器写入 CSS 变量。可写表面是**别名层加上组件特定的填充色**（`--dsw-specific-bubble`、`-sidebar-fill`、`-menu`、`-input-major` 等）—— 气泡、侧边栏和菜单材质不是别名令牌。

浅色模式逐字发布 dsh 自己的表达式（`var(--dsw-static-*)`、`color-mix(…)`），因此它继续按配色方案解析，并与原版 dsh 保持一致。

`src/client/style.css` 承载其余部分，别无他物：

- `--dsw-font-family` / `--ds-font-family-code` 上的等宽字体族；
- 扫描线/网格叠加层，由 `html::before` / `html::after` 绘制，通过根元素上的 `data-retro-*` 属性切换（没有自己的 DOM 节点，没有 `prefers-reduced-motion: no-preference` 就不产生动效）。扫描线层是一个**水平格栅** —— 每 3px 一条 1px 细线，alpha 为 `0.16`，叠加在 `0.7` 的层不透明度之上 —— 每 2.4 秒精确滑动一个间距（使用 `transform`，因此循环无缝、布局中没有任何东西移动、动画停留在合成器上）；`grid` 仍然是粗糙的 32px 布局网格；
- 一个发光的控件：输入框的发送按钮，匹配为 `[data-composer-card] button[class*='_primary']`（类后缀匹配可经受 CSS 模块哈希；aria-label 是本地化的，因此不使用）。移植自所提供模板：一个实心强调色圆盘，上面覆盖等宽条纹片（亮色 0→50%，透明 50→100%，间距 3.1px），每 0.7 秒向上行进一次；其上是一个白色字形；静止时有微光；悬停时有更强的光晕加外部光环；禁用时条纹片变暗并停滞；并提供 `prefers-reduced-motion` 退出选项。条纹颜色采样自两个参考稿 —— 正常态 `#9ddffd` 覆盖 `#69add2`，禁用态 `#6b9be6` 覆盖 `#4878c6` —— 因此按钮是固定调色板而非预设强调色的着色；模板的 1px 边框变成了内嵌环，这样 dsh 固定的 34px 控件不会改变尺寸。

没有圆角重置、没有全局光晕、没有选中着色：参考稿是一个扁平、带边框的终端，因此皮肤重绘颜色和字体，但把几何形状和动效形态留给 dsh。