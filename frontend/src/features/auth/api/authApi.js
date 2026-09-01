import { apiClient } from '../../../lib/apiClient'

/**
 * Thin wrapper kept separate from AuthContext so it can be unit-tested
 * (and reused by the consent-request OTP flow, which is a *different* OTP
 * purpose but the same request/verify shape) without pulling in React.
 */
export const authApi = {
  requestOtp: (phoneNumber) => apiClient.requestOtp(phoneNumber),
  verifyOtp: (phoneNumber, otp) => apiClient.verifyOtp(phoneNumber, otp),
  
  register: (
  phoneNumber,
  displayName,
  role,
  doctorDetails = null
) =>
  apiClient.register(
    phoneNumber,
    displayName,
    role,
    doctorDetails
  ),

  verifyRegistration: (phoneNumber, otp) =>
    apiClient.verifyRegistration(
      phoneNumber,
      otp
    ),
}

export const profileApi = {

  getMyProfile: () =>
    apiClient.getMyProfile(),

  updateMyProfile: (data) =>
    apiClient.updateMyProfile(data),
}
