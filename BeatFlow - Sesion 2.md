# Código de la última clase — BeatFlow Sesión 2

Este documento reúne solo los archivos y cambios trabajados en la clase del video. Audius todavía no queda conectado: al consultar tendencias o buscar más de un carácter aparece el estado de error que se revisó en clase. La reproducción real y la biblioteca completa quedan para sesiones posteriores.

## 1. `js/ui/search.ui.js` — nuevo

```javascript
function createSearchRow(track) {
  return `
    <article class="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl p-3 transition hover:bg-zinc-900">
      <img
        src="${track.cover}"
        alt="Portada de ${track.title}"
        class="h-16 w-16 rounded-xl object-cover"
        loading="lazy"
      >

      <div class="min-w-0">
        <h3 class="truncate font-semibold">${track.title}</h3>
        <p class="mt-1 truncate text-sm text-zinc-500">${track.artist} · ${track.genre}</p>
        <p class="mt-1 text-xs text-zinc-600">${track.duration}</p>
      </div>

      <button
        type="button"
        class="play-track grid h-11 w-11 place-items-center rounded-full bg-white text-black"
        data-track-id="${track.id}"
        aria-label="Seleccionar ${track.title}"
      >▶</button>
    </article>
  `
}

export function renderSearch({ target, query, tracks }) {
  target.innerHTML = `
    <section>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Buscar</p>
      <h1 class="mt-2 text-3xl font-bold">Resultados para “${query}”</h1>
      <p class="mt-2 text-sm text-zinc-500">${tracks.length} resultado(s)</p>

      <div class="mt-6 divide-y divide-white/5 rounded-3xl border border-white/10 bg-zinc-900/40 p-2">
        ${tracks.map(createSearchRow).join('')}
      </div>
    </section>
  `
}
```

## 2. `js/ui/states.ui.js` — estados usados por la aplicación

```javascript
export function renderLoading({
  target,
  message = 'Cargando música...',
}) {
  target.innerHTML = `
    <section class="grid min-h-[50vh] place-items-center" aria-live="polite">
      <div class="text-center">
        <div class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-zinc-800 border-t-violet-500"></div>
        <p class="mt-4 text-sm text-zinc-400">${message}</p>
      </div>
    </section>
  `
}

export function renderEmpty({
  target,
  title = 'Sin resultados',
  message = 'No encontramos contenido para mostrar.',
}) {
  target.innerHTML = `
    <section class="grid min-h-[45vh] place-items-center">
      <div class="max-w-lg text-center">
        <div class="text-5xl">♫</div>
        <h2 class="mt-4 text-2xl font-bold">${title}</h2>
        <p class="mt-3 leading-7 text-zinc-400">${message}</p>
      </div>
    </section>
  `
}

export function renderError({
  target,
  message = 'No fue posible cargar la información.',
  onRetry,
}) {
  target.innerHTML = `
    <section class="grid min-h-[45vh] place-items-center" role="alert">
      <div class="max-w-lg rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <div class="text-4xl">!</div>
        <h2 class="mt-4 text-2xl font-bold">Ocurrió un problema</h2>
        <p class="mt-3 leading-7 text-zinc-400">${message}</p>
        <button id="retry-button" type="button" class="mt-6 rounded-full bg-white px-5 py-2.5 font-semibold text-black">
          Reintentar
        </button>
      </div>
    </section>
  `

  document
    .querySelector('#retry-button')
    ?.addEventListener('click', onRetry)
}
```

## 3. `js/app.js` — integración de Inicio, búsqueda y navegación

```javascript
import {
  getTrendingTracks,
  searchTracks,
} from './api/audius.api.js'

import { renderHome } from './ui/home.ui.js'
import { renderSearch } from './ui/search.ui.js'
import {
  renderEmpty,
  renderError,
  renderLoading,
} from './ui/states.ui.js'

const app = document.querySelector('#app')
const globalSearch = document.querySelector('#global-search')
const playerTitle = document.querySelector('#player-title')
const playerArtist = document.querySelector('#player-artist')
const playerCover = document.querySelector('#player-cover')
const playButton = document.querySelector('#play-button')

const state = {
  currentView: 'home',
  currentTrack: null,
  trendingTracks: [],
  searchResults: [],
  searchQuery: '',
  isPlaying: false,
}

async function initializeApp() {
  registerNavigationEvents()
  registerGlobalEvents()
  await loadHome()
}

async function loadHome() {
  state.currentView = 'home'
  renderLoading({ target: app, message: 'Cargando tendencias...' })
  updateNavigationStyles()

  try {
    state.trendingTracks = await getTrendingTracks()

    if (state.trendingTracks.length === 0) {
      renderEmpty({
        target: app,
        title: 'No hay tendencias disponibles',
        message: 'Audios no tiene tendencias disponibles',
      })
      return
    }

    renderHome({
      target: app,
      trendingTracks: state.trendingTracks,
      recentlyPlayedTracks: state.trendingTracks.slice(0, 4),
    })

    if (!state.currentTrack) {
      state.currentTrack = state.trendingTracks[0]
      updatePlayer()
    }
  } catch (error) {
    console.error(error)
    renderError({
      target: app,
      message: 'No pudimos obtener las canciones desde Audius.',
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
      title: 'Escribe una busqueda',
      message: 'Utiliza al menos 2 caracteres para la busqueda.',
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
      message: 'La búsqueda no pudo completarse.',
      onRetry: () => executeSearch(normalizedQuery),
    })
  }
}

function renderLibraryPlaceholder() {
  state.currentView = 'library'
  updateNavigationStyles()

  renderEmpty({
    target: app,
    title: 'Proximamente...',
    message: 'Canciones Favoritas, Historial y Preferencias',
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
          title: 'Busca tu música favorita',
          message: 'Escribe una canción o artista en el buscador',
        })
        return
      }

      if (view === 'library') {
        renderLibraryPlaceholder()
      }
    })
  })
}

function registerGlobalEvents() {
  globalSearch.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    executeSearch(globalSearch.value)
  })

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.play-track')
    if (!button) return
    selectTrack(button.dataset.trackId)
  })

  playButton.addEventListener('click', () => {
    state.isPlaying = !state.isPlaying
    updatePlayer()
  })
}

function getVisibleTracks() {
  return [...state.trendingTracks, ...state.searchResults]
}

function selectTrack(trackId) {
  const track = getVisibleTracks().find((item) => item.id === trackId)
  if (!track) return

  state.currentTrack = track
  state.isPlaying = true
  updatePlayer()
}

function updatePlayer() {
  const track = state.currentTrack
  if (!track) return

  playerTitle.textContent = track.title
  playerArtist.textContent = track.artist
  playerCover.src = track.cover
  playerCover.alt = `Portada de ${track.title}`
  playButton.textContent = state.isPlaying ? '❚❚' : '▶'
  playButton.setAttribute('aria-label', state.isPlaying ? 'Pausar' : 'Reproducir')
}

function updateNavigationStyles() {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('nav-item-active', item.dataset.view === state.currentView)
  })

  document.querySelectorAll('.mobile-nav-item').forEach((item) => {
    item.classList.toggle('mobile-nav-active', item.dataset.view === state.currentView)
  })
}

initializeApp()
```

## 4. `js/ui/home.ui.js` — cambio de versión

En el distintivo de la pantalla Inicio, el texto de la versión cambia de `BeatFlow · v0.1.0` a:

```javascript
BeatFlow · v0.2.0
```

