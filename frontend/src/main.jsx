import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import api, { bootstrapApiConfig } from './api/api'
import ErrorBoundary from './components/ErrorBoundary'

function Root() {
  const [online, setOnline] = useState(navigator.onLine)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [updateReady, setUpdateReady] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [apiReady, setApiReady] = useState(false)
  const skipWaitingPostedRef = useRef(false)

  useEffect(() => {
    bootstrapApiConfig().finally(() => setApiReady(true))
  }, [])

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }
    const onAppInstalled = () => setDeferredPrompt(null)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined

    let updateInterval
    const onControllerChange = () => {
      if (skipWaitingPostedRef.current) window.location.reload()
    }
    const onSwMessage = (event) => {
      if (event.data?.type === 'SYNC_STATUS') {
        setSyncMessage(event.data.message)
        window.setTimeout(() => setSyncMessage(''), 4000)
      }
    }
    const registerWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        if (registration.waiting) setUpdateReady(true)
        registration.addEventListener('updatefound', () => {
          const nextWorker = registration.installing
          if (!nextWorker) return
          nextWorker.addEventListener('statechange', () => {
            if (nextWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateReady(true)
            }
          })
        })
        updateInterval = window.setInterval(() => registration.update().catch(() => {}), 60000)
      } catch {
        // ignore registration issues
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    navigator.serviceWorker.addEventListener('message', onSwMessage)

    if (document.readyState === 'complete') {
      registerWorker()
    } else {
      window.addEventListener('load', registerWorker, { once: true })
    }

    return () => {
      if (updateInterval) window.clearInterval(updateInterval)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      navigator.serviceWorker.removeEventListener('message', onSwMessage)
      window.removeEventListener('load', registerWorker)
    }
  }, [])

  useEffect(() => {
    api.defaults.headers.common['X-Client-Mode'] = online ? 'online' : 'offline'
  }, [online])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    setDeferredPrompt(null)
  }

  const handleUpdate = async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration?.waiting) {
      skipWaitingPostedRef.current = true
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    } else {
      window.location.reload()
    }
  }

  return (
    <>
      {!online && (
        <div className="fixed inset-x-0 top-0 z-50 bg-amber-500 py-2 text-center text-sm text-white">
          Tryb offline — zmiany zostaną zsynchronizowane po odzyskaniu połączenia.
        </div>
      )}
      {syncMessage && (
        <div className={`fixed inset-x-0 z-50 bg-emerald-600 py-2 text-center text-sm text-white ${online ? 'top-0' : 'top-10'}`}>
          {syncMessage}
        </div>
      )}
      {updateReady && (
        <div className={`fixed inset-x-0 z-50 bg-blue-600 py-2 text-center text-sm text-white ${online ? (syncMessage ? 'top-10' : 'top-0') : (syncMessage ? 'top-20' : 'top-10')}`}>
          Nowa wersja aplikacji jest gotowa.
          <button onClick={handleUpdate} className="ml-3 rounded bg-white/20 px-3 py-1 font-semibold hover:bg-white/30">
            Odśwież
          </button>
        </div>
      )}
      {deferredPrompt && (
        <button
          onClick={handleInstall}
          className="fixed bottom-20 right-4 z-50 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 md:bottom-4"
        >
          Zainstaluj aplikację
        </button>
      )}
      {apiReady && (
        <BrowserRouter>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </BrowserRouter>
      )}
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
