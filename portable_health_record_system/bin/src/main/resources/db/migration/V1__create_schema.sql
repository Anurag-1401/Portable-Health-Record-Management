CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(32) NOT NULL UNIQUE
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    phone_number VARCHAR(32) NOT NULL UNIQUE,
    display_name VARCHAR(160) NOT NULL,
    password_hash VARCHAR(100),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    role_id UUID NOT NULL REFERENCES roles(id)
);
CREATE INDEX idx_users_role ON users(role_id);

CREATE TABLE hospitals (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    registration_number VARCHAR(100) UNIQUE,
    address VARCHAR(500)
);

CREATE TABLE doctors (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    license_number VARCHAR(100) NOT NULL UNIQUE,
    specialization VARCHAR(160),
    hospital_id UUID REFERENCES hospitals(id)
);
CREATE INDEX idx_doctors_hospital ON doctors(hospital_id);

CREATE TABLE patients (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    health_id VARCHAR(64) NOT NULL UNIQUE,
    blood_group VARCHAR(16),
    allergies JSONB NOT NULL DEFAULT '[]'::jsonb,
    chronic_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    qr_code_payload_hash VARCHAR(64) NOT NULL,
    primary_doctor_id UUID REFERENCES doctors(id)
);
CREATE INDEX idx_patients_primary_doctor ON patients(primary_doctor_id);

CREATE TABLE medical_records (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id),
    fhir_resource_type VARCHAR(40) NOT NULL,
    current_version BIGINT NOT NULL DEFAULT 0,
    current_record_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    lock_version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX idx_medical_records_patient_type ON medical_records(patient_id, fhir_resource_type);
CREATE INDEX idx_medical_records_updated ON medical_records(updated_at);

CREATE TABLE record_versions (
    id UUID PRIMARY KEY,
    record_id UUID NOT NULL REFERENCES medical_records(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    version_number BIGINT NOT NULL,
    fhir_resource_type VARCHAR(40) NOT NULL,
    resource_data JSONB NOT NULL,
    previous_record_hash VARCHAR(64),
    current_record_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    CONSTRAINT uk_record_version_number UNIQUE(record_id, version_number)
);
CREATE INDEX idx_record_versions_record ON record_versions(record_id);
CREATE INDEX idx_record_versions_patient ON record_versions(patient_id);

CREATE TABLE documents (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id),
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    sha256 VARCHAR(64) NOT NULL
);
CREATE INDEX idx_documents_patient ON documents(patient_id);

CREATE TABLE consents (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    purpose VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);
CREATE INDEX idx_consents_patient_status ON consents(patient_id, status);
CREATE INDEX idx_consents_doctor_status ON consents(doctor_id, status);

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message VARCHAR(2000) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, status);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    patient_id UUID REFERENCES patients(id),
    action VARCHAR(50) NOT NULL,
    details VARCHAR(2000),
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_patient_time ON audit_logs(patient_id, created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

CREATE TABLE otp (
    id UUID PRIMARY KEY,
    phone_number VARCHAR(32) NOT NULL,
    otp_hash VARCHAR(100) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    consumed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_otp_phone_created ON otp(phone_number, created_at);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE qr_tokens (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id),
    payload_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ,
    last_validated_at TIMESTAMPTZ
);
CREATE INDEX idx_qr_tokens_patient ON qr_tokens(patient_id);
CREATE INDEX idx_qr_tokens_payload_hash ON qr_tokens(payload_hash);

CREATE TABLE sync_queue (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    patient_id UUID REFERENCES patients(id),
    device_id VARCHAR(200) NOT NULL,
    target_record_id UUID,
    operation VARCHAR(20) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at_client TIMESTAMPTZ NOT NULL,
    received_at_server TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ
);
CREATE INDEX idx_sync_queue_status ON sync_queue(status, received_at_server);
CREATE INDEX idx_sync_queue_record ON sync_queue(target_record_id);

CREATE TABLE emergency_access_logs (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id),
    responder_id UUID NOT NULL REFERENCES users(id),
    reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_emergency_logs_patient ON emergency_access_logs(patient_id, created_at);
CREATE INDEX idx_emergency_logs_responder ON emergency_access_logs(responder_id, created_at);

CREATE TABLE government_verification_logs (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id),
    verifier_id UUID NOT NULL REFERENCES users(id),
    eligibility_result VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_gov_logs_patient ON government_verification_logs(patient_id, created_at);
CREATE INDEX idx_gov_logs_verifier ON government_verification_logs(verifier_id, created_at);

ALTER TABLE roles ADD CONSTRAINT ck_roles_name CHECK (name IN ('patient','doctor','emergency_responder','government_verifier','admin'));
ALTER TABLE medical_records ADD CONSTRAINT ck_medical_records_fhir_type CHECK (fhir_resource_type IN ('Patient','Observation','Condition','MedicationRequest'));
ALTER TABLE record_versions ADD CONSTRAINT ck_record_versions_fhir_type CHECK (fhir_resource_type IN ('Patient','Observation','Condition','MedicationRequest'));
ALTER TABLE consents ADD CONSTRAINT ck_consents_status CHECK (status IN ('PENDING','APPROVED','DENIED','EXPIRED','REVOKED'));
ALTER TABLE notifications ADD CONSTRAINT ck_notifications_type CHECK (type IN ('OTP','CONSENT_REQUEST','ALERT','EMERGENCY'));
ALTER TABLE notifications ADD CONSTRAINT ck_notifications_status CHECK (status IN ('UNREAD','READ'));
ALTER TABLE sync_queue ADD CONSTRAINT ck_sync_queue_operation CHECK (operation IN ('insert','update'));
ALTER TABLE sync_queue ADD CONSTRAINT ck_sync_queue_status CHECK (status IN ('RECEIVED','APPLIED','CONFLICT','REJECTED'));
