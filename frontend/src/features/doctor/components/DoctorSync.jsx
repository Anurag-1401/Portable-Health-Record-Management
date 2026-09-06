import { useEffect, useState } from 'react'

import { AppShell } from '../../../components/layout/AppShell'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'

export default function DoctorSync() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined'
      ? navigator.onLine
      : true
  )

  const [lastChecked, setLastChecked] = useState(new Date())

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      setLastChecked(new Date())
    }

    function handleOffline() {
      setIsOnline(false)
      setLastChecked(new Date())
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  function handleRefresh() {
    setIsOnline(navigator.onLine)
    setLastChecked(new Date())
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <section>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-neutral-500">
                Offline Data
              </p>

              <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
                Sync
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
                Manage synchronization of locally queued changes
                with the Portable Health Record System.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleRefresh}
            >
              Refresh
            </Button>
          </div>
        </section>

        {/* =====================================================
            CONNECTION STATUS
        ===================================================== */}

        <Card>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Connection
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  The application uses the network connection
                  to synchronize queued changes.
                </p>
              </div>

              <Badge tone="trust">
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Current status
              </p>

              <p className="mt-1 text-sm font-medium text-neutral-900">
                {isOnline
                  ? 'Network connection available'
                  : 'Working offline'}
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                Last checked:{' '}
                {lastChecked.toLocaleString()}
              </p>
            </div>

            {!isOnline && (
              <div className="rounded-lg border border-neutral-200 p-4">
                <p className="text-sm font-medium text-neutral-800">
                  Offline mode is active
                </p>

                <p className="mt-1 text-sm leading-6 text-neutral-500">
                  Changes made while offline can remain in the
                  local sync queue. They are synchronized when
                  network connectivity becomes available.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* =====================================================
            SYNC ARCHITECTURE
        ===================================================== */}

        <Card>
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Synchronization
              </h2>

              <p className="mt-1 text-sm leading-6 text-neutral-500">
                Synchronization follows the application's
                offline-first architecture.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <SyncStep
                number="1"
                title="Local changes"
                description="Changes made while offline are stored locally instead of being lost."
              />

              <SyncStep
                number="2"
                title="Sync queue"
                description="Pending writes are placed into the local synchronization queue."
              />

              <SyncStep
                number="3"
                title="Network restored"
                description="When connectivity returns, the sync process can submit queued writes to the backend."
              />

              <SyncStep
                number="4"
                title="Conflict handling"
                description="Normal fields follow last-write-wins while critical fields are flagged for manual review."
              />
            </div>
          </div>
        </Card>

        {/* =====================================================
            QUEUE STATUS
        ===================================================== */}

        <Card>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Sync Queue
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Locally queued writes are processed by the
                  application's sync service.
                </p>
              </div>

              <Badge tone="trust">
                Managed automatically
              </Badge>
            </div>

            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="text-sm font-medium text-neutral-800">
                Automatic synchronization
              </p>

              <p className="mt-1 text-sm leading-6 text-neutral-500">
                The network-status layer triggers the sync queue
                when connectivity is restored. This page does not
                bypass the application's sync queue.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SyncInfo
                label="Storage"
                value="IndexedDB"
              />

              <SyncInfo
                label="Queue"
                value="Local"
              />

              <SyncInfo
                label="Conflict"
                value="LWW / Review"
              />
            </div>
          </div>
        </Card>

        {/* =====================================================
            CONFLICT RESOLUTION
        ===================================================== */}

        <Card>
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Conflict Resolution
              </h2>

              <p className="mt-1 text-sm leading-6 text-neutral-500">
                Conflicts are handled according to field
                sensitivity rather than blindly overwriting
                every value.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-neutral-200 p-4">
                <Badge tone="trust">
                  Last-write-wins
                </Badge>

                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  Non-critical fields can use the latest valid
                  write when changes are synchronized.
                </p>
              </div>

              <div className="rounded-lg border border-neutral-200 p-4">
                <Badge tone="critical">
                  Manual review
                </Badge>

                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  Critical medical fields are flagged when
                  conflicting changes require human review.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* =====================================================
            SECURITY INFORMATION
        ===================================================== */}

        <Card>
          <div className="flex items-start gap-3">
            <Badge tone="trust">
              Secure
            </Badge>

            <div>
              <p className="text-sm font-medium text-neutral-800">
                Backend synchronization remains authoritative
              </p>

              <p className="mt-1 text-sm leading-6 text-neutral-500">
                Local storage and the sync queue support offline
                operation. Server-side authorization and record
                validation remain authoritative when data is
                synchronized.
              </p>
            </div>
          </div>
        </Card>

      </div>
    </AppShell>
  )
}


/* ============================================================
   Sync Step
============================================================ */

function SyncStep({
  number,
  title,
  description,
}) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700">
          {number}
        </div>

        <h3 className="text-sm font-semibold text-neutral-800">
          {title}
        </h3>
      </div>

      <p className="mt-2 text-xs leading-5 text-neutral-500">
        {description}
      </p>
    </div>
  )
}


/* ============================================================
   Sync Information
============================================================ */

function SyncInfo({
  label,
  value,
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-neutral-900">
        {value}
      </p>
    </div>
  )
}
