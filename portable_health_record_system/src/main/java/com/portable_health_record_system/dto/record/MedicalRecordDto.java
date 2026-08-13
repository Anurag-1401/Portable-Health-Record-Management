package com.portable_health_record_system.dto.record;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.UUID;

public record MedicalRecordDto(
        UUID record_id,
        UUID patient_id,
        String fhir_resource_type,
        long version_number,
        @JsonProperty("resource_data") Object resource_data,
        @JsonProperty("previous_record_hash") String previous_record_hash,
        @JsonProperty("current_record_hash") String current_record_hash,
        @JsonProperty("created_at") Instant created_at,
        @JsonProperty("updated_at") Instant updated_at
) {}
