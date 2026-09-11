ALTER TABLE qr_tokens
    ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS token_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS doctor_id UUID,
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

ALTER TABLE qr_tokens
    ALTER COLUMN patient_id DROP NOT NULL;

ALTER TABLE qr_tokens
    ADD CONSTRAINT qr_tokens_doctor_id_fkey
    FOREIGN KEY (doctor_id)
    REFERENCES doctors(id);

ALTER TABLE qr_tokens
    ADD CONSTRAINT qr_tokens_type_check
    CHECK (token_type IN ('PATIENT', 'DOCTOR'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_qr_tokens_token_hash
    ON qr_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_patient
    ON qr_tokens(patient_id);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_doctor
    ON qr_tokens(doctor_id);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_expires
    ON qr_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_revoked
    ON qr_tokens(revoked_at);