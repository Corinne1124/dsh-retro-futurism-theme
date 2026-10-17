/**
 * Host half: it must publish the patch config as a boot global for the browser
 * half, and must stay inert when no webserver is composed.
 */
import assert from 'node:assert/strict'
import test from 'node:test'

const { apply, NAMESPACE, CONFIG_GLOBAL } = await import('../dist/index.js')

function captureContext() {
  const listeners = []
  return {
    listeners,
    ctx: {
      on(event, callback, options) {
        listeners.push({ event, callback, options })
      },
    },
  }
}

test('host publishes the browser config through the index-inject hook', () => {
  const { ctx, listeners } = captureContext()
  apply(ctx, { preset: 'vaporwave', scanlines: false })

  assert.equal(NAMESPACE, 'dsh-retro-futurism')
  assert.equal(listeners.length, 1)
  assert.equal(listeners[0].event, 'webserver/index-inject')

  const table = []
  listeners[0].callback(table)
  assert.deepEqual(table, [
    { kind: 'global', name: CONFIG_GLOBAL, value: { preset: 'vaporwave', scanlines: false } },
  ])
})

test('host drops undocumented keys and non-boolean flags', () => {
  const { ctx, listeners } = captureContext()
  // A hand-edited patch is not trusted: only the documented surface travels.
  apply(ctx, { preset: 'cyberpunk', scanlines: 'yes', grid: true, extra: 1 })

  const table = []
  listeners[0].callback(table)
  assert.deepEqual(table[0].value, { preset: 'cyberpunk', grid: true })
})

test('host defaults to an empty config and survives a missing context', () => {
  const { ctx, listeners } = captureContext()
  apply(ctx)
  const table = []
  listeners[0].callback(table)
  assert.deepEqual(table[0].value, {})

  assert.doesNotThrow(() => apply({}), 'a context without the hook must not throw')
})
