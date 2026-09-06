import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { setToken } from '../../../lib/apiClient'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'

export default function RegisterPage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('patient')

  // Doctor-specific fields
  const [licenseNumber, setLicenseNumber] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [pincode, setPincode] = useState('')
  const [hospitals, setHospitals] = useState([])
  const [selectedHospitalId, setSelectedHospitalId] = useState('')
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(false)
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('details')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const navigate = useNavigate()

  async function handleRegister(e) {
    e.preventDefault()
    setError(null)

    // Extra frontend validation for doctors
    if (role === 'doctor') {
  if (!licenseNumber.trim()) {
    setError('License number is required for doctors.')
    return
  }

  if (!specialization.trim()) {
    setError('Specialization is required for doctors.')
    return
  }

  if (!/^\d{6}$/.test(pincode)) {
    setError('A valid 6-digit serving-area PIN code is required.')
    return
  }

  if (!selectedHospitalId) {
    setError('Please select the hospital where you are currently serving.')
    return
  }
}

    setIsSubmitting(true)

    try {
      const res = await authApi.register(
        phoneNumber,
        displayName,
        role,
        role === 'doctor'
          ? {
              licenseNumber: licenseNumber.trim(),
              specialization: specialization.trim(),
              hospitalId: selectedHospitalId || null,
            }
          : null
      )

      setStep('otp')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function findHospitals() {
  if (!/^\d{6}$/.test(pincode)) {
    setError('Please enter a valid 6-digit PIN code.')
    return
  }

  setError(null)
  setHospitals([])
  setSelectedHospitalId('')
  setIsLoadingHospitals(true)

  try {
    const results = await authApi.getHospitalsByPincode(pincode)

    setHospitals(results)

    if (results.length === 0) {
      setError('No hospitals found for this PIN code.')
    }
  } catch (err) {
    setError(err.message || 'Failed to find hospitals.')
  } finally {
    setIsLoadingHospitals(false)
  }
}

  async function handleVerifyRegistration(e) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const session = await authApi.verifyRegistration(
        phoneNumber,
        otp
      )

      await setToken(session.token)

      navigate(roleHomePath(session.role), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Create Account
        </h1>

        <p className="mt-1 text-sm text-neutral-500">
          Portable Health Record
        </p>

        {step === 'details' && (
          <form
            onSubmit={handleRegister}
            className="mt-5 flex flex-col gap-3"
          >
            {/* Full Name */}
            <label className="text-sm text-neutral-700">
              Full name

              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                placeholder="Enter your name"
              />
            </label>

            {/* Phone */}
            <label className="text-sm text-neutral-700">
              Phone number

              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                placeholder="+91 XXXXX XXXXX"
              />
            </label>

            {/* Role */}
            <label className="text-sm text-neutral-700">
              Register as

              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value)

                  // Clear doctor fields when switching away
                  if (e.target.value !== 'doctor') {
                    setLicenseNumber('')
                    setSpecialization('')
                    setHospitalId('')
                  }
                }}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="emergency_responder">
                  Emergency Responder
                </option>
                <option value="government_verifier">
                  Government Verifier
                </option>
              </select>
            </label>

            {/* Doctor-specific fields */}
            {role === 'doctor' && (
              <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <h2 className="text-sm font-semibold text-neutral-800">
                  Doctor Information
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  Please provide your professional information.
                </p>

                <div className="mt-4 flex flex-col gap-3">
                  {/* License Number */}
                  <label className="text-sm text-neutral-700">
                    Medical License Number
                    <span className="text-emergency-600"> *</span>

                    <input
                      type="text"
                      required={role === 'doctor'}
                      value={licenseNumber}
                      onChange={(e) =>
                        setLicenseNumber(e.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      placeholder="Enter your license number"
                    />
                  </label>

                  {/* Specialization */}
                  <label className="text-sm text-neutral-700">
                    Specialization
                    <span className="text-emergency-600"> *</span>

                    <input
                      type="text"
                      required={role === 'doctor'}
                      value={specialization}
                      onChange={(e) =>
                        setSpecialization(e.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      placeholder="e.g. Cardiology"
                    />
                  </label>

                  {/* Hospital */}
                  {/* Serving Area PIN Code */}
<label className="text-sm text-neutral-700">
  Serving Area PIN Code
  <span className="text-emergency-600"> *</span>

  <div className="mt-1 flex gap-2">
    <input
      type="text"
      required
      maxLength={6}
      value={pincode}
      onChange={(e) => {
        const value = e.target.value.replace(/\D/g, '')
        setPincode(value)
        setHospitals([])
        setSelectedHospitalId('')
      }}
      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
      placeholder="e.g. 400001"
    />

    <Button
      type="button"
      onClick={findHospitals}
      disabled={isLoadingHospitals || pincode.length !== 6}
    >
      {isLoadingHospitals ? 'Finding...' : 'Find'}
    </Button>
  </div>
</label>

{/* Hospital Selection */}
{hospitals.length > 0 && (
  <label className="text-sm text-neutral-700">
    Select Hospital
    <span className="text-emergency-600"> *</span>

    <select
      required
      value={selectedHospitalId}
      onChange={(e) => setSelectedHospitalId(e.target.value)}
      className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
    >
      <option value="">
        Select the hospital where you serve
      </option>

      {hospitals.map((hospital) => (
        <option
          key={hospital.id}
          value={hospital.id}
        >
          {hospital.name}
          {hospital.address
            ? ` — ${hospital.address}`
            : ''}
        </option>
      ))}
    </select>
  </label>
)}
                </div>
              </div>
            )}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Sending OTP...'
                : 'Create Account'}
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form
            onSubmit={handleVerifyRegistration}
            className="mt-5 flex flex-col gap-3"
          >
            <label className="text-sm text-neutral-700">
              Enter the OTP sent to {phoneNumber}

              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                placeholder="6-digit code"
              />
            </label>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Verifying...'
                : 'Verify & continue'}
            </Button>
          </form>
        )}

        {error && (
          <p className="mt-3 text-sm text-emergency-600">
            {error}
          </p>
        )}

        <p className="mt-5 text-center text-sm text-neutral-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:underline"
          >
            Login
          </Link>
        </p>
      </Card>
    </div>
  )
}

function roleHomePath(role) {
  switch (role) {
    case 'doctor':
      return '/doctor'

    case 'emergency_responder':
      return '/emergency'

    case 'government_verifier':
      return '/government'

    default:
      return '/patient'
  }
}