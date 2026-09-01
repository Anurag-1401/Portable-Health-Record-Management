import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { apiClient } from '../../../lib/apiClient'

import { AppShell } from '../../../components/layout/AppShell'
import { QRDisplay } from '../../../components/qr/QRDisplay'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'

export default function PatientDashboard() {
  const { session } = useAuth()

  const [profile, setProfile] = useState(null)
  const [records, setRecords] = useState([])
  const [criticalInfo, setCriticalInfo] = useState(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [pendingConsents, setPendingConsents] = useState([])
const [isLoadingConsents, setIsLoadingConsents] = useState(false)
const [consentError, setConsentError] = useState(null)
const [processingConsentId, setProcessingConsentId] = useState(null)

  const [profileForm, setProfileForm] = useState({
    displayName: '',
    bloodGroup: '',
  })

  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isLoadingRecords, setIsLoadingRecords] = useState(true)
  const [isLoadingCritical, setIsLoadingCritical] = useState(false)
  const [activities, setActivities] = useState([])
  const [isLoadingActivity, setIsLoadingActivity] = useState(false)
  const [activityError, setActivityError] = useState(null)

  const [activityPage, setActivityPage] = useState(1)
  const ACTIVITIES_PER_PAGE = 5

  const startIndex =
    (activityPage - 1) * ACTIVITIES_PER_PAGE

  const currentActivities = activities.slice(
    startIndex,
    startIndex + ACTIVITIES_PER_PAGE
  )
  const totalActivityPages = Math.ceil(
    activities.length / ACTIVITIES_PER_PAGE
  )




  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!profile) return

    setProfileForm({
      displayName: profile.displayName ?? '',
      bloodGroup: profile.bloodGroup ?? '',
    })
  }, [profile])


  const loadProfile = useCallback(async () => {
    if (!session?.userId) return

    try {
      setIsLoadingProfile(true)

      const data = await apiClient.getMyProfile()

      setProfile(data)
    } catch (err) {
      console.error('Failed to load patient profile:', err)
      setError(err.message)
    } finally {
      setIsLoadingProfile(false)
    }
  }, [])

  useEffect(() => {
  loadProfile()
}, [loadProfile])

const handleSaveProfile = async () => {
  try {
    setIsSavingProfile(true)

    const updatedProfile =
      await apiClient.updateMyProfile(profileForm)

    setProfile(updatedProfile)
    setIsEditingProfile(false)
  } catch (err) {
    console.error('Failed to update profile:', err)
  } finally {
    setIsSavingProfile(false)
  }
}

const loadPendingConsents = useCallback(async () => {
  if (!session?.userId) return

  try {
    setIsLoadingConsents(true)
    setConsentError(null)

    const data = await apiClient.getPendingConsentRequests()

    setPendingConsents(
      Array.isArray(data)
        ? data
        : data?.consents ?? []
    )
  } catch (err) {
    console.error(
      'Failed to load pending consent requests:',
      err
    )

    setConsentError(
      err?.message ?? 'Failed to load consent requests.'
    )
  } finally {
    setIsLoadingConsents(false)
  }
}, [session?.userId])

useEffect(() => {
  if (activeTab === 'access') {
    loadPendingConsents()
  }
}, [activeTab, loadPendingConsents])

const handleCancelEdit = () => {
  if (profile) {
    setProfileForm({
      displayName: profile.displayName ?? '',
      bloodGroup: profile.bloodGroup ?? '',
      allergies: profile.allergies ?? [],
      chronicConditions: profile.chronicConditions ?? [],
    })
  }

  setIsEditingProfile(false)
}

const handleApproveConsent = async (consentId) => {
  try {
    setProcessingConsentId(consentId)
    setConsentError(null)

    await apiClient.approveConsent(consentId)

    await loadPendingConsents()
  } catch (err) {
    console.error(
      'Failed to approve consent:',
      err
    )

    setConsentError(
      err?.message ?? 'Failed to approve consent request.'
    )
  } finally {
    setProcessingConsentId(null)
  }
}

