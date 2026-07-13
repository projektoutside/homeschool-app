import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import './gameAssetDelivery.css'

export type GameAssetStatus =
  | 'unknown'
  | 'pending'
  | 'downloading'
  | 'transferring'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'waiting_for_wifi'
  | 'not_installed'
  | 'requires_user_confirmation'

export interface GameAssetState {
  status: GameAssetStatus
  installed: boolean
  bytesDownloaded: number
  totalBytes: number
  percent: number
  errorCode: number
}

interface GameAssetDeliveryPlugin {
  getStatus(): Promise<GameAssetState>
  startDownload(): Promise<GameAssetState>
  confirmDownload(): Promise<{ accepted: boolean }>
  addListener(
    eventName: 'downloadStateChanged',
    listener: (state: GameAssetState) => void,
  ): Promise<PluginListenerHandle>
}

interface GateElements {
  gate: HTMLElement
  message: HTMLElement
  size: HTMLElement
  progress: HTMLElement
  progressBar: HTMLProgressElement
  percent: HTMLElement
  bytes: HTMLElement
  download: HTMLButtonElement
  later: HTMLButtonElement
  retry: HTMLButtonElement
  coinCount: HTMLElement
  coins: HTMLButtonElement[]
}

const GameAssetDelivery = registerPlugin<GameAssetDeliveryPlugin>('GameAssetDelivery')

const requiredElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing game asset gate element: ${id}`)
  }
  return element as T
}

const getGateElements = (): GateElements => ({
  gate: requiredElement('game-asset-gate'),
  message: requiredElement('game-asset-gate-message'),
  size: requiredElement('game-asset-gate-size'),
  progress: requiredElement('game-asset-gate-progress'),
  progressBar: requiredElement<HTMLProgressElement>('game-asset-gate-progress-bar'),
  percent: requiredElement('game-asset-gate-percent'),
  bytes: requiredElement('game-asset-gate-bytes'),
  download: requiredElement<HTMLButtonElement>('game-asset-download'),
  later: requiredElement<HTMLButtonElement>('game-asset-later'),
  retry: requiredElement<HTMLButtonElement>('game-asset-retry'),
  coinCount: requiredElement('game-asset-coin-count'),
  coins: Array.from(document.querySelectorAll<HTMLButtonElement>('.game-asset-gate__coin')),
})

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let value = bytes
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const fractionDigits = value >= 100 || unitIndex === 0 ? 0 : 1
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: fractionDigits }).format(value)} ${units[unitIndex]}`
}

const normalizedPercent = (state: GameAssetState): number => {
  if (state.installed || state.status === 'completed') return 100
  if (state.totalBytes > 0) {
    return Math.max(0, Math.min(100, Math.round((state.bytesDownloaded / state.totalBytes) * 100)))
  }
  return Math.max(0, Math.min(100, Math.round(state.percent || 0)))
}

const setActions = (
  elements: GateElements,
  options: { download?: boolean; later?: boolean; retry?: boolean; retryLabel?: string },
) => {
  elements.download.hidden = options.download !== true
  elements.later.hidden = options.later !== true
  elements.retry.hidden = options.retry !== true
  elements.retry.textContent = options.retryLabel ?? 'Try Again'
}

const setBusy = (elements: GateElements, busy: boolean) => {
  elements.gate.setAttribute('aria-busy', String(busy))
  elements.download.disabled = busy
  elements.retry.disabled = busy
}

const renderSize = (elements: GateElements, state: GameAssetState) => {
  const total = formatBytes(state.totalBytes)
  elements.size.textContent = total
    ? `Complete learning library download: ${total}`
    : 'Google Play will confirm the exact download size before it begins.'
}

const renderProgress = (elements: GateElements, state: GameAssetState) => {
  const percent = normalizedPercent(state)
  elements.progress.hidden = false
  elements.progressBar.value = percent
  elements.percent.textContent = `${percent}%`
  const downloaded = formatBytes(state.bytesDownloaded)
  const total = formatBytes(state.totalBytes)
  elements.bytes.textContent = downloaded && total ? `${downloaded} of ${total}` : total
}

const renderStarting = (elements: GateElements, state: GameAssetState | undefined) => {
  elements.message.textContent = 'Google Play is preparing your complete learning library. Tap the floating coins while it gets ready…'
  if (state) renderSize(elements, state)
  elements.progress.hidden = false
  elements.progressBar.removeAttribute('value')
  elements.percent.textContent = 'Preparing…'
  elements.bytes.textContent = state ? formatBytes(state.totalBytes) : ''
  setActions(elements, {})
}

const renderWelcome = (elements: GateElements, state: GameAssetState) => {
  elements.message.textContent = 'To unlock every lesson, activity, and game, download the complete learning library. You can start exploring as soon as it is ready.'
  renderSize(elements, state)
  elements.progress.hidden = true
  elements.download.textContent = 'Download Full Library'
  setActions(elements, { download: true, later: true })
}

const renderDeferredState = (elements: GateElements) => {
  elements.message.textContent = 'No problem—your lightweight app is ready whenever you are. Download the complete learning library when you have a comfortable connection.'
  elements.download.textContent = 'Download When Ready'
  elements.progress.hidden = true
  setActions(elements, { download: true })
}

