import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)

// The client build emits CommonJS modules into .build/client (with its own
// package.json marking them so); `npm test` builds before running the tests.
const {
  PRESETS,
  DEFAULT_PRESET_ID,
  presetById,
  sanitize,
  toOverridePairs,
} = require('../.build/client/tokens.js')
const {
  VERIFIED_TOKENS,
  COLOR_TOKENS,
  SHIPPED_PALETTE,
  isVerifiedToken,
} = require('../.build/client/verified.js')

const VERIFIED = new Set(VERIFIED_TOKENS)
const CSS_VALUE = /^(#[0-9a-f]{3,8}|rgba?\(\s*[^)]*\)|var\(--[a-z0-9-]+\)|color-mix\(.+\))$/i

test('every preset covers the whole colour surface in both modes', () => {
  assert.ok(PRESETS.length >= 2)
  for (const preset of PRESETS) {
    assert.deepEqual(Object.keys(preset.light).sort(), [...COLOR_TOKENS].sort(), `${preset.id}.light is incomplete`)
    assert.deepEqual(Object.keys(preset.dark).sort(), [...COLOR_TOKENS].sort(), `${preset.id}.dark is incomplete`)
  }
})

test('light mode stays exactly as dsh shipped it', () => {
  for (const preset of PRESETS) {
    for (const token of COLOR_TOKENS) {
      assert.equal(preset.light[token], SHIPPED_PALETTE.light[token], `${preset.id}.light ${token} drifted`)
    }
  }
})

test('dark mode is a full repaint of the reference terminal', () => {
  for (const preset of PRESETS) {
    const repainted = COLOR_TOKENS.filter((token) => preset.dark[token] !== SHIPPED_PALETTE.dark[token])
    assert.ok(
      repainted.length > COLOR_TOKENS.length * 0.85,
      `${preset.id}: only ${repainted.length}/${COLOR_TOKENS.length} tokens were repainted`,
    )
    // Anchors sampled from the supplied reference.
    assert.equal(preset.dark['--dsw-alias-bg-base'], '#02080c', 'canvas must be the sampled near-black')
    assert.equal(preset.dark['--dsw-alias-state-business-primary'], '#747eff', 'accent must be the sampled blue-violet')
    assert.equal(preset.dark['--dsw-alias-label-primary'], '#d2d8df', 'body text must be the sampled light grey')
    // Component fills the alias layer cannot reach.
    assert.equal(preset.dark['--dsw-specific-bubble'], '#1e2d45')
    assert.equal(preset.dark['--dsw-specific-sidebar-fill'], '#02080c')
  }
})

test('presets only write verified tokens, and every value is a CSS value', () => {
  for (const preset of PRESETS) {
    for (const mode of ['light', 'dark']) {
      for (const [key, value] of Object.entries(preset[mode])) {
        assert.ok(VERIFIED.has(key), `${preset.id}.${mode} wrote an unverified token: ${key}`)
        assert.match(value, CSS_VALUE, `${preset.id}.${mode} ${key} is not a CSS value: ${value}`)
      }
    }
  }
})

test('the two modes stay distinct and the presets differ only in overlay tint', () => {
  for (const preset of PRESETS) {
    const differing = COLOR_TOKENS.filter((key) => preset.light[key] !== preset.dark[key])
    assert.ok(
      differing.length > COLOR_TOKENS.length * 0.6,
      `${preset.id}: only ${differing.length}/${COLOR_TOKENS.length} tokens differ between modes`,
    )
    assert.match(preset.accent, /^\d{1,3} \d{1,3} \d{1,3}$/)
  }

  const [first, second] = PRESETS
  assert.deepEqual({ ...first.dark }, { ...second.dark }, 'presets must not recolour')
  assert.notEqual(first.accent, second.accent, 'presets must stay distinguishable')
})

test('preset metadata is coherent', () => {
  const ids = PRESETS.map((preset) => preset.id)
  assert.equal(new Set(ids).size, ids.length, 'preset ids must be unique')
  assert.ok(ids.includes(DEFAULT_PRESET_ID))
  assert.equal(presetById(DEFAULT_PRESET_ID)?.id, DEFAULT_PRESET_ID)
  assert.equal(presetById('no-such-preset'), undefined)
  for (const preset of PRESETS) assert.ok(preset.label.length > 0)
})

test('sanitize keeps verified tokens and drops everything else', () => {
  const dirty = { '--accent': '#fff', '--dsw-specific-bubble': '#1e2d45', '--dsw-font-xs-13': '13px' }
  assert.deepEqual(Object.keys(sanitize(dirty)), ['--dsw-specific-bubble'])
})

test('isVerifiedToken covers alias + specific colours only', () => {
  assert.equal(isVerifiedToken('--dsw-alias-bg-base'), true)
  assert.equal(isVerifiedToken('--dsw-specific-bubble'), true)
  assert.equal(isVerifiedToken('--dsw-static-blue-500'), false)
  assert.equal(isVerifiedToken('--dsw-font-xs-13'), false)
  assert.equal(isVerifiedToken('--dsw-font-mono'), false)
  assert.equal(isVerifiedToken('--not-real'), false)
})

test('toOverridePairs produces one { light, dark } pair per colour token', () => {
  for (const preset of PRESETS) {
    const pairs = toOverridePairs(preset)
    assert.deepEqual(Object.keys(pairs).sort(), [...COLOR_TOKENS].sort())
    for (const [key, pair] of Object.entries(pairs)) {
      assert.equal(typeof pair, 'object', `${key} must be a pair, never a bare string`)
      assert.equal(typeof pair.light, 'string')
      assert.equal(typeof pair.dark, 'string')
      assert.notEqual(pair.light, '')
      assert.notEqual(pair.dark, '')
    }
  }
})
