import { useEffect, useState } from 'react'
import { Network } from '@capacitor/network'
import { isNativePlatform } from '../lib/platform'
import { processSyncQueue } from '../lib/syncQueue'
import { apiClient } from '../lib/apiClient'

/**
 * Single source of truth for "are we online" across the app, using
 * @capacitor/network natively (more reliable than the browser's
 * navigator.onLine on flaky mobile data) and falling back to the browser
 * API on web. Also triggers a sync-queue flush the moment connectivity
 * returns — this is the "syncs automatically when connectivity returns"
 * requirement from the project brief, wired at the lowest common point so
 * every feature gets it for free just by mounting the app shell.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    let removeListener

    async function setup() {
      if (isNativePlatform()) {
        const status = await Network.getStatus()
        setIsOnline(status.connected)
        const listener = await Network.addListener('networkStatusChange', (status) => {
          setIsOnline(status.connected)
          if (status.connected) processSyncQueue(apiClient)
        })
        removeListener = () => listener.remove()
      } else {
        setIsOnline(navigator.onLine)
        const handleOnline = () => {
          setIsOnline(true)
          processSyncQueue(apiClient)
        }
        const handleOffline = () => setIsOnline(false)
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        removeListener = () => {
          window.removeEventListener('online', handleOnline)
          window.removeEventListener('offline', handleOffline)
        }
      }
    }

    setup()
    return () => removeListener?.()
  }, [])

  return isOnline
}
