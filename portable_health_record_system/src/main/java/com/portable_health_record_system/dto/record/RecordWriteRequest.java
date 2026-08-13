package com.portable_health_record_system.dto.record;

import com.portable_health_record_system.common.FhirResourceType;
import jakarta.validation.constraints.NotNull;

import java.util.Map;
import java.util.UUID;

public record RecordWriteRequest(
        UUID patientId,
        String healthId,
        @NotNull FhirResourceType fhirResourceType,
        @NotNull Map<String, Object> resourceData,
        Long expectedVersion
) {}
