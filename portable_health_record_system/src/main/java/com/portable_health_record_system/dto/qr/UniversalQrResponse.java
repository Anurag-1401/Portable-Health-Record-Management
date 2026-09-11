package com.portable_health_record_system.dto.qr;

import java.time.Instant;
import java.util.UUID;

public record UniversalQrResponse(
        boolean valid,
        String type,
        UUID patientId,
        String healthId,
        UUID doctorId,
        String displayName,
        String specialization,
        UUID hospitalId,
        String hospitalName,
        Instant expiresAt
) {
}