package com.portable_health_record_system.dto.patient;

import java.util.UUID;

public record PatientSearchResponse(
        UUID patientId,
        String healthId,
        String displayName
) {
}
