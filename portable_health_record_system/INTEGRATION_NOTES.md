# Frontend integration notes

No frontend redesign is required for the backend contract.

## 1. Enable the existing login calls

`src/features/auth/pages/LoginPage.jsx` currently comments out:

```js
await authApi.requestOtp(phoneNumber)
```

and:

```js
const session = await login(phoneNumber, otp)
```

The backend already implements those endpoints and returns the session shape expected by `AuthContext`.

## 2. Fix the current QR placeholder when wiring the real patient data

`PatientDashboard.jsx` currently passes:

```jsx
payloadHash="placeholder-hash"
```

The backend's seeded patient QR payload hash is available in the database and should eventually be returned with the patient profile/session API. The current frontend does not have a profile API call, so the backend does not invent one.

## 3. Government UI

`EligibilityCheck.jsx` is currently a TODO and has no API client method. No government endpoint was invented because doing so would violate the existing frontend-first contract.

## 4. Refresh tokens

The backend supports `/api/auth/refresh` and `/api/auth/logout`, but the current frontend only stores `auth_token`. Adding refresh-token storage/rotation can be done later without changing the existing login response fields.
