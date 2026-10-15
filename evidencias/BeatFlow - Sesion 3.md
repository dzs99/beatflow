# BeatFlow - Sesion 3

## Reproductor musical — v0.3.0

Este documento reúne el código nuevo y los cambios aplicados para la clase del 28 de septiembre de 2026, contrastados con la grabación y el PDF de correcciones. El alcance termina en el reproductor y la cola de esta sesión; no agrega favoritos persistentes ni LocalStorage.
  
En `js/config.js`, deja tu propia API Key de Audius en `apiKey`. No se incluyó ninguna credencial privada.

## 1. SDK Audius en `index.html`

Se carga después de Tailwind y antes del módulo principal:

```html
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <script src="https://cdn.jsdelivr.net/npm/@audius/sdk@latest/dist/sdk.min.js"></script>
```

La versión visible en el sidebar se actualizó a `v0.3.0`:

```html
          class="mt-auto rounded-2xl border border-white/10
                 bg-zinc-900/80 p-4"
        >
          <p class="font-semibold">BeatFlow v0.3.0</p>
          <p class="mt-1 text-sm text-zinc-500">
```

## 2. Configuración base faltante: `js/config.js`

```javascript
export const APP_CONFIG = {
  audius: {
    apiKey: 'REEMPLAZA_CON_TU_API_KEY',
  },

  search: {
    minLength: 2,
    limit: 20,
  },

  trending: {
    limit: 12,
    time: 'week',
  },
}
```

## 3. Audius API: `js/api/audius.api.js`

Incluye las consultas que necesita la app, normaliza `isStreamable` y crea la URL de streaming de la clase.

```javascript
import { APP_CONFIG } from '../config.js'

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80'

let client = null

function getClient() {
  if (client) return client

  if (!window.audiusSdk) {
    throw new Error('Audius SDK is not loaded.')
  }

  if (
    !APP_CONFIG.audius.apiKey ||
    APP_CONFIG.audius.apiKey === 'REEMPLAZA_CON_TU_API_KEY'
  ) {
    throw new Error('Audius API Key is not configured.')
  }

  client = window.audiusSdk({
    apiKey: APP_CONFIG.audius.apiKey,
  })

  return client
}

function formatDuration(seconds = 0) {
  const safeSeconds = Number.isFinite(seconds) ? seconds : 0
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = Math.floor(safeSeconds % 60)

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function normalizeArtwork(artwork) {
  return (
    artwork?._480x480 ||
    artwork?._1000x1000 ||
    artwork?._150x150 ||
    FALLBACK_COVER
  )
}

function normalizeTrack(track) {
  return {
    id: track.id,
    title: track.title || 'Sin título',
    artist: track.user?.name || 'Artista desconocido',
    genre: track.genre || 'Unknown',
    duration: formatDuration(track.duration),
    durationSeconds: track.duration || 0,
    cover: normalizeArtwork(track.artwork),
    playCount: track.playCount || 0,
    favoriteCount: track.favoriteCount || 0,
    permalink: track.permalink || '',
    isStreamable:
      track.isStreamable
      ?? track.is_streamable
      ?? true,
  }
}

export async function getTrendingTracks() {
  const audius = getClient()

  const response = await audius.tracks.getTrendingTracks({
    time: APP_CONFIG.trending.time,
    limit: APP_CONFIG.trending.limit,
  })

  return (response.data || []).map(normalizeTrack)
}

export async function searchTracks(query) {
  const normalizedQuery = query.trim()

  if (normalizedQuery.length < APP_CONFIG.search.minLength) {
    return []
  }

  const audius = getClient()

  const response = await audius.tracks.searchTracks({
    query: normalizedQuery,
    limit: APP_CONFIG.search.limit,
    sortMethod: 'relevant',
  })

  return (response.data || []).map(normalizeTrack)
}

export function getTrackStreamUrl(trackId) {
  if (!trackId) {
    throw new Error('Track id is required.')
  }

  const apiKey = APP_CONFIG.audius.apiKey
  const params = new URLSearchParams()

  if (
    apiKey &&
    apiKey !== 'REEMPLAZA_CON_TU_API_KEY'
  ) {
    params.set('api_key', apiKey)
  }

  const baseUrl =
    `https://api.audius.co/v1/tracks/${encodeURIComponent(trackId)}/stream`

  const query = params.toString()

  return query
    ? `${baseUrl}?${query}`
    : baseUrl
}
```

## 4. Nuevo servicio de audio: `js/services/player.service.js`

```javascript
const audio = new Audio()

