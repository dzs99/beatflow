import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const walk = (path) => readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
  const fullPath = resolve(path, entry.name)
  return entry.isDirectory() ? walk(fullPath) : [fullPath]
})
for (const file of walk(resolve(root, 'js')).filter((path) => path.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    assert.ok(existsSync(resolve(dirname(file), match[1])), `Import faltante: ${match[1]}`)
  }
}
const html = readFileSync(resolve(root, 'index.html'), 'utf8')
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
assert.equal(new Set(ids).size, ids.length, 'IDs HTML duplicados')
for (const id of ['app', 'global-search', 'player-favorite-button', 'previous-button', 'next-button', 'play-button', 'progress-range', 'volume-range']) {
  assert.ok(ids.includes(id), `Control faltante: ${id}`)
}

const values = new Map()
globalThis.localStorage = {
  getItem: (key) => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
}
const storage = await import('../js/services/storage.service.js')
const queue = await import('../js/services/queue.service.js')
const tracks = Array.from({ length: 25 }, (_, id) => ({ id: String(id), title: `Track ${id}` }))
assert.deepEqual(storage.getFavorites(), [])
storage.toggleFavorite(tracks[0])
assert.equal(storage.isFavorite('0'), true)
storage.toggleFavorite(tracks[0])
assert.equal(storage.isFavorite('0'), false)
for (const track of tracks) storage.addToHistory(track)
assert.equal(storage.getHistory().length, 20)
storage.addToHistory(tracks[20])
assert.equal(storage.getHistory()[0].id, '20')
assert.equal(new Set(storage.getHistory().map((track) => track.id)).size, 20)
storage.saveVolume(0.35)
assert.equal(storage.getVolume(), 0.35)
storage.saveVolume(5)
assert.equal(storage.getVolume(), 1)
storage.saveLastTrack(tracks[0])
assert.equal(storage.getLastTrack().id, '0')
values.set('beatflow:favorites', '{invalid')
const originalError = console.error
console.error = () => {}
assert.deepEqual(storage.getFavorites(), [])
console.error = originalError
queue.setQueue(tracks.slice(0, 3), '2')
assert.equal(queue.getNextTrack().id, '0')
assert.equal(queue.getPreviousTrack().id, '2')
queue.setQueue([])
assert.equal(queue.getNextTrack(), null)
assert.equal(queue.getPreviousTrack(), null)
console.log('OK: sintaxis, imports, controles, favoritos, historial de 20 sin duplicados, preferencias, JSON inválido y cola circular.')
