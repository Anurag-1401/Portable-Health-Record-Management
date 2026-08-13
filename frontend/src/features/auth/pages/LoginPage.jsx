import { useState } from 'react'
import { useNavigate,Link } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { useAuth } from '../../../hooks/useAuth'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleRequestOtp(e) {
    e.preventDefault()
    setError(null)
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

  async function handleVerifyOtp(e) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const session = await login(phoneNumber, otp)
      console.log(session)
      const role = session.role || 'patient'
      navigate(roleHomePath(role),{replace:true})
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-4 text-xl font-semibold text-trust-800">Portable Health Record</h1>

        {step === 'phone' && (
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-3">
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
            <Button type="submit" disabled={isSubmitting}>
              Send OTP
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
            <label className="text-sm text-neutral-700">
              Enter the OTP sent to {phoneNumber}
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                placeholder="6-digit code"
              />
            </label>
            <Button type="submit" disabled={isSubmitting}>
              Verify & continue
            </Button>
          </form>
        )}

        {error && <p className="mt-3 text-sm text-emergency-600">{error}</p>}

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