audio.preload = 'metadata'
audio.volume = 0.7

const listeners = new Map()

function emit(eventName, payload) {
  const handlers =
    listeners.get(eventName)
    || []

  handlers.forEach(
    (handler) =>
      handler(payload),
  )
}

function bindNativeEvents() {
  audio.addEventListener(
    'loadedmetadata',
    () => {
      emit('metadata', {
        duration:
          Number.isFinite(audio.duration)
            ? audio.duration
            : 0,
      })
    },
  )

  audio.addEventListener(
    'timeupdate',
    () => {
      emit('timeupdate', {
        currentTime: audio.currentTime,
        duration:
          Number.isFinite(audio.duration)
            ? audio.duration
            : 0,
      })
    },
  )

  audio.addEventListener(
    'play',
    () => emit('play'),
  )

  audio.addEventListener(
    'pause',
    () => emit('pause'),
  )

  audio.addEventListener(
    'ended',
    () => emit('ended'),
  )

  audio.addEventListener(
    'error',
    () => {
      emit('error', audio.error)
    },
  )

  audio.addEventListener(
    'volumechange',
    () => {
      emit('volumechange', {
        volume: audio.volume,
      })
    },
  )
}

bindNativeEvents()

export function onPlayerEvent(eventName, handler) {
  const handlers =
    listeners.get(eventName)
    || []

  handlers.push(handler)
  listeners.set(eventName, handlers)
}

export function loadAudio(streamUrl) {
  audio.pause()
  audio.src = streamUrl
  audio.load()
}

export async function playAudio() {
  await audio.play()
}

export function pauseAudio() {
  audio.pause()
}

export function toggleAudio() {
  if (audio.paused) {
    return playAudio()
  }

  pauseAudio()
  return Promise.resolve()
}

export function seekAudio(seconds) {
  if (!Number.isFinite(seconds)) {
    return
  }

  audio.currentTime = Math.max(
    0,
    Math.min(
      seconds,
      audio.duration || seconds,
    ),
  )
}

export function setVolume(volume) {
  const safeVolume = Math.max(
    0,
    Math.min(1, volume),
  )

  audio.volume = safeVolume
}

export function getPlayerSnapshot() {
  return {
    paused: audio.paused,
    currentTime: audio.currentTime,
    duration:
      Number.isFinite(audio.duration)
        ? audio.duration
        : 0,
    volume: audio.volume,
  }
}
```

## 5. Nuevo servicio de cola: `js/services/queue.service.js`

```javascript
let queue = []
let currentIndex = -1

export function setQueue(
  tracks,
  selectedTrackId = null,
) {
  queue = [...tracks]

  if (queue.length === 0) {
    currentIndex = -1
    return
  }

  if (!selectedTrackId) {
    currentIndex = 0
    return
  }

  const index = queue.findIndex(
    (track) =>
      track.id === selectedTrackId,
  )

  currentIndex = index >= 0 ? index : 0
}

export function getCurrentTrack() {
  return queue[currentIndex] || null
}

export function getNextTrack() {
  if (queue.length === 0) {
    return null
  }

  currentIndex = (currentIndex + 1) % queue.length

  return getCurrentTrack()
}

export function getPreviousTrack() {
  if (queue.length === 0) {
    return null
  }

  currentIndex -= 1

  if (currentIndex < 0) {
    currentIndex = queue.length - 1
  }

  return getCurrentTrack()
}

export function getQueueSnapshot() {
  return {
    tracks: [...queue],
    currentIndex,
    currentTrack: getCurrentTrack(),
  }
}
```

## 6. Nueva UI del reproductor: `js/ui/player.ui.js`

```javascript
function formatTime(seconds = 0) {
  if (!Number.isFinite(seconds)) {
    return '0:00'
  }

  const minutes = Math.floor(seconds / 60)
  const remaining = Math.floor(seconds % 60)

  return `${minutes}:${String(remaining).padStart(2, '0')}`
}

