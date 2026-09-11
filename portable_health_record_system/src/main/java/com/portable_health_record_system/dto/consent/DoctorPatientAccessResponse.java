package com.portable_health_record_system.dto.consent;

import java.time.Instant;
import java.util.UUID;

import com.portable_health_record_system.common.ConsentStatus;

public record DoctorPatientAccessResponse(
        UUID consentId,
        UUID patientId,
        String healthId,
        String patientName,
        String purpose,
        ConsentStatus status,
        Instant requestedAt,
        Instant respondedAt,
        Instant expiresAt
) {}
