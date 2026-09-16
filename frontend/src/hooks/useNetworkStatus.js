import { useEffect, useState } from 'react'
import { Network } from '@capacitor/network'
import { isNativePlatform } from '../lib/platform'
import { processSyncQueue } from '../lib/syncQueue'
import { apiClient } from '../lib/apiClient'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    () => navigator.onLine
  )

  useEffect(() => {
    let removeListener

    async function syncNow() {
      try {
        console.log('🔄 Starting sync check...')
        const results = await processSyncQueue(apiClient)
        console.log('✅ Sync check completed:', results)
      } catch (error) {
        console.error('❌ Sync check failed:', error)
      }
    }

    async function setup() {
      if (isNativePlatform()) {
        const status = await Network.getStatus()

        setIsOnline(status.connected)

        if (status.connected) {
          await syncNow()
        }

        const listener =
          await Network.addListener(
            'networkStatusChange',
            (status) => {
              console.log(
                '🌐 Network changed:',
                status.connected
              )

              setIsOnline(status.connected)

              if (status.connected) {
                syncNow()
              }
            }
          )

        removeListener = () => listener.remove()
      } else {
        const online = navigator.onLine

        setIsOnline(online)

        // IMPORTANT:
        // Sync immediately when the app starts
        // if the browser is already online.
        if (online) {
          syncNow()
        }

        const handleOnline = () => {
          console.log('🌐 Browser is online')
          setIsOnline(true)
          syncNow()
        }

        const handleOffline = () => {
          console.log('🔴 Browser is offline')
          setIsOnline(false)
        }

        window.addEventListener(
          'online',
          handleOnline
        )

        window.addEventListener(
          'offline',
          handleOffline
        )

        removeListener = () => {
          window.removeEventListener(
            'online',
            handleOnline
          )

          window.removeEventListener(
            'offline',
            handleOffline
          )
        }
      }
    }

    setup()

    return () => {
      removeListener?.()
    }
  }, [])

  return isOnline
}