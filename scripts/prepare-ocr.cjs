// Copy pinned dependency assets; no network download or database access.
const { mkdirSync, copyFileSync, readdirSync } = require('node:fs')
const { dirname, resolve, join } = require('node:path')
const destination = resolve(__dirname, '../public/ocr')
mkdirSync(join(destination, 'core'), { recursive: true })
copyFileSync(require.resolve('tesseract.js/dist/worker.min.js'), join(destination, 'worker.min.js'))
const core = dirname(require.resolve('tesseract.js-core/package.json'))
for (const file of readdirSync(core).filter(file => /\.wasm(?:\.js)?$/.test(file))) {
  copyFileSync(join(core, file), join(destination, 'core', file))
}

copyFileSync(join(dirname(require.resolve('tesseract.js/package.json')), 'LICENSE.md'), join(destination, 'LICENSE-tesseract-js.txt'))
copyFileSync(join(core, 'LICENSE'), join(destination, 'LICENSE-tesseract-core.txt'))
