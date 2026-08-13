package com.portable_health_record_system.dto.consent;

import com.portable_health_record_system.common.ConsentStatus;

import java.time.Instant;
import java.util.UUID;

public record ConsentResponse(
        UUID consentId,
        UUID patientId,
        UUID doctorId,
        ConsentStatus status,
        String purpose,
        Instant requestedAt,
        Instant expiresAt
) {}