const handleDenyConsent = async (consentId) => {
  try {
    setProcessingConsentId(consentId)
    setConsentError(null)

    await apiClient.denyConsent(consentId)

    await loadPendingConsents()
  } catch (err) {
    console.error(
      'Failed to deny consent:',
      err
    )

    setConsentError(
      err?.message ?? 'Failed to deny consent request.'
    )
  } finally {
    setProcessingConsentId(null)
  }
}

  const loadRecords = useCallback(async () => {
    if (!session?.userId) return

    try {
      setIsLoadingRecords(true)

      const data = await apiClient.getMyRecords()

      setRecords(
        Array.isArray(data)
          ? data
          : data?.records ?? []
      )
    } catch (err) {
      console.error('Failed to load records:', err)
      setError(err.message)
    } finally {
      setIsLoadingRecords(false)
    }
  }, [session?.userId])

  const loadRecentActivity = useCallback(async () => {
  if (!session?.userId) return

  try {
    setIsLoadingActivity(true)
    setActivityError(null)

    const data = await apiClient.getRecentActivity()

    const nextActivities = Array.isArray(data)
      ? data
      : data?.activities ?? []

    setActivities(nextActivities)
    setActivityPage(1)
  } catch (err) {
    console.error('Failed to load recent activity:', err)
    setActivityError(err.message)
  } finally {
    setIsLoadingActivity(false)
  }
}, [session?.userId])


  useEffect(() => {
  if (activeTab === 'overview') {
    loadRecentActivity()
  }
}, [activeTab, loadRecentActivity])

  const loadCriticalInfo = useCallback(async () => {
    if (!session?.healthId) return

    try {
      setIsLoadingCritical(true)

      const data = await apiClient.getCriticalInfo(
        session.healthId
      )

      setCriticalInfo(data)
    } catch (err) {
      console.error('Failed to load critical information:', err)
      setError(err.message)
    } finally {
      setIsLoadingCritical(false)
    }
  }, [session?.healthId])

  useEffect(() => {
    loadProfile()
    loadRecords()
  }, [loadProfile, loadRecords])

  const patientName =
    profile?.displayName ??
    profile?.name ??
    session?.displayName ??
    'Patient'

  const healthId =
    profile?.healthId ??
    session?.healthId ??
    'PENDING-ID'

  const bloodGroup =
    profile?.bloodGroup ??
    'Not available'

  const allergies =
    profile?.allergies ?? []

  const chronicConditions =
    profile?.chronicConditions ?? []

  const recordCount = records.length

  const recentRecords = useMemo(() => {
    return [...records]
      .sort((a, b) => {
        const dateA = new Date(
          a.updatedAt ?? a.createdAt ?? 0
        ).getTime()

        const dateB = new Date(
          b.updatedAt ?? b.createdAt ?? 0
        ).getTime()

        return dateB - dateA
      })
      .slice(0, 5)
  }, [records])

  if (!session) {
    return (
      <AppShell>
        <Card>
          <p className="text-sm text-neutral-600">
            Loading your session...
          </p>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <section className="flex flex-col gap-1">
          <p className="text-sm text-neutral-500">
            Patient Portal
          </p>

          <h1 className="text-2xl font-semibold text-neutral-900">
            Welcome, {patientName}
          </h1>

          <p className="text-sm text-neutral-500">
            Manage your portable health record and access
            your medical information.
          </p>
        </section>

        {/* Error */}
        {error && (
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-red-700">
                  Unable to load some information
                </h3>

                <p className="mt-1 text-sm text-neutral-600">
                  {error}
                </p>
              </div>

              <Button
                type="button"
                onClick={() => {
                  setError(null)
                  loadProfile()
                  loadRecords()
                }}
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Patient identity card */}
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-lg font-semibold text-white">
                {patientName
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>

              <div>
                <h2 className="font-semibold text-neutral-900">
                  {patientName}
                </h2>

                <p className="text-sm text-neutral-500">
                  Health ID: {healthId}
                </p>
              </div>

            </div>

            <Badge tone="trust">
              Account active
            </Badge>

          </div>
        </Card>

        {/* Navigation */}
        <div className="flex gap-2 overflow-x-auto border-b border-neutral-200">

          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </TabButton>

          <TabButton
            active={activeTab === 'records'}
            onClick={() => setActiveTab('records')}
          >
            Medical Records
          </TabButton>

          <TabButton
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
          >
            My Profile
          </TabButton>

          <TabButton
            active={activeTab === 'access'}
            onClick={() => setActiveTab('access')}
          >
            Record Access
          </TabButton>

        </div>

        {/* ================= OVERVIEW ================= */}

        {activeTab === 'overview' && (
          <div className="grid gap-4 lg:grid-cols-3">

            {/* QR */}
            <div className="lg:col-span-1">
              <QRDisplay
                healthId={healthId}
                payloadHash={
                  profile?.qrCodePayloadHash ??
                  'PENDING'
                }
                displayName={patientName}
              />
            </div>

            {/* Health summary */}
            <div className="flex flex-col gap-4 lg:col-span-2">

              <div className="grid gap-4 sm:grid-cols-3">

                <StatCard
                  title="Medical Records"
                  value={
                    isLoadingRecords
                      ? '...'
                      : recordCount
                  }
                />

                <StatCard
                  title="Blood Group"
                  value={bloodGroup}
                />

                <StatCard
                  title="Health ID"
                  value={healthId}
                  small
                />

              </div>

              {/* Critical information */}
              <Card>
                <div className="flex items-center justify-between">

                  <div>
                    <h2 className="font-semibold text-neutral-900">
                      Emergency Information
                    </h2>

                    <p className="mt-1 text-sm text-neutral-500">
                      Critical information available to
                      authorized emergency responders.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={loadCriticalInfo}
                    disabled={isLoadingCritical}
                  >
                    {isLoadingCritical
                      ? 'Loading...'
                      : 'View'}
                  </Button>

                </div>

                {criticalInfo && (
                  <div className="mt-4 rounded-lg bg-neutral-50 p-4">
                    <pre className="whitespace-pre-wrap text-sm text-neutral-700">
                      {JSON.stringify(
                        criticalInfo,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </Card>

            </div>
          </div>
        )}

        {/* ================= RECORDS ================= */}

        {activeTab === 'records' && (
          <Card>

            <div className="mb-5">
              <h2 className="text-lg font-semibold text-neutral-900">
                Medical Records
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Your FHIR-based health records.
              </p>
            </div>

            {isLoadingRecords ? (
              <p className="text-sm text-neutral-500">
                Loading medical records...
              </p>
            ) : recentRecords.length === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
                <h3 className="font-medium text-neutral-700">
                  No medical records
                </h3>

                <p className="mt-1 text-sm text-neutral-500">
                  Your medical records will appear here
                  when they are added by an authorized
                  healthcare provider.
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-neutral-200">

                {recentRecords.map((record) => (
                  <MedicalRecordItem
                    key={
                      record.id ??
                      record.recordId ??
                      record.versionId
                    }
                    record={record}
                  />
                ))}

              </div>
            )}

          </Card>
        )}

        {/* ================= PROFILE ================= */}

        {activeTab === 'profile' && (
  <div className="grid gap-4 lg:grid-cols-2">

    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">
          Personal Information
        </h2>

        {!isEditingProfile && (
          <Button
            type="button"
            onClick={() => setIsEditingProfile(true)}
          >
            Edit Profile
          </Button>
        )}
      </div>

      {isLoadingProfile ? (
        <p className="mt-4 text-sm text-neutral-500">
          Loading profile...
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-4">

          <div>
            <label className="text-sm font-medium text-neutral-700">
              Full name
            </label>

            <input
              type="text"
              value={profileForm.displayName}
              disabled={!isEditingProfile}
              onChange={(e) =>
                setProfileForm({
                  ...profileForm,
                  displayName: e.target.value,
                })
              }
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700">
              Health ID
            </label>

            <input
              type="text"
              value={healthId}
              disabled
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700">
              Phone number
            </label>

            <input
              type="tel"
              value={profile?.phoneNumber ?? ''}
              disabled
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700">
              Blood group
            </label>

            <select
              value={profileForm.bloodGroup}
              disabled={!isEditingProfile}
              onChange={(e) =>
                setProfileForm({
                  ...profileForm,
                  bloodGroup: e.target.value,
                })
              }
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            >
              <option value="">Select blood group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          {isEditingProfile && (
            <div className="flex gap-2 pt-2">

              <Button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile
                  ? 'Saving...'
                  : 'Save Changes'}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelEdit}
                disabled={isSavingProfile}
              >
                Cancel
              </Button>

            </div>
          )}

        </div>
      )}
    </Card>

  </div>
)}

        {/* ================= ACCESS ================= */}

        {activeTab === 'access' && (
  <div className="flex flex-col gap-4">

    <Card>
      <div className="flex items-start justify-between gap-4">

        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Record Access
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Review doctors requesting access to your medical
            records.
          </p>
        </div>

        <Button
          type="button"
          onClick={loadPendingConsents}
          disabled={isLoadingConsents}
        >
          {isLoadingConsents ? 'Refreshing...' : 'Refresh'}
        </Button>

      </div>

      {consentError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {consentError}
          </p>
        </div>
      )}

      <div className="mt-5">

        {isLoadingConsents ? (

          <p className="text-sm text-neutral-500">
            Loading access requests...
          </p>

        ) : pendingConsents.length === 0 ? (

          <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">

            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
              <span className="text-lg">
                ✓
              </span>
            </div>

            <h3 className="mt-3 text-sm font-semibold text-neutral-800">
              No pending access requests
            </h3>

            <p className="mt-1 text-sm text-neutral-500">
              Doctors requesting access to your records will
              appear here.
            </p>

          </div>

        ) : (

          <div className="flex flex-col gap-3">

            {pendingConsents.map((consent) => (

              <div
                key={consent.consentId}
                className="rounded-xl border border-neutral-200 p-5"
              >

                <div className="flex flex-col gap-4">

                  <div className="flex items-start justify-between gap-4">

                    <div>

                      <div className="flex items-center gap-2">

                        <h3 className="font-semibold text-neutral-900">
                          Doctor Access Request
                        </h3>

                        <Badge tone="trust">
                          Pending
                        </Badge>

                      </div>

                      <p className="mt-2 text-sm text-neutral-600">
                        A doctor is requesting access to your
                        medical records.
                      </p>

                    </div>

                  </div>

                  <div className="grid gap-3 rounded-lg bg-neutral-50 p-4 sm:grid-cols-2">

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Doctor ID
                      </p>

                      <p className="mt-1 break-all font-mono text-sm text-neutral-800">
                        {consent.doctorId}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Purpose
                      </p>

                      <p className="mt-1 text-sm text-neutral-800">
                        {consent.purpose}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Requested
                      </p>

                      <p className="mt-1 text-sm text-neutral-800">
                        {consent.requestedAt
                          ? new Date(
                              consent.requestedAt
                            ).toLocaleString()
                          : 'Unavailable'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Expires
                      </p>

                      <p className="mt-1 text-sm text-neutral-800">
                        {consent.expiresAt
                          ? new Date(
                              consent.expiresAt
                            ).toLocaleString()
                          : 'Unavailable'}
                      </p>
                    </div>

                  </div>

                  <div className="rounded-lg border border-neutral-200 p-4">

                    <p className="text-sm font-medium text-neutral-800">
                      Allow this doctor to access your records?
                    </p>

                    <p className="mt-1 text-sm leading-5 text-neutral-500">
                      Approving this request will allow the
                      requesting doctor to access your protected
                      medical records according to their
                      authorization.
                    </p>

                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">

                    <Button
                      type="button"
                      onClick={() =>
                        handleApproveConsent(
                          consent.consentId
                        )
                      }
                      disabled={
                        processingConsentId ===
                        consent.consentId
                      }
                    >
                      {processingConsentId ===
                      consent.consentId
                        ? 'Processing...'
                        : 'Approve Access'}
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        handleDenyConsent(
                          consent.consentId
                        )
                      }
                      disabled={
                        processingConsentId ===
                        consent.consentId
                      }
                    >
                      Deny
                    </Button>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </Card>

    <Card>

      <div className="mb-5">
        <h2 className="text-lg font-semibold text-neutral-900">
          Who Can Access My Records?
        </h2>

        <p className="mt-1 text-sm text-neutral-500">
          Access to your health information is controlled by
          your consent and emergency-access rules.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">

        <AccessCard
          title="Doctors"
          description="Doctors can access your records after you provide the required consent."
          tone="trust"
        />

        <AccessCard
          title="Emergency Responders"
          description="Authorized emergency responders can access permitted critical information during emergencies."
          tone="critical"
        />

        <AccessCard
          title="Government Verification"
          description="Government verification is limited to the information required for eligibility checks."
          tone="neutral"
        />

        <AccessCard
          title="You"
          description="You can view your own health information and record history from this portal."
          tone="trust"
        />

      </div>

    </Card>

  </div>
)}

        {/* Recent activity */}
        {activeTab === 'overview' && (
          <Card>

            <div className="mb-4 flex items-center justify-between">

              <div>
                <h2 className="font-semibold text-neutral-900">
                  Recent Activity
                </h2>

                <p className="text-sm text-neutral-500">
                  Latest updates to your health record.
                </p>
              </div>

              <Button
                type="button"
                onClick={loadRecentActivity}
                disabled={isLoadingActivity}
              >
                Refresh
              </Button>

            </div>

            {isLoadingActivity ? (
              <p className="text-sm text-neutral-500">
                Loading...
              </p>
            ) : activities.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No recent activity.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-neutral-200">

                {currentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="py-3"
                  >
                    <p className="text-sm font-medium text-neutral-800">
                      {activity.description}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
    {totalActivityPages > 1 && (
  <div className="mt-4 flex items-center justify-between">

    <button
      type="button"
      onClick={() =>
        setActivityPage((page) => Math.max(1, page - 1))
      }
      disabled={activityPage === 1}
      className="rounded-lg border border-neutral-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
    >
      Previous
    </button>

    <span className="text-sm text-neutral-500">
      Page {activityPage} of {totalActivityPages}
    </span>

    <button
      type="button"
      onClick={() =>
        setActivityPage((page) =>
          Math.min(totalActivityPages, page + 1)
        )
      }
      disabled={activityPage === totalActivityPages}
      className="rounded-lg border border-neutral-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
    >
      Next
    </button>

  </div>
)}
              </div>
            )}
            
          </Card>
        )}

      </div>
    </AppShell>
  )
}


/* ============================================================
   COMPONENTS
   ============================================================ */

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition',
        active
          ? 'border-neutral-900 text-neutral-900'
          : 'border-transparent text-neutral-500 hover:text-neutral-900',
      ].join(' ')}
    >
      {children}
    </button>
  )
}


function StatCard({ title, value, small = false }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {title}
      </p>

      <p
        className={[
          'mt-2 font-semibold text-neutral-900',
          small
            ? 'break-all text-sm'
            : 'text-2xl',
        ].join(' ')}
      >
        {value}
      </p>
    </Card>
  )
}


function ProfileRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-neutral-100 pb-3 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </span>

      <span className="text-sm text-neutral-900">
        {value}
      </span>
    </div>
  )
}


