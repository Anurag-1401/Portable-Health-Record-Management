import { useEffect, useState } from 'react'
import { profileApi } from '../../features/auth/api/authApi'
import { Button } from '../ui/Button'

export function ProfileModal({ isOpen, onClose, onProfileUpdated }) {
  const [profile, setProfile] = useState(null)
  const [hospitals,setHospitals] = useState([])
  const [form, setForm] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen) return

    loadProfile()
  }, [isOpen])

  async function loadProfile() {
    setIsLoading(true)
    setError(null)

    try {
      const data = await profileApi.getMyProfile()

      setProfile(data)

      setForm({
        displayName: data.displayName ?? '',

        bloodGroup: data.bloodGroup ?? '',
        allergies: data.allergies ?? [],
        chronicConditions: data.chronicConditions ?? [],
        primaryDoctorId: data.primaryDoctorId ?? '',

        specialization: data.specialization ?? '',
        hospitalId: data.hospitalId ?? '',
      })
    } catch (err) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    setError(null)
    setIsSaving(true)

    try {
      const updatedProfile =
        await profileApi.updateMyProfile({
          displayName: form.displayName,

          ...(profile.role === 'patient'
            ? {
                bloodGroup: form.bloodGroup || null,
                allergies: form.allergies,
                chronicConditions: form.chronicConditions,
                primaryDoctorId:
                  form.primaryDoctorId || null,
              }
            : {}),

          ...(profile.role === 'doctor'
            ? {
                specialization:
                  form.specialization || null,
                hospitalId:
                  form.hospitalId || null,
              }
            : {}),
        })

      setProfile(updatedProfile)

      setForm({
        displayName:
          updatedProfile.displayName ?? '',

        bloodGroup:
          updatedProfile.bloodGroup ?? '',

        allergies:
          updatedProfile.allergies ?? [],

        chronicConditions:
          updatedProfile.chronicConditions ?? [],

        primaryDoctorId:
          updatedProfile.primaryDoctorId ?? '',

        specialization:
          updatedProfile.specialization ?? '',

        hospitalId:
          updatedProfile.hospitalId ?? '',
      })

      if (onProfileUpdated) {
        onProfileUpdated(updatedProfile)
      }

    } catch (err) {
      setError(
        err.message || 'Failed to update profile'
      )
    } finally {
      setIsSaving(false)
    }
  }

  function addArrayValue(field, value) {
    const cleaned = value.trim()

    if (!cleaned) return

    if (form[field].includes(cleaned)) return

    setForm({
      ...form,
      [field]: [
        ...form[field],
        cleaned,
      ],
    })
  }

  function removeArrayValue(field, value) {
    setForm({
      ...form,
      [field]: form[field].filter(
        item => item !== value
      ),
    })
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">

          <div>
            <h2 className="text-xl font-semibold text-neutral-900">
              My Profile
            </h2>

            {profile && (
              <p className="mt-1 text-sm capitalize text-neutral-500">
                {profile.role?.replaceAll('_', ' ')}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ×
          </button>
        </div>


        {/* Body */}
        <div className="overflow-y-auto px-6 py-5">

          {isLoading && (
            <p className="text-sm text-neutral-500">
              Loading profile...
            </p>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!isLoading && profile && (
            <div className="flex flex-col gap-6">


              {/* Profile header */}
              <div className="flex items-center gap-4 rounded-xl bg-neutral-50 p-4">

                <div>
                      <label className="text-sm font-medium text-neutral-700">
                        Account status
                      </label>

                      <input
                        type="text"
                        value={profile.enabled ? 'Active' : 'Disabled'}
                        disabled
                        className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
                      />
                    </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-trust-100 text-xl font-semibold text-trust-700">
                  {(profile.displayName?.[0] || 'U').toUpperCase()}
                </div>

                <div>
                  <p className="font-semibold text-neutral-900">
                    {profile.displayName}
                  </p>

                  <p className="text-sm capitalize text-neutral-500">
                    {profile.role?.replaceAll('_', ' ')}
                  </p>
                </div>
              </div>


              {/* Personal Information */}
              <section>
                <h3 className="mb-4 text-base font-semibold text-neutral-900">
                  Personal Information
                </h3>

                <div className="grid gap-4 md:grid-cols-2">

                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Full name
                    </label>

                    <input
                      type="text"
                      value={form.displayName}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          displayName: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-trust-500"
                    />
                  </div>


                  {/* Phone */}
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Phone number
                    </label>

                    <input
                      type="tel"
                      value={profile.phoneNumber ?? ''}
                      disabled
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
                    />
                  </div>


                  {/* Role */}
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Role
                    </label>

                    <input
                      type="text"
                      value={profile.role?.replaceAll('_', ' ') ?? ''}
                      disabled
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm capitalize text-neutral-500"
                    />
                  </div>


                  {/* User ID */}
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      User ID
                    </label>

                    <input
                      type="text"
                      value={profile.userId ?? ''}
                      disabled
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
                    />
                  </div>

                </div>
              </section>


              {/* Patient */}
              {profile.role === 'patient' && (
                <section className="border-t border-neutral-100 pt-6">

                  <h3 className="mb-4 text-base font-semibold text-neutral-900">
                    Patient Information
                  </h3>

                  <div className="flex flex-col gap-4">

                    {/* Health ID */}
                    <div>
                      <label className="text-sm font-medium text-neutral-700">
                        Health ID
                      </label>

                      <input
                        type="text"
                        value={profile.healthId ?? ''}
                        disabled
                        className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
                      />
                    </div>


                    {/* Blood group */}
                    <div>
                      <label className="text-sm font-medium text-neutral-700">
                        Blood group
                      </label>

                      <select
                        value={form.bloodGroup}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            bloodGroup: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      >
                        <option value="">
                          Select blood group
                        </option>

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


                    {/* Allergies */}
                    <ArrayEditor
                      label="Allergies"
                      values={form.allergies}
                      onAdd={(value) =>
                        addArrayValue(
                          'allergies',
                          value
                        )
                      }
                      onRemove={(value) =>
                        removeArrayValue(
                          'allergies',
                          value
                        )
                      }
                    />


                    {/* Chronic conditions */}
                    <ArrayEditor
                      label="Chronic Conditions"
                      values={form.chronicConditions}
                      onAdd={(value) =>
                        addArrayValue(
                          'chronicConditions',
                          value
                        )
                      }
                      onRemove={(value) =>
                        removeArrayValue(
                          'chronicConditions',
                          value
                        )
                      }
                    />

                  </div>
                </section>
              )}


              {/* Doctor */}
              {profile.role === 'doctor' && (
                <section className="border-t border-neutral-100 pt-6">

                  <h3 className="mb-4 text-base font-semibold text-neutral-900">
                    Doctor Information
                  </h3>

                  <div className="flex flex-col gap-4">

                    {/* License */}
                    <div>
                      <label className="text-sm font-medium text-neutral-700">
                        License Number
                      </label>

                      <input
                        type="text"
                        value={profile.licenseNumber ?? ''}
                        disabled
                        className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
                      />

                      <p className="mt-1 text-xs text-neutral-500">
                        License number cannot be changed from the profile.
                      </p>
                    </div>


                    {/* Specialization */}
                    <div>
                      <label className="text-sm font-medium text-neutral-700">
                        Specialization
                      </label>

                      <input
                        type="text"
                        value={form.specialization}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            specialization: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                        placeholder="e.g. Cardiology"
                      />
                    </div>


                    {/* Hospital */}
                    <div>
                      <label className="text-sm font-medium text-neutral-700">
                        Hospital
                      </label>

                      <input
                        type="text"
                        value={profile.hospitalName ?? 'Not assigned'}
                        disabled
                        className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
                      />
                    </div>

                    <select
                      value={form.hospitalId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          hospitalId: e.target.value,
                        })
                      }
                    >
                      <option value="">
                        No hospital
                      </option>
                
                      {hospitals.map((hospital) => (
                        <option
                          key={hospital.id}
                          value={hospital.id}
                        >
                          {hospital.name}
                        </option>
                      ))}
                    </select>


                    {/* Hospital details */}
                    {profile.hospitalName && (
                      <div className="rounded-lg bg-neutral-50 p-4">

                        <p className="font-medium text-neutral-800">
                          {profile.hospitalName}
                        </p>

                        {profile.hospitalRegistrationNumber && (
                          <p className="mt-1 text-sm text-neutral-500">
                            Registration:{' '}
                            {profile.hospitalRegistrationNumber}
                          </p>
                        )}

                        {profile.hospitalAddress && (
                          <p className="mt-1 text-sm text-neutral-500">
                            {profile.hospitalAddress}
                          </p>
                        )}

                      </div>
                    )}

                  </div>
                </section>
              )}

            </div>
          )}
        </div>


        {/* Footer */}
        {!isLoading && profile && (
          <div className="flex justify-end gap-2 border-t border-neutral-100 px-6 py-4">

            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving
                ? 'Saving...'
                : 'Save Changes'}
            </Button>

          </div>
        )}

      </div>
    </div>
  )
}


// ============================================================
// Array editor
// ============================================================

function ArrayEditor({
  label,
  values,
  onAdd,
  onRemove,
}) {

  const [value, setValue] = useState('')

  function handleAdd() {

    if (!value.trim()) return

    onAdd(value)

    setValue('')
  }

  return (
    <div>

      <label className="text-sm font-medium text-neutral-700">
        {label}
      </label>

      <div className="mt-2 flex flex-wrap gap-2">

        {values.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700"
          >
            {item}

            <button
              type="button"
              onClick={() => onRemove(item)}
              className="text-neutral-400 hover:text-red-600"
            >
              ×
            </button>
          </span>
        ))}

      </div>

      <div className="mt-2 flex gap-2">

        <input
          type="text"
          value={value}
          onChange={(e) =>
            setValue(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          placeholder={`Add ${label.toLowerCase()}`}
        />

        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Add
        </button>

      </div>
    </div>
  )
}