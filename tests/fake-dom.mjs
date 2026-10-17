/**
 * The smallest DOM the theme layer needs, so the bundle can be exercised under
 * `node --test` without jsdom: a root element with attributes, elements with an
 * id, and a document that can find them again after append/remove.
 *
 * `install()` swaps `globalThis.document` and returns a restore function; it
 * also records inline style writes so tests can prove the theme leaves token
 * painting to dsh's own presenter.
 */
export function installFakeDom() {
  const byId = new Map()
  const appended = { head: [], body: [] }
  const inlineWrites = []

  const createNode = (tagName) => ({
    tagName: tagName.toUpperCase(),
    id: '',
    textContent: '',
    attributes: {},
    style: {
      setProperty(name, value) {
        inlineWrites.push({ node: this, name, value })
      },
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value)
    },
    getAttribute(name) {
      return this.attributes[name] ?? null
    },
    removeAttribute(name) {
      delete this.attributes[name]
    },
    remove() {
      if (this.id !== '' && byId.get(this.id) === this) byId.delete(this.id)
      for (const list of Object.values(appended)) {
        const at = list.indexOf(this)
        if (at >= 0) list.splice(at, 1)
      }
    },
  })

  const parent = (name) => ({
    appendChild(node) {
      if (node.id !== '') byId.set(node.id, node)
      appended[name].push(node)
      return node
    },
  })

  const document = {
    createElement: createNode,
    getElementById: (id) => byId.get(id) ?? null,
    documentElement: createNode('html'),
    head: parent('head'),
    body: parent('body'),
  }

  const previous = globalThis.document
  globalThis.document = document

  return {
    document,
    /** The `<html>` stand-in, where the overlay flags live. */
    root: document.documentElement,
    /** Elements currently in the document, by id. */
    byId,
    /** Everything appended so far, per parent. */
    appended,
    /** Any `element.style.setProperty()` call the theme made (it should make none). */
    inlineWrites,
    uninstall() {
      globalThis.document = previous
    },
  }
}
