import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { USER_ROLES } from '../constants/accessLevels'

import LoginPage from '../features/auth/pages/LoginPage'
import PatientDashboard from '../features/patient/pages/PatientDashboard'
import PatientRecords from '../features/patient/pages/PatientRecords'
import DoctorDashboard from '../features/doctor/pages/DoctorDashboard'
import ScanPatientQR from '../features/doctor/pages/RequestConsent'
import EmergencyAccess from '../features/emergency/pages/EmergencyAccess'
import EligibilityCheck from '../features/government/pages/EligibilityCheck'
import RegisterPage from '../features/auth/pages/RegisterPage'

import DoctorPatients from '../features/doctor/components/DoctorPatients'
import DoctorPatientSearch from '../features/doctor/components/DoctorPatientSearch'
import DoctorPatientDetails from '../features/doctor/components/DoctorPatientDetails'
import DoctorConsents from '../features/doctor/components/DoctorConsents'
import DoctorSync from '../features/doctor/components/DoctorSync'
import { GuestRoute } from './GuestRoute'

export function AppRoutes() {
  return (
    <Routes>

      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />

      <Route
        path="/register"
        element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        }
      />

      <Route
        path="/patient"
        element={
          <ProtectedRoute allow={[USER_ROLES.PATIENT]}>
            <PatientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/records"
        element={
          <ProtectedRoute allow={[USER_ROLES.PATIENT]}>
            <PatientRecords />
          </ProtectedRoute>
        }
      />

      <Route
        path="/doctor"
        element={
          <ProtectedRoute allow={[USER_ROLES.DOCTOR]}>
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/scan"
        element={
          <ProtectedRoute allow={[USER_ROLES.DOCTOR]}>
            <ScanPatientQR />
          </ProtectedRoute>
        }
      />

        <Route
          path="/doctor/patients"
          element={
            <ProtectedRoute allow={[USER_ROLES.DOCTOR]}>
              <DoctorPatients />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/patients/search"
          element={
            <ProtectedRoute allow={[USER_ROLES.DOCTOR]}>
              <DoctorPatientSearch />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/patients/:patientId"
          element={
            <ProtectedRoute allow={[USER_ROLES.DOCTOR]}>
              <DoctorPatientDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/consents"
          element={
            <ProtectedRoute allow={[USER_ROLES.DOCTOR]}>
              <DoctorConsents />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/sync"
          element={
            <ProtectedRoute allow={[USER_ROLES.DOCTOR]}>
              <DoctorSync />
            </ProtectedRoute>
          }
        />

      {/* Emergency access deliberately has NO consent gate, but still requires
          an authenticated + verified responder session — "no consent from the
          patient" is not the same as "no auth at all." */}
      <Route
        path="/emergency"
        element={
          <ProtectedRoute allow={[USER_ROLES.EMERGENCY_RESPONDER]}>
            <EmergencyAccess />
          </ProtectedRoute>
        }
      />

      <Route
        path="/government"
        element={
          <ProtectedRoute allow={[USER_ROLES.GOVERNMENT_VERIFIER]}>
            <EligibilityCheck />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
