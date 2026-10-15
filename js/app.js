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
  pauseAudio,
  playAudio,
  seekAudio,
  setVolume,
  toggleAudio,
} from './services/player.service.js'

import { renderHome } from './ui/home.ui.js'
import { createPlayerUI } from './ui/player.ui.js'
import { renderSearch } from './ui/search.ui.js'
import { renderLibrary } from './ui/library.ui.js'
import {
  addToHistory,
  getFavorites,
  getHistory,
  getLastTrack,
  getVolume,
  isFavorite,
  saveLastTrack,
  saveVolume,
  toggleFavorite,
} from './services/storage.service.js'
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
const playerFavoriteButton = document.querySelector('#player-favorite-button')

const playerUI = createPlayerUI()

const state = {
  currentView: 'home',
  currentTrack: null,
  trendingTracks: [],
  searchQuery: '',
  searchResults: [],
  favorites: [],
  history: [],
  isPlaying: false,
}
let loadedTrackId = null

async function initializeApp() {
  state.favorites = getFavorites()
  state.history = getHistory()
  const savedVolume = getVolume()
  setVolume(savedVolume)
  playerUI.renderVolume(savedVolume)
  registerNavigationEvents()
  registerGlobalEvents()
  registerPlayerEvents()

  await loadHome()
  restoreLastTrack()
}

function restoreLastTrack() {
  const track = getLastTrack()
  if (!track) return
  state.currentTrack = track
  playerUI.renderTrack(track)
  playerUI.renderFavorite(isFavorite(track.id))
  playerUI.renderProgress({ currentTime: 0, duration: track.durationSeconds || 0 })
  setQueue([...new Map(getAllKnownTracks().map((item) => [item.id, item])).values()], track.id)
}

function getAllKnownTracks() {
  return [
    ...state.trendingTracks,
    ...state.searchResults,
    ...state.favorites,
    ...state.history,
    ...(state.currentTrack ? [state.currentTrack] : []),
  ]
}

function updateFavoriteButtons() {
  document.querySelectorAll('.favorite-track[data-track-id]').forEach((button) => {
    const favorite = isFavorite(button.dataset.trackId)
    button.textContent = favorite ? '♥' : '♡'
    button.setAttribute('aria-pressed', String(favorite))
    button.setAttribute('aria-label', favorite ? 'Quitar de favoritos' : 'Agregar a favoritos')
  })
}

function handleFavorite(trackId) {
  const track = getAllKnownTracks().find((item) => item.id === trackId)
  if (!track) return
  state.favorites = toggleFavorite(track)
  if (state.currentTrack?.id === track.id) {
    playerUI.renderFavorite(isFavorite(track.id))
  }
  if (state.currentView === 'library') renderLibraryView()
  updateFavoriteButtons()
}

function renderLibraryView() {
  state.currentView = 'library'
  state.favorites = getFavorites()
  state.history = getHistory()
  renderLibrary({ target: app, favorites: state.favorites, history: state.history })
  updateNavigationStyles()
  updateFavoriteButtons()
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
      recentlyPlayedTracks: state.history,
    })
    updateFavoriteButtons()
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
    updateFavoriteButtons()
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
  if (state.currentView === 'library') {
    return [...new Map([...state.favorites, ...state.history].map((track) => [track.id, track])).values()]
  }
  if (
    state.currentView === 'search'
    && state.searchResults.length > 0
  ) {
    return state.searchResults
  }

  return state.trendingTracks
}

async function playTrack(trackId) {
  let tracks = getActiveCollection()
  let track = tracks.find((item) => item.id === trackId)
  if (!track && state.currentView === 'home') {
    tracks = state.history
    track = tracks.find((item) => item.id === trackId)
  }

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
    loadedTrackId = track.id
    state.history = addToHistory(track)
    saveLastTrack(track)
    playerUI.renderFavorite(isFavorite(track.id))
    if (state.currentView === 'library') renderLibraryView()
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
        renderLibraryView()
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
    const favoriteButton = event.target.closest('.favorite-track[data-track-id]')
    if (favoriteButton) {
      handleFavorite(favoriteButton.dataset.trackId)
      return
    }
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
      if (loadedTrackId !== state.currentTrack.id) {
        const tracks = [...new Map(getAllKnownTracks().map((track) => [track.id, track])).values()]
        setQueue(tracks, state.currentTrack.id)
        await loadAndPlayTrack(state.currentTrack)
      } else {
        await toggleAudio()
      }
    } catch (error) {
      console.error('No fue posible cambiar la reproducción:', error)
    }
  })

  previousButton.addEventListener('click', playPreviousTrack)
  nextButton.addEventListener('click', playNextTrack)
  playerFavoriteButton.addEventListener('click', () => {
    if (state.currentTrack) handleFavorite(state.currentTrack.id)
  })

  progressRange.addEventListener('input', () => {
    seekAudio(Number(progressRange.value))
  })

  volumeRange.addEventListener('input', () => {
    const volume = Number(volumeRange.value)
    setVolume(volume)
    saveVolume(volume)
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