const renderFailure = (elements: GateElements, message: string) => {
  elements.message.textContent = message
  setActions(elements, { later: true, retry: true })
}

const renderState = (elements: GateElements, state: GameAssetState) => {
  renderSize(elements, state)
  if (state.installed || state.status === 'completed') {
    elements.message.textContent = 'Your complete learning library is ready. Opening La\'s Homeschool Hub now…'
    renderProgress(elements, { ...state, percent: 100 })
    setActions(elements, {})
    return
  }

  if (state.status === 'pending') {
    elements.message.textContent = 'Google Play is preparing your complete learning library…'
    renderProgress(elements, state)
    setActions(elements, {})
    return
  }

  if (state.status === 'downloading') {
    elements.message.textContent = 'Your learning library is downloading. Tap the floating coins while Google Play works.'
    renderProgress(elements, state)
    setActions(elements, {})
    return
  }

  if (state.status === 'transferring') {
    elements.message.textContent = 'Almost there! Google Play is safely finishing your learning library.'
    renderProgress(elements, state)
    setActions(elements, {})
    return
  }

  if (state.status === 'waiting_for_wifi') {
    elements.message.textContent = 'Your library is paused until Wi-Fi is available. Connect to Wi-Fi, or review Google Play\'s download options.'
    renderProgress(elements, state)
    setActions(elements, { later: true, retry: true, retryLabel: 'Review Download Options' })
    return
  }

  if (state.status === 'requires_user_confirmation') {
    elements.message.textContent = 'Google Play needs one more confirmation before the learning library can continue.'
    renderProgress(elements, state)
    setActions(elements, { later: true, retry: true, retryLabel: 'Continue with Google Play' })
    return
  }

  if (state.status === 'failed') {
    renderFailure(elements, 'The download paused before finishing. Check your connection and storage, then try again.')
    return
  }

  if (state.status === 'canceled') {
    renderFailure(elements, 'The download was canceled. Your progress is safe, and you can restart whenever you are ready.')
    return
  }

  renderWelcome(elements, state)
}

const errorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return 'The learning library is unavailable right now. Check Google Play and your connection, then try again.'
}

const bindCoinButtons = (elements: GateElements, signal: AbortSignal) => {
  let collected = 0
  for (const coin of elements.coins) {
    coin.addEventListener('click', () => {
      collected += 1
      elements.coinCount.textContent = String(collected)
      coin.classList.remove('is-collected')
      void coin.offsetWidth
      coin.classList.add('is-collected')
      window.setTimeout(() => coin.classList.remove('is-collected'), 380)
    }, { signal })
  }
}

export async function initializeGameAssetGate(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return

  const elements = getGateElements()
  const controller = new AbortController()
  let listener: PluginListenerHandle | undefined
  let currentState: GameAssetState | undefined
  let downloadRequestInFlight = false
  let finished = false
  let resolveReady: (() => void) | undefined
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve
  })

  elements.gate.hidden = false
  bindCoinButtons(elements, controller.signal)

  const finishReady = () => {
    if (finished) return
    finished = true
    elements.gate.hidden = true
    controller.abort()
    void listener?.remove()
    resolveReady?.()
  }

  const applyState = (state: GameAssetState) => {
    currentState = state
    renderState(elements, state)
    if (state.installed || state.status === 'completed') {
      window.setTimeout(finishReady, 450)
    }
  }

  const startDownload = async () => {
    if (downloadRequestInFlight || finished) return
    downloadRequestInFlight = true
    setBusy(elements, true)
    renderStarting(elements, currentState)
    const statusPollingTimer = window.setInterval(() => {
      void GameAssetDelivery.getStatus().then(applyState).catch(() => {
        // The active fetch remains authoritative when a transient status poll fails.
      })
    }, 750)
    try {
      applyState(await GameAssetDelivery.startDownload())
    } catch (error) {
      renderFailure(elements, errorMessage(error))
    } finally {
      window.clearInterval(statusPollingTimer)
      downloadRequestInFlight = false
      setBusy(elements, false)
    }
  }

  const confirmOrRetry = async () => {
    if (currentState?.status !== 'requires_user_confirmation' && currentState?.status !== 'waiting_for_wifi') {
      await startDownload()
      return
    }

    setBusy(elements, true)
    try {
      const result = await GameAssetDelivery.confirmDownload()
      if (result.accepted) {
        applyState(await GameAssetDelivery.getStatus())
      } else {
        renderFailure(elements, 'The download is still paused. You can continue whenever you are ready.')
      }
    } catch (error) {
      renderFailure(elements, errorMessage(error))
    } finally {
      setBusy(elements, false)
    }
  }

  elements.download.addEventListener('click', () => void startDownload(), { signal: controller.signal })
  elements.retry.addEventListener('click', () => void confirmOrRetry(), { signal: controller.signal })
  elements.later.addEventListener('click', () => renderDeferredState(elements), { signal: controller.signal })

  try {
    listener = await GameAssetDelivery.addListener('downloadStateChanged', applyState)
    applyState(await GameAssetDelivery.getStatus())
  } catch (error) {
    renderFailure(elements, errorMessage(error))
  }

  if (finished) return
  return ready
}
