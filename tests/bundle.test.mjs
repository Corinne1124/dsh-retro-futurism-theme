/**
 * Drives the real artifact: `dist/client/index.js` is loaded the way the web
 * client loads it (through `window.__ModuleLoader__`), and the plugin is applied
 * to a stub theme service. That covers the parts a type checker cannot: the
 * factory bundle format, the exported plugin shape, the override lifecycle and
 * the style/effect side effects.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import test from 'node:test'
import { installFakeDom } from './fake-dom.mjs'

const require = createRequire(import.meta.url)
const { COLOR_TOKENS, SHIPPED_PALETTE } = require('../.build/client/verified.js')

const BUNDLE = new URL('../dist/client/index.js', import.meta.url)

async function loadPlugin() {
  const code = await readFile(BUNDLE, 'utf8')
  let registration
  const window = {
    __ModuleLoader__: {
      load(entry) {
        registration = entry
      },
    },
  }
  new Function('window', code)(window)
  assert.ok(registration, 'the bundle did not register with window.__ModuleLoader__')
  assert.equal(registration.id, 'dsh-retro-futurism')

  const plugin = registration.factory((id) => {
    throw new Error(`the theme must not require a host module, got "${id}"`)
  })
  return { registration, plugin }
}

/** A theme service stand-in that records layers and their disposers. */
function fakeTheme() {
  const layers = []
  return {
    layers,
    service: {
      overrideTokens(source, tokens) {
        const layer = { source, tokens, disposed: false }
        layers.push(layer)
        return () => {
          layer.disposed = true
        }
      },
    },
    get current() {
      return layers.at(-1)
    },
  }
}

function fakeContext(theme) {
  const teardowns = []
  return {
    teardowns,
    ctx: {
      theme: theme.service,
      effect(callback) {
        const teardown = callback()
        if (typeof teardown === 'function') teardowns.push(teardown)
      },
    },
  }
}

test('bundle registers the plugin shape the client loader reads', async () => {
  const { plugin } = await loadPlugin()
  assert.equal(plugin.name, 'dsh-retro-futurism')
  assert.deepEqual(plugin.inject, ['theme'])
  assert.equal(typeof plugin.apply, 'function')
  assert.equal(typeof plugin.setPreset, 'function')
  assert.equal(typeof plugin.setEffects, 'function')
})

test('apply paints a full light/dark pair set through the theme service', async () => {
  const { plugin } = await loadPlugin()
  const dom = installFakeDom()
  try {
    const theme = fakeTheme()
    const { ctx } = fakeContext(theme)
    plugin.apply(ctx, { preset: 'cyberpunk' })

    assert.equal(theme.layers.length, 1)
    const layer = theme.current
    assert.equal(layer.source, 'dsh-retro-futurism')
    assert.deepEqual(Object.keys(layer.tokens).sort(), [...COLOR_TOKENS].sort())
    for (const [token, pair] of Object.entries(layer.tokens)) {
      assert.match(token, /^--dsw-(alias|specific)-/)
      assert.equal(typeof pair.light, 'string', `${token} is not a { light, dark } pair`)
      assert.equal(typeof pair.dark, 'string', `${token} is not a { light, dark } pair`)
      // Light is dsh's own palette; dark is the authored terminal repaint.
      assert.equal(pair.light, SHIPPED_PALETTE.light[token], `${token} light drifts from dsh`)
    }
    assert.equal(layer.tokens['--dsw-alias-bg-base'].dark, '#02080c')
    assert.equal(layer.tokens['--dsw-specific-bubble'].dark, '#1e2d45')
    // Token painting belongs to dsh's presenter, not to this plugin.
    assert.deepEqual(dom.inlineWrites, [])
    // And no DOM node of our own: the overlay is CSS on the root element.
    assert.deepEqual(dom.appended.head.map((node) => node.id), ['dsh-retro-style'])
    assert.deepEqual(dom.appended.body, [])
  } finally {
    dom.uninstall()
  }
})

test('apply injects the stylesheet with the preset tint', async () => {
  const { plugin } = await loadPlugin()
  const dom = installFakeDom()
  try {
    const theme = fakeTheme()
    const { ctx } = fakeContext(theme)
    plugin.apply(ctx, { preset: 'vaporwave', scanlines: false, grid: true, flicker: true })

    const style = dom.byId.get('dsh-retro-style')
    assert.ok(style, 'no style element was injected')
    const css = style.textContent
    assert.ok(!css.includes('__RETRO_CSS__'), 'the build did not inline the stylesheet')
    assert.match(css, /--retro-accent:185 103 255/, 'the preset tint is missing from the stylesheet')
    assert.match(css, /html\[data-retro-scanlines='on'\]::before/, 'the overlay rules are missing')
    assert.match(css, /html\[data-retro-grid='on'\]::after/)
    assert.match(css, /prefers-reduced-motion/, 'the flicker needs a reduced-motion opt-out')
    // Heavier scanlines: the layer opacity is a variable the keyframes pulse.
    assert.match(css, /--retro-layer-opacity:\s*0\.7/, 'the scanline layer lost its density')
    assert.match(css, /opacity:\s*var\(--retro-layer-opacity/)
    // Horizontal grille with a pseudo-motion: one pitch per cycle, driven by a
    // transform (compositor) rather than a background offset, and no crosshatch.
    assert.match(css, /repeating-linear-gradient\(\s*to bottom/, 'the grille must be horizontal')
    assert.match(css, /@keyframes dsh-retro-roll/, 'the grille lost its rolling motion')
    assert.match(css, /translateY\(var\(--retro-grille-pitch/, 'the roll must be a transform')
    assert.match(css, /dsh-retro-roll 2\.4s linear infinite/, 'the roll is not wired to the grille')
    assert.doesNotMatch(css, /background-size:\s*3px 3px/, 'the grille turned back into a crosshatch')
    // Send button, ported from the supplied template: equal-width bands marching
    // upward, a hover halo, and a reduced-motion opt-out.
    assert.match(css, /\[data-composer-card\] button\[class\*='_primary'\]/, 'the send-button rule is missing')
    assert.match(css, /--retro-send-stripe:\s*3\.1px/, 'the stripe pitch is missing')
    assert.match(
      css,
      /linear-gradient\(0deg, var\(--retro-send-stripe-color\) 0 50%, transparent 50% 100%\)/,
      'the equal-width stripe sheet is missing',
    )
    assert.match(css, /@keyframes dsh-retro-send-stripes/, 'the marching animation is missing')
    assert.match(css, /animation: dsh-retro-send-stripes 0\.7s linear infinite/, 'the stripes do not march')
    assert.match(css, /0 0 18px -2px/, 'the hover halo is missing')
    // The composer's "add files or run commands" chip is offset from the input
    // surface, so the relationship — not a hard-coded value — has to survive.
    assert.match(
      css,
      /\[data-composer-card\] button\[aria-haspopup='listbox'\] \{\s*background-color: color-mix\(in srgb, var\(--dsw-specific-input-major\) 75%, #5370a4\)/,
      'the add-files chip must be mixed from the input surface',
    )
    // Colours are the sampled bands of the two references (图二 normal, 图一 disabled).
    for (const colour of ['#9ddffd', '#69add2', '#6b9be6', '#4878c6']) {
      assert.ok(css.includes(colour), `the sampled band colour ${colour} is missing`)
    }
    // The disabled sheet replaces the light bands instead of fading them.
    assert.match(
      css,
      /:disabled::before \{[^}]*opacity: 1[^}]*var\(--retro-send-stripe-disabled\)/,
      'the disabled stripes must use the sampled muted bands',
    )
    assert.match(
      css,
      /prefers-reduced-motion: reduce\) \{\s*\[data-composer-card\]/,
      'the button animation needs a reduced-motion opt-out',
    )
  } finally {
    dom.uninstall()
  }
})

test('effects are switched by root attributes, and off means off', async () => {
  const { plugin } = await loadPlugin()
  const dom = installFakeDom()
  try {
    const theme = fakeTheme()
    const { ctx } = fakeContext(theme)
    plugin.apply(ctx, { scanlines: false, grid: true, flicker: true })

    assert.equal(dom.root.getAttribute('data-retro-scanlines'), 'off')
    assert.equal(dom.root.getAttribute('data-retro-grid'), 'on')
    assert.equal(dom.root.getAttribute('data-retro-flicker'), 'on')

    plugin.setEffects({ scanlines: true, flicker: false })
    assert.equal(dom.root.getAttribute('data-retro-scanlines'), 'on')
    assert.equal(dom.root.getAttribute('data-retro-flicker'), 'off')
    // Unspecified flags keep their value.
    assert.equal(dom.root.getAttribute('data-retro-grid'), 'on')
  } finally {
    dom.uninstall()
  }
})

test('setPreset replaces the override layer instead of stacking a new one', async () => {
  const { plugin } = await loadPlugin()
  const dom = installFakeDom()
  try {
    const theme = fakeTheme()
    const { ctx } = fakeContext(theme)
    plugin.apply(ctx, { preset: 'cyberpunk' })
    const first = theme.current

    assert.equal(plugin.setPreset('vaporwave'), true)
    assert.equal(theme.layers.length, 2)
    assert.equal(first.disposed, true, 'the previous override layer was never released')

    const second = theme.current
    // Same palette by design; the presets differ only in the overlay tint.
    assert.deepEqual(second.tokens['--dsw-alias-bg-base'], first.tokens['--dsw-alias-bg-base'])
    assert.match(dom.byId.get('dsh-retro-style').textContent, /--retro-accent:185 103 255/)
    assert.equal(plugin.currentPresetId(), 'vaporwave')
  } finally {
    dom.uninstall()
  }
})

test('an unknown preset falls back to the default instead of painting nothing', async () => {
  const { plugin } = await loadPlugin()
  const dom = installFakeDom()
  try {
    const theme = fakeTheme()
    const { ctx } = fakeContext(theme)
    plugin.apply(ctx, { preset: 'no-such-preset' })
    assert.equal(theme.layers.length, 1)
    assert.equal(theme.current.tokens['--dsw-alias-bg-base'].dark, '#02080c')
    assert.equal(plugin.setPreset('nope'), false)
    assert.equal(theme.layers.length, 1, 'a rejected preset must not repaint')
  } finally {
    dom.uninstall()
  }
})

test('unload removes the layer, the stylesheet and the root flags', async () => {
  const { plugin } = await loadPlugin()
  const dom = installFakeDom()
  try {
    const theme = fakeTheme()
    const { ctx, teardowns } = fakeContext(theme)
    plugin.apply(ctx, { preset: 'cyberpunk' })
    assert.equal(teardowns.length, 1, 'apply registered no teardown')

    teardowns[0]()

    assert.equal(theme.current.disposed, true)
    assert.equal(dom.byId.has('dsh-retro-style'), false)
    assert.deepEqual(Object.keys(dom.root.attributes), [], 'the root flags were left behind')
    // The plugin is inert afterwards rather than half-alive.
    assert.equal(plugin.setPreset('vaporwave'), false)
    assert.equal(plugin.currentPresetId(), null)
  } finally {
    dom.uninstall()
  }
})

test('the theme half also works through onDispose when there is no effect hook', async () => {
  const { plugin } = await loadPlugin()
  const dom = installFakeDom()
  try {
    const theme = fakeTheme()
    const teardowns = []
    const ctx = { theme: theme.service, onDispose: (fn) => teardowns.push(fn) }
    plugin.apply(ctx)
    assert.equal(teardowns.length, 1)
    teardowns[0]()
    assert.equal(theme.current.disposed, true)
  } finally {
    dom.uninstall()
  }
})

test('the host-published boot global selects the preset', async () => {
  const { plugin } = await loadPlugin()
  const dom = installFakeDom()
  globalThis.__DSH_RETRO_FUTURISM__ = { preset: 'vaporwave', scanlines: false }
  try {
    const theme = fakeTheme()
    const { ctx } = fakeContext(theme)
    plugin.apply(ctx)

    assert.equal(plugin.currentPresetId(), 'vaporwave')
    assert.equal(theme.current.tokens['--dsw-alias-bg-base'].light, SHIPPED_PALETTE.light['--dsw-alias-bg-base'])
    assert.equal(dom.root.getAttribute('data-retro-scanlines'), 'off')
    // Unset keys keep their defaults.
    assert.equal(dom.root.getAttribute('data-retro-grid'), 'on')

    // An explicit argument still wins over the boot global.
    plugin.setPreset('cyberpunk')
    assert.equal(plugin.currentPresetId(), 'cyberpunk')
  } finally {
    delete globalThis.__DSH_RETRO_FUTURISM__
    dom.uninstall()
  }
})

test('applying without a document (server-side import) does not throw', async () => {
  const { plugin } = await loadPlugin()
  const theme = fakeTheme()
  const { ctx } = fakeContext(theme)
  plugin.apply(ctx, { preset: 'cyberpunk' })
  // No fake DOM installed: the token layer still registers, DOM work is skipped.
  assert.equal(theme.layers.length, 1)
})
