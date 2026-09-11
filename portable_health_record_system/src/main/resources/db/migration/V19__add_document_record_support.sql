ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS record_id UUID;

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS file_size BIGINT NOT NULL DEFAULT 0;

ALTER TABLE documents
    ADD CONSTRAINT documents_record_id_fkey
    FOREIGN KEY (record_id)
    REFERENCES medical_records(id);

CREATE INDEX IF NOT EXISTS idx_documents_record
    ON documents(record_id);