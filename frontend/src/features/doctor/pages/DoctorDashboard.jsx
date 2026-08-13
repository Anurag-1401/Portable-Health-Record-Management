import { AppShell } from '../../../components/layout/AppShell'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { useNavigate } from 'react-router-dom'

export default function DoctorDashboard() {
  const navigate = useNavigate()

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <Card>
          <h1 className="mb-2 text-lg font-semibold text-neutral-900">Scan a patient</h1>
          <p className="mb-3 text-sm text-neutral-500">
            Scan a patient's Health ID QR to request OTP-consent access to their full history.
          </p>
          <Button onClick={() => navigate('/doctor/scan')}>Open scanner</Button>
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">Pending sync</h2>
          <p className="text-sm text-neutral-500">
            TODO: show entries from the local sync queue with status = 'local_only' or 'conflict'
            (<code className="mx-1 rounded bg-neutral-100 px-1">src/lib/syncQueue.js</code>), so a
            doctor at a low-connectivity clinic can see what's waiting to sync.
          </p>
        </Card>
      </div>
    </AppShell>
  )
}
