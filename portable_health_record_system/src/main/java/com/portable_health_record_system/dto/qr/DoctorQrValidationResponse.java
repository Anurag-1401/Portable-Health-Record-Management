package com.portable_health_record_system.dto.qr;

import java.util.UUID;

public record DoctorQrValidationResponse(
        UUID doctorId,
        String displayName,
        String specialization,
        UUID hospitalId,
        String hospitalName
) {
}