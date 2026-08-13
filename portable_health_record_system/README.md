# Portable Health Record System — Backend

Spring Boot 3 + Java 21 backend implemented against the existing React/Vite frontend contract.

## Compatibility decisions

This backend intentionally keeps the paths already used by the frontend:

- `/api/auth/otp/request`
- `/api/auth/otp/verify`
- `/api/records`
- `/api/consent/request`
- `/api/emergency/critical-info/{healthId}`
- `/api/sync/record`

The frontend's `apiClient.js` uses `VITE_API_BASE_URL=http://localhost:8000/api`, so `/api/v1` was not introduced. Authentication responses are also returned directly rather than wrapped in `{success,message,data}` because `AuthContext` reads `result.token`, `result.userId`, `result.role`, `result.healthId`, and `result.displayName` directly.

## Stack

- Java 21
- Spring Boot 3.5.x
- Spring Security
- JWT (JJWT)
- BCrypt
- Spring Data JPA / Hibernate
- PostgreSQL
- Flyway
- MapStruct
- Bean Validation
- Springdoc OpenAPI
- Actuator
- JUnit 5 / Mockito

## Start PostgreSQL

```bash
docker compose up -d postgres
```

Default database:

```text
host: localhost
port: 5432
database: phr
user: phr
password: phr
```

## Run the backend

Copy `.env.example` values into your environment, then:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

For a packaged build:

```bash
mvn clean package
java -jar target/portable-health-record-backend-1.0.0.jar
```

The API listens on:

```text
http://localhost:8000
```

Swagger:

```text
http://localhost:8000/swagger-ui.html
```

## Demo OTP accounts

Flyway seeds four frontend roles plus an admin account:

| Role | Phone | Health ID |
|---|---|---|
| patient | `+919999999001` | `PHR-IN-000001` |
| doctor | `+919999999002` | — |
| emergency_responder | `+919999999003` | — |
| government_verifier | `+919999999004` | — |
| admin | `+919999999005` | — |

When the `local` profile is active, the generated OTP is returned in the OTP request response as `devOtp` and is also logged. This is intentionally a development-only convenience. Use a real SMS/OTP provider and disable `PHR_OTP_EXPOSE_IN_RESPONSE` before deployment.

## Frontend integration

In the React project:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

The current frontend login page has the actual `requestOtp()` and `login()` calls commented out. The backend already implements those calls; uncommenting the existing frontend calls will connect the login screen to this backend without changing the API contract.

## API contract

### Authentication

```http
POST /api/auth/otp/request
Content-Type: application/json

{"phoneNumber":"+919999999001"}
```

```http
POST /api/auth/otp/verify
Content-Type: application/json

{"phoneNumber":"+919999999001","otp":"123456"}
```

Successful verification returns:

```json
{
  "token": "...",
  "userId": "...",
  "role": "patient",
  "healthId": "PHR-IN-000001",
  "displayName": "Demo Patient",
  "refreshToken": "..."
}
```

### Patient records

```http
GET /api/records?patientId=PHR-IN-000001
Authorization: Bearer <token>
```

The endpoint accepts either the patient's UUID or Health ID and returns FHIR-aligned record-version objects using the snake_case field names expected by the frontend hash-chain implementation.

### Consent

```http
POST /api/consent/request
Authorization: Bearer <doctor-token>
Content-Type: application/json

{"patientId":"PHR-IN-000001","purpose":"Clinical consultation"}
```

The current frontend passes the Health ID in the `patientId` field; the backend resolves it server-side.

Patient approval/denial endpoints are also provided:

```text
POST /api/consent/{consentId}/approve
POST /api/consent/{consentId}/deny
```

### Emergency critical information

```http
GET /api/emergency/critical-info/PHR-IN-000001
Authorization: Bearer <emergency-token>
```

Response shape is intentionally restricted to:

```json
{
  "blood_group": "B+",
  "allergies": [{"allergen":"Penicillin","severity":"Severe"}],
  "chronic_conditions": [{"condition":"Asthma"}]
}
```

Every emergency lookup creates an `emergency_access_logs` row and an audit-log entry.

### Offline synchronization

```http
POST /api/sync/record
Authorization: Bearer <token>
Content-Type: application/json

{
  "device_id":"device-001",
  "target_record_id":"...",
  "operation":"update",
  "payload":{},
  "created_at_client":"2026-08-08T12:00:00Z"
}
```

Critical fields:

```text
allergies
chronic_conditions
blood_group
```

A stale write touching one of those fields returns:

```json
{
  "conflict": {"field_name":"blood_group"},
  "status":"conflict"
}
```

Non-critical stale writes follow last-write-wins by `created_at_client`.

## Hash chain

The server uses the same formula as `src/lib/hashChain.js`:

```text
SHA256(previous_hash + canonicalize(resource_data) + created_at)
```

Objects are recursively key-sorted before serialization. Record versions are linked per patient in chronological order.

Verification endpoint:

```text
GET /api/records/patient/{patientId}/hash-chain/verify
```

## QR

The current frontend QR payload is:

```json
{"healthId":"PHR-IN-000001","payloadHash":"..."}
```

The backend therefore preserves that contract. It also exposes:

```text
POST /api/qr/validate
```

for callers that have the payload hash available. The current frontend consent request does not send `payloadHash`, so the existing `/api/consent/request` flow resolves the Health ID but cannot perform payload-hash validation.

## Database migrations

Flyway migrations are in:

```text
src/main/resources/db/migration/
```

- `V1__create_schema.sql` — core schema, constraints, indexes
- `V2__seed_demo_data.sql` — roles, demo users, patient, doctor, sample records
- `V3__add_record_delete_flag.sql` — record tombstone support

## Security notes

- Access tokens are JWTs.
- Refresh tokens are stored only as SHA-256 hashes in PostgreSQL.
- OTP values are stored as BCrypt hashes.
- Emergency access is role-protected and separately audited.
- Full record access for doctors requires an approved consent for the patient.
- Government role is not granted a full-record endpoint.
- Medical records are versioned and hash-linked rather than physically overwritten.
- Record deletion creates a tombstone version so the audit/hash history is preserved.

## Important current frontend limitations

The backend deliberately does not silently redesign the frontend.

1. `LoginPage.jsx` currently comments out the real OTP request/verify calls.
2. `QRDisplay.jsx` currently supplies `placeholder-hash` from `PatientDashboard.jsx` rather than a server-issued payload hash.
3. The government eligibility page is still a UI TODO and has no current API client method, so no invented government endpoint was made part of the frontend contract.
4. The frontend currently has no refresh-token call; refresh/logout endpoints exist server-side for the next frontend integration step.

## Production hardening before deployment

- Replace console OTP delivery with a real SMS provider.
- Set a strong random `PHR_JWT_SECRET` through secrets management.
- Disable `PHR_OTP_EXPOSE_IN_RESPONSE`.
- Put the API behind TLS and a reverse proxy.
- Restrict CORS to the deployed frontend origins.
- Add rate limiting for OTP request/verify endpoints.
- Add centralized secrets management and database backups.
- Add object storage integration for `documents`.
- Add a formal government eligibility data source before exposing government verification UI.
