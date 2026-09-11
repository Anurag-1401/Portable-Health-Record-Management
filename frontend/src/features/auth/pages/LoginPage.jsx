import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { useAuth } from '../../../hooks/useAuth'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [step, setStep] = useState('phone') // 'phone' | 'otp'

  const [error, setError] = useState(null)
  const [phoneError, setPhoneError] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  function sanitizePhone(value) {
    // Remove everything except digits and +
    let cleaned = value.replace(/[^\d+]/g, '')

    // Allow + only as the first character
    if (cleaned.includes('+')) {
      cleaned =
        '+' +
        cleaned.replace(/\+/g, '')
    }

    // Maximum:
    // +91XXXXXXXXXX = 13 characters
    // XXXXXXXXXX    = 10 characters
    return cleaned.slice(0, 13)
  }

  function validatePhone(value) {
    const normalized = value.replace(/^\+91/, '')

    return /^\d{10}$/.test(normalized)
  }

  async function handleRequestOtp(e) {
    e.preventDefault()

    setError(null)
    setPhoneError('')

    if (!validatePhone(phoneNumber)) {
      setPhoneError(
        'Enter a valid 10-digit Indian phone number.'
      )
      return
    }

    setIsSubmitting(true)

    try {
      const res = await authApi.requestOtp(phoneNumber)

      console.log(res)

      setStep('otp')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleOtpChange(index, value) {
  // Only allow digits
  const digit = value.replace(/\D/g, '').slice(-1)

  const updated = [...otpDigits]
  updated[index] = digit

  setOtpDigits(updated)
  setOtp(updated.join(''))
  setError(null)

  // Move to next box after entering a digit
  if (digit && index < 5) {
    document.getElementById(`otp-${index + 1}`)?.focus()
  }
}

function handleOtpKeyDown(index, e) {
  // Move back on Backspace when current box is empty
  if (
    e.key === 'Backspace' &&
    !otpDigits[index] &&
    index > 0
  ) {
    document.getElementById(`otp-${index - 1}`)?.focus()
  }

  // Move left
  if (
    e.key === 'ArrowLeft' &&
    index > 0
  ) {
    document.getElementById(`otp-${index - 1}`)?.focus()
  }

  // Move right
  if (
    e.key === 'ArrowRight' &&
    index < 5
  ) {
    document.getElementById(`otp-${index + 1}`)?.focus()
  }
}

function handleOtpPaste(e) {
  e.preventDefault()

  const pasted = e.clipboardData
    .getData('text')
    .replace(/\D/g, '')
    .slice(0, 6)

  if (!pasted) {
    setError('Please paste a valid 6-digit OTP.')
    return
  }

  const digits = [
    ...pasted.split(''),
    ...Array(6 - pasted.length).fill(''),
  ]

  setOtpDigits(digits)
  setOtp(pasted)
  setError(null)

  // Focus next empty box, or last box if complete
  const nextIndex = Math.min(pasted.length, 5)

  document
    .getElementById(`otp-${nextIndex}`)
    ?.focus()
}

  async function handleVerifyOtp(e) {
  e.preventDefault()

  setError(null)

  if (!/^\d{6}$/.test(otp)) {
    setError('Please enter the complete 6-digit OTP.')
    return
  }

  setIsSubmitting(true)

  try {
    const session = await login(phoneNumber, otp)

    console.log(session)

    const role = session.role || 'patient'

    navigate(roleHomePath(role), {
      replace: true,
    })
  } catch (err) {
    setError(err.message)
  } finally {
    setIsSubmitting(false)
  }
}

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-sm">

        <h1 className="mb-4 text-xl font-semibold text-trust-800">
          Portable Health Record
        </h1>

        {/* ================= PHONE ================= */}

        {step === 'phone' && (
          <form
            onSubmit={handleRequestOtp}
            className="flex flex-col gap-3"
          >

            <label className="text-sm text-neutral-700">
              Phone number

              <input
                type="tel"
                required
                inputMode="tel"
                value={phoneNumber}
                maxLength={13}
              onChange={(e) => {
  let value = e.target.value

  // Allow only digits and +
  value = value.replace(/[^\d+]/g, '')

  // + is allowed only at the beginning
  if (value.includes('+')) {
    value = '+' + value.replace(/\+/g, '')
  }

  // If it starts with +91, allow +91 + maximum 10 digits
  if (value.startsWith('+91')) {
    value = '+91' + value.slice(3).replace(/\D/g, '').slice(0, 10)
  } else if (value.startsWith('+')) {
    // While user is typing +, +9, +91...
    value = '+' + value.slice(1).replace(/\D/g, '').slice(0, 12)
  } else {
    // Without +, maximum 10 digits
    value = value.replace(/\D/g, '').slice(0, 10)
  }

  setPhoneNumber(value)

  // Validation
  const digits = value.startsWith('+91')
    ? value.slice(3)
    : value.startsWith('+')
      ? value.slice(1)
      : value

  if (digits.length > 0 && digits.length !== 10) {
    setPhoneError('Enter a valid 10-digit Indian phone number.')
  } else {
    setPhoneError('')
  }
}}
                onBlur={() => {
                  if (!validatePhone(phoneNumber)) {
                    setPhoneError(
                      'Enter a valid 10-digit Indian phone number.'
                    )
                  }
                }}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  phoneError
                    ? 'border-emergency-500 focus:outline-none'
                    : 'border-neutral-200'
                }`}
                placeholder="+91 XXXXX XXXXX"
              />

              {phoneError && (
                <p className="mt-1 text-xs text-emergency-600">
                  {phoneError}
                </p>
              )}
            </label>

            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Sending...'
                : 'Send OTP'}
            </Button>

          </form>
        )}

        {/* ================= OTP ================= */}

        {step === 'otp' && (
          <form
            onSubmit={handleVerifyOtp}
            className="flex flex-col gap-3"
          >

            <label className="text-sm text-neutral-700">
              Enter the OTP sent to {phoneNumber}

              <div className="mt-3">
  <div className="flex justify-between gap-2">
    {otpDigits.map((digit, index) => (
      <input
        key={index}
        id={`otp-${index}`}
        type="text"
        inputMode="numeric"
        autoComplete={index === 0 ? 'one-time-code' : 'off'}
        maxLength={1}
        value={digit}
        onChange={(e) =>
          handleOtpChange(index, e.target.value)
        }
        onKeyDown={(e) =>
          handleOtpKeyDown(index, e)
        }
        onPaste={handleOtpPaste}
        className={`h-12 w-11 rounded-lg border-2 text-center text-lg font-semibold outline-none transition-colors ${
          digit
            ? 'border-trust-600 bg-trust-50 text-trust-800'
            : 'border-neutral-300 bg-white text-neutral-900'
        } focus:border-trust-600 focus:ring-2 focus:ring-trust-100`}
        aria-label={`OTP digit ${index + 1}`}
      />
    ))}
  </div>

  <p className="mt-2 text-xs text-neutral-500">
    Enter the 6-digit OTP
  </p>
</div>
            </label>

            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Verifying...'
                : 'Verify & continue'}
            </Button>

          </form>
        )}

        {/* ================= ERROR ================= */}

        {error && (
          <p className="mt-3 text-sm text-emergency-600">
            {error}
          </p>
        )}

        {/* ================= REGISTER ================= */}

        <p className="mt-5 text-center text-sm text-neutral-600">
          Don't have an account?{' '}

          <Link
            to="/register"
            className="font-medium text-primary-600 hover:underline"
          >
            Create Account
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