function InfoList({ title, values, emptyText }) {
  const normalizedValues = Array.isArray(values)
    ? values
    : []

  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-700">
        {title}
      </h3>

      {normalizedValues.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">
          {emptyText}
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {normalizedValues.map((item, index) => (
            <Badge
              key={index}
              tone="neutral"
            >
              {typeof item === 'string'
                ? item
                : item?.allergen ??
                  item?.condition ??
                  JSON.stringify(item)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}


function AccessCard({
  title,
  description,
  tone,
}) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4">

      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-neutral-900">
          {title}
        </h3>

        <Badge tone={tone}>
          Protected
        </Badge>
      </div>

      <p className="mt-2 text-sm leading-6 text-neutral-500">
        {description}
      </p>

    </div>
  )
}


function MedicalRecordItem({ record }) {
  const resourceType =
    record.fhirResourceType ??
    record.resourceType ??
    record.type ??
    'Medical Record'

  const date =
    record.updatedAt ??
    record.createdAt

  const formattedDate = date
    ? new Date(date).toLocaleString()
    : 'Date unavailable'

  return (
    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">

      <div>
        <h3 className="font-medium text-neutral-900">
          {resourceType}
        </h3>

        <p className="mt-1 text-sm text-neutral-500">
          Version {record.versionNumber ?? record.currentVersion ?? 1}
          {' · '}
          {formattedDate}
        </p>
      </div>

      <Badge tone="trust">
        Available
      </Badge>

    </div>
  )
}