export function createPlayerUI() {
  const cover = document.querySelector('#player-cover')
  const title = document.querySelector('#player-title')
  const artist = document.querySelector('#player-artist')
  const playButton = document.querySelector('#play-button')
  const currentTime = document.querySelector('#current-time')
  const durationTime = document.querySelector('#duration-time')
  const progress = document.querySelector('#progress-range')
  const volume = document.querySelector('#volume-range')

  function renderTrack(track) {
    if (!track) {
      return
    }

    cover.src = track.cover
    cover.alt = `Portada de ${track.title}`
    title.textContent = track.title
    artist.textContent = track.artist
  }

  function renderPlaying(isPlaying) {
    playButton.textContent = isPlaying ? '❚❚' : '▶'
    playButton.setAttribute(
      'aria-label',
      isPlaying ? 'Pausar' : 'Reproducir',
    )
  }

  function renderProgress({
    currentTime: current,
    duration,
  }) {
    const safeDuration = duration > 0 ? duration : 0

    currentTime.textContent = formatTime(current)
    durationTime.textContent = formatTime(safeDuration)
    progress.max = String(safeDuration || 100)
    progress.value = String(current || 0)
  }

  function renderVolume(value) {
    volume.value = String(value)
  }

  return {
    renderTrack,
    renderPlaying,
    renderProgress,
    renderVolume,
  }
}
```

## 7. Reproductor en `index.html`

Este bloque reemplaza el player visual anterior. Contiene los controles con los IDs que usa `app.js` y el rango de volumen en escala `0..1`.

```html
  <footer
    class="fixed inset-x-0 bottom-[68px] z-40 border-t
           border-white/10 bg-zinc-950/95 backdrop-blur
           lg:bottom-0 lg:left-[250px]"
  >
    <div
      class="grid min-h-[96px] grid-cols-[1fr_auto]
             items-center gap-4 px-4 py-3
             md:grid-cols-[1fr_1.4fr_1fr] md:px-6"
    >

      <div class="flex min-w-0 items-center gap-3">
        <img
          id="player-cover"
          src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=160&q=80"
          alt="Portada actual"
          class="h-14 w-14 rounded-xl object-cover"
        >

        <div class="min-w-0">
          <p id="player-title" class="truncate text-sm font-semibold">
            Selecciona una canción
          </p>

          <p id="player-artist" class="truncate text-xs text-zinc-500">
            BeatFlow
          </p>
        </div>
      </div>

      <div class="flex flex-col items-center gap-2">
        <div class="flex items-center gap-4">
          <button
            id="previous-button"
            type="button"
            class="text-zinc-400 transition hover:text-white"
            aria-label="Canción anterior"
          >
            ◀
          </button>

          <button
            id="play-button"
            type="button"
            class="grid h-11 w-11 place-items-center rounded-full
                   bg-white text-black transition hover:scale-105"
            aria-label="Reproducir"
          >
            ▶
          </button>

          <button
            id="next-button"
            type="button"
            class="text-zinc-400 transition hover:text-white"
            aria-label="Siguiente canción"
          >
            ▶
          </button>
        </div>

        <div class="hidden w-full items-center gap-3 md:flex">
          <span id="current-time" class="w-10 text-right text-xs text-zinc-500">
            0:00
          </span>

          <input
            id="progress-range"
            class="player-range flex-1"
            type="range"
            min="0"
            max="100"
            value="0"
            step="0.1"
            aria-label="Progreso de reproducción"
          >

          <span id="duration-time" class="w-10 text-xs text-zinc-500">
            0:00
          </span>
        </div>
      </div>

      <div class="hidden items-center justify-end gap-3 md:flex">
        <span aria-hidden="true">🔊</span>

        <input
          id="volume-range"
          class="player-range w-28"
          type="range"
          min="0"
          max="1"
          value="0.7"
          step="0.05"
          aria-label="Volumen"
        >
      </div>

    </div>
  </footer>
```

## 8. Estilos para los rangos: `css/styles.css`

```css
.player-range {
  appearance: none;
  height: 0.375rem;
  border-radius: 999px;
  background: var(--color-bg-tertiary);
  accent-color: var(--color-brand-primary);
}

.player-range::-webkit-slider-thumb {
  appearance: none;
  width: 0.875rem;
  height: 0.875rem;
  border-radius: 999px;
  background: white;
  cursor: pointer;
}

.player-range::-moz-range-thumb {
  width: 0.875rem;
  height: 0.875rem;
  border: 0;
  border-radius: 999px;
  background: white;
  cursor: pointer;
}

.player-range:focus-visible {
  outline: 2px solid var(--color-brand-primary);
  outline-offset: 4px;
}
```

## 9. Cambio de versión en `js/ui/home.ui.js`

```html
          <span
            class="inline-flex rounded-full border border-violet-400/30
                   bg-violet-400/10 px-3 py-1 text-xs font-semibold
                   text-violet-300"
          >
            BeatFlow · v0.3.0
          </span>
```

La tarjeta ya tenía `type="button"` y la clase `px-2.5`; ambas quedan conforme a las correcciones.

## 10. Integración y correcciones: `js/app.js`

Este archivo conecta la búsqueda con la colección activa, configura la cola, reproduce el stream con `HTMLAudioElement` y sincroniza controles mediante eventos reales. También guarda `searchQuery`, espera `playTrack()` y muestra el error de reproducción solicitado en las correcciones.

```javascript
import {
  getTrackStreamUrl,
  getTrendingTracks,
  searchTracks,
} from './api/audius.api.js'

import {
  getNextTrack,
  getPreviousTrack,
  setQueue,
} from './services/queue.service.js'

import {
  getPlayerSnapshot,
  loadAudio,
  onPlayerEvent,
  playAudio,
  seekAudio,
  setVolume,
  toggleAudio,
} from './services/player.service.js'

import { renderHome } from './ui/home.ui.js'
import { createPlayerUI } from './ui/player.ui.js'
import { renderSearch } from './ui/search.ui.js'
import {
  renderEmpty,
  renderError,
  renderLoading,
} from './ui/states.ui.js'

const app = document.querySelector('#app')
const globalSearch = document.querySelector('#global-search')
const playButton = document.querySelector('#play-button')
const previousButton = document.querySelector('#previous-button')
const nextButton = document.querySelector('#next-button')
const progressRange = document.querySelector('#progress-range')
const volumeRange = document.querySelector('#volume-range')

const playerUI = createPlayerUI()

const state = {
  currentView: 'home',
  currentTrack: null,
  trendingTracks: [],
  searchQuery: '',
  searchResults: [],
  isPlaying: false,
}

async function initializeApp() {
  registerNavigationEvents()
  registerGlobalEvents()
  registerPlayerEvents()

  setVolume(Number(volumeRange.value))

  await loadHome()
}

async function loadHome() {
  state.currentView = 'home'

  renderLoading({
    target: app,
    message: 'Cargando tendencias...',
  })

  updateNavigationStyles()

  try {
    state.trendingTracks = await getTrendingTracks()

    renderHome({
      target: app,
      trendingTracks: state.trendingTracks,
      recentlyPlayedTracks: state.trendingTracks.slice(0, 4),
    })
  } catch (error) {
    console.error(error)

    renderError({
      target: app,
      message: 'No fue posible cargar las tendencias.',
      onRetry: loadHome,
    })
  }
}

async function executeSearch(query) {
  const normalizedQuery = query.trim()

  state.currentView = 'search'
  state.searchQuery = normalizedQuery
  updateNavigationStyles()

  if (normalizedQuery.length < 2) {
    renderEmpty({
      target: app,
      title: 'Busca música',
      message: 'Escribe al menos 2 caracteres.',
    })
    return
  }

  renderLoading({
    target: app,
    message: `Buscando “${normalizedQuery}”...`,
  })

  try {
    state.searchResults = await searchTracks(normalizedQuery)

    if (state.searchResults.length === 0) {
      renderEmpty({
        target: app,
        title: 'Sin resultados',
        message: `No encontramos canciones para “${normalizedQuery}”.`,
      })
      return
    }

    renderSearch({
      target: app,
      query: normalizedQuery,
      tracks: state.searchResults,
    })
  } catch (error) {
    console.error(error)

    renderError({
      target: app,
      message: 'No fue posible completar la búsqueda.',
      onRetry: () => executeSearch(normalizedQuery),
    })
  }
}

function getActiveCollection() {
  if (
    state.currentView === 'search'
    && state.searchResults.length > 0
  ) {
    return state.searchResults
  }

  return state.trendingTracks
}

async function playTrack(trackId) {
  const tracks = getActiveCollection()
  const track = tracks.find((item) => item.id === trackId)

  if (!track) {
    return
  }

  if (track.isStreamable === false) {
    alert('Esta canción no está disponible para streaming.')
    return
  }

  setQueue(tracks, track.id)

  await loadAndPlayTrack(track)
}

async function loadAndPlayTrack(track) {
  try {
    state.currentTrack = track
    playerUI.renderTrack(track)

    const streamUrl = getTrackStreamUrl(track.id)

    loadAudio(streamUrl)
    await playAudio()
  } catch (error) {
    console.error(error)

    alert('No fue posible reproducir esta canción.')
  }
}

async function playNextTrack() {
  const track = getNextTrack()

  if (!track) {
    return
  }

  await loadAndPlayTrack(track)
}

async function playPreviousTrack() {
  const snapshot = getPlayerSnapshot()

  if (snapshot.currentTime > 3) {
    seekAudio(0)
    return
  }

  const track = getPreviousTrack()

  if (!track) {
    return
  }

  await loadAndPlayTrack(track)
}

function registerPlayerEvents() {
  onPlayerEvent('play', () => {
    state.isPlaying = true
    playerUI.renderPlaying(true)
  })

  onPlayerEvent('pause', () => {
    state.isPlaying = false
    playerUI.renderPlaying(false)
  })

  onPlayerEvent('timeupdate', (payload) => {
    playerUI.renderProgress(payload)
  })

  onPlayerEvent('metadata', ({ duration }) => {
    playerUI.renderProgress({
      currentTime: 0,
      duration,
    })
  })

  onPlayerEvent('volumechange', ({ volume }) => {
    playerUI.renderVolume(volume)
  })

  onPlayerEvent('ended', playNextTrack)

  onPlayerEvent('error', (error) => {
    console.error('Audio error:', error)
    alert('No fue posible reproducir esta canción.')
  })
}

function registerNavigationEvents() {
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.view

      if (view === 'home') {
        loadHome()
        return
      }

      if (view === 'search') {
        state.currentView = 'search'
        updateNavigationStyles()
        globalSearch.focus()

        renderEmpty({
          target: app,
          title: 'Busca música',
          message: 'Escribe una canción o artista.',
        })
        return
      }

      if (view === 'library') {
        state.currentView = 'library'
        updateNavigationStyles()

        renderEmpty({
          target: app,
          title: 'Biblioteca disponible en Sesión 4',
          message: 'Aquí tendremos favoritos e historial.',
        })
      }
    })
  })
}

function registerGlobalEvents() {
  globalSearch.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    executeSearch(globalSearch.value)
  })

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('.play-track')

    if (!button) {
      return
    }

    await playTrack(button.dataset.trackId)
  })

  playButton.addEventListener('click', async () => {
    if (!state.currentTrack) {
      return
    }

    try {
      await toggleAudio()
    } catch (error) {
      console.error('No fue posible cambiar la reproducción:', error)
    }
  })

  previousButton.addEventListener('click', playPreviousTrack)
  nextButton.addEventListener('click', playNextTrack)

  progressRange.addEventListener('input', () => {
    seekAudio(Number(progressRange.value))
  })

  volumeRange.addEventListener('input', () => {
    setVolume(Number(volumeRange.value))
  })
}

function updateNavigationStyles() {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle(
      'nav-item-active',
      item.dataset.view === state.currentView,
    )
  })

  document.querySelectorAll('.mobile-nav-item').forEach((item) => {
    item.classList.toggle(
      'mobile-nav-active',
      item.dataset.view === state.currentView,
    )
  })
}

initializeApp()
```

## Nota de ejecución

La API Key de `js/config.js` sigue como marcador `REEMPLAZA_CON_TU_API_KEY`. Sin una clave válida, Audius no puede proporcionar tendencias ni búsquedas; la conexión del reproductor queda preparada, pero la reproducción requiere que primero carguen canciones